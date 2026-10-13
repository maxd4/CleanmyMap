import * as XLSX from "xlsx";
import { strFromU8, unzipSync } from "fflate";
import type { SpogomiImportFormat } from "./types";

const MAX_ROWS = 10_000;
const MAX_HEADER_SCAN_ROWS = 60;
const MAX_EXPANDED_ARCHIVE_BYTES = 25 * 1024 * 1024;

export function normalizeValue(value: unknown): string {
  return String(value ?? "").replace(/\u0000/g, "").trim().replace(/\s+/g, " ");
}

function readLittleEndian16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readLittleEndian32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function assertArchiveMetadataSafe(bytes: Uint8Array): void {
  const minimumEndOfCentralDirectoryLength = 22;
  const maximumCommentLength = 0xffff;
  const searchStart = Math.max(0, bytes.length - minimumEndOfCentralDirectoryLength - maximumCommentLength);
  let endOfCentralDirectory = -1;
  for (let offset = bytes.length - minimumEndOfCentralDirectoryLength; offset >= searchStart; offset -= 1) {
    if (readLittleEndian32(bytes, offset) === 0x06054b50) {
      endOfCentralDirectory = offset;
      break;
    }
  }
  if (endOfCentralDirectory < 0) throw new Error("Classeur invalide ou archive corrompue.");
  const entryCount = readLittleEndian16(bytes, endOfCentralDirectory + 10);
  const centralDirectorySize = readLittleEndian32(bytes, endOfCentralDirectory + 12);
  const centralDirectoryOffset = readLittleEndian32(bytes, endOfCentralDirectory + 16);
  if (entryCount > 100 || centralDirectorySize > bytes.length || centralDirectoryOffset > bytes.length || centralDirectoryOffset + centralDirectorySize > bytes.length) {
    throw new Error("Classeur refusé : archive trop volumineuse ou structure ZIP non supportée.");
  }
  let cursor = centralDirectoryOffset;
  let expandedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > bytes.length || readLittleEndian32(bytes, cursor) !== 0x02014b50) throw new Error("Classeur invalide ou archive corrompue.");
    const compressedSize = readLittleEndian32(bytes, cursor + 20);
    const uncompressedSize = readLittleEndian32(bytes, cursor + 24);
    const nameLength = readLittleEndian16(bytes, cursor + 28);
    const extraLength = readLittleEndian16(bytes, cursor + 30);
    const commentLength = readLittleEndian16(bytes, cursor + 32);
    if (uncompressedSize > MAX_EXPANDED_ARCHIVE_BYTES || compressedSize > bytes.length) throw new Error("Classeur refusé : archive trop volumineuse après décompression.");
    expandedBytes += uncompressedSize;
    if (expandedBytes > MAX_EXPANDED_ARCHIVE_BYTES) throw new Error("Classeur refusé : archive trop volumineuse après décompression.");
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor > centralDirectoryOffset + centralDirectorySize) throw new Error("Classeur invalide ou archive corrompue.");
}

export function assertArchiveSafe(bytes: Uint8Array): void {
  assertArchiveMetadataSafe(bytes);
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("Classeur invalide ou archive corrompue.");
  }
  const entries = Object.entries(files);
  const expandedBytes = entries.reduce((total, [, value]) => total + value.byteLength, 0);
  if (entries.length > 100 || expandedBytes > MAX_EXPANDED_ARCHIVE_BYTES) throw new Error("Classeur refusé : archive trop volumineuse après décompression.");
  if (entries.some(([name, value]) => /vbaProject\.bin|\b(activeX|embeddings|macros)\b/i.test(name) || strFromU8(value).includes("<!DOCTYPE"))) {
    throw new Error("Classeur refusé : macros, contenu actif ou déclaration XML interdite.");
  }
}

function assertBinaryWorkbookSafe(bytes: Uint8Array): void {
  const markerText = new TextDecoder("windows-1252").decode(bytes);
  if (/vba[_\s-]?project|visual basic|activex|macro module/i.test(markerText)) throw new Error("Classeur refusé : macros ou contenu actif détecté.");
}

function sheetRows(sheet: XLSX.WorkSheet): string[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "", blankrows: true })
    .map((row) => (Array.isArray(row) ? row.map(normalizeValue) : []));
}

function isAmbiguousNumericCell(cell: XLSX.CellObject): boolean {
  if (cell.t !== "n" || typeof cell.v !== "number") return false;
  return !Number.isSafeInteger(cell.v) || /e[+-]?\d+/i.test(String(cell.w ?? cell.v));
}

function inspectCell(address: string, cell: unknown, rows: string[][], formulaRows: Set<number>): void {
  if (address.startsWith("!") || !cell || typeof cell !== "object") return;
  const typed = cell as XLSX.CellObject;
  if (typed.f || typed.l) formulaRows.add(Number(address.match(/\d+$/)?.[0] ?? 0));
  if (!isAmbiguousNumericCell(typed)) return;
  const rowNumber = Number(address.match(/\d+$/)?.[0] ?? 0);
  if (rowNumber <= 0 || !rows[rowNumber - 1]) return;
  const column = XLSX.utils.decode_col(address.replace(/\d+$/, ""));
  rows[rowNumber - 1][column] = `__AMBIGUOUS_NUMERIC_ID__${String(typed.w ?? typed.v)}`;
}

function inspectSheetCells(sheet: XLSX.WorkSheet, rows: string[][]): number[] {
  const formulaRows = new Set<number>();
  for (const [address, cell] of Object.entries(sheet)) {
    inspectCell(address, cell, rows, formulaRows);
  }
  return [...formulaRows];
}

function workbookSheet(sheet: XLSX.WorkSheet): { rows: string[][]; formulaRows: number[] } {
  const rows = sheetRows(sheet);
  const formulaRows = inspectSheetCells(sheet, rows);
  if (formulaRows.length) throw new Error("Classeur refusé : les formules ou liens actifs doivent être supprimés avant l’import.");
  return { rows, formulaRows };
}

export function workbookRows(bytes: Uint8Array, format: SpogomiImportFormat): { sheets: Array<{ name: string; rows: string[][]; formulaRows: number[] }>; encoding: "binary" } {
  if (format !== "xls") assertArchiveSafe(bytes);
  assertBinaryWorkbookSafe(bytes);
  const workbook = XLSX.read(bytes, { type: "array", dense: false, cellText: true, cellNF: true, cellDates: false, bookVBA: false, sheetRows: MAX_ROWS + MAX_HEADER_SCAN_ROWS + 2, WTF: true });
  const sheets = workbook.SheetNames.map((name) => ({ ...workbookSheet(workbook.Sheets[name]), name }));
  return { sheets, encoding: "binary" };
}
