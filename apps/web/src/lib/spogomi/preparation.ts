import { strFromU8, unzipSync } from "fflate";
import type {
  SpogomiRosterColumn,
  SpogomiRosterColumnMapping,
  SpogomiRosterPreview,
  SpogomiRosterRow,
  SpogomiRosterRowError,
  SpogomiTeamFormation,
} from "./types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;
const MAX_COLUMNS = 64;
const MAX_NAME_LENGTH = 160;
const MAX_GROUP_LENGTH = 120;

function normalizeHeader(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeValue(value: unknown): string {
  return String(value ?? "").replace(/\u0000/g, "").trim().replace(/\s+/g, " ");
}

function fingerprint(row: Pick<SpogomiRosterRow, "name" | "groupPreference">): string {
  let hash = 2166136261;
  for (const character of `${normalizeHeader(row.name)}|${normalizeHeader(row.groupPreference ?? "")}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const delimiter = (text.split("\n", 1)[0].match(/;/g)?.length ?? 0) > (text.split("\n", 1)[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  if (quoted) throw new Error("CSV invalide : guillemet non fermé.");
  return rows;
}

function xmlText(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))].map((match) =>
    match[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
  );
}

function parseXlsx(bytes: Uint8Array): string[][] {
  const files = unzipSync(bytes);
  const entries = Object.entries(files);
  const expandedBytes = entries.reduce((total, [, value]) => total + value.byteLength, 0);
  if (entries.length > 100 || expandedBytes > 25 * 1024 * 1024) throw new Error("XLSX refusé : archive trop volumineuse.");
  if (entries.some(([, value]) => strFromU8(value).includes("<!DOCTYPE"))) throw new Error("XLSX refusé : déclaration XML interdite.");
  const workbook = strFromU8(files["xl/workbook.xml"] ?? new Uint8Array());
  const relations = strFromU8(files["xl/_rels/workbook.xml.rels"] ?? new Uint8Array());
  const firstSheet = workbook.match(/<sheet\b[^>]*r:id="([^"]+)"/i)?.[1];
  const target = firstSheet
    ? relations.match(new RegExp(`<Relationship[^>]*Id="${firstSheet}"[^>]*Target="([^"]+)"`, "i"))?.[1]
    : null;
  const sheetPath = target ? `xl/${target.replace(/^\//, "").replace(/^xl\//, "")}` : "xl/worksheets/sheet1.xml";
  const sheet = strFromU8(files[sheetPath] ?? new Uint8Array());
  if (!sheet) throw new Error("XLSX invalide : première feuille introuvable.");
  const shared = xmlText(strFromU8(files["xl/sharedStrings.xml"] ?? new Uint8Array()), "t");
  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)) {
    const values: string[] = [];
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
      const attributes = cell[1];
      const body = cell[2];
      const reference = attributes.match(/\br="([A-Z]+)\d+"/i)?.[1] ?? "A";
      const column = [...reference].reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
      const type = attributes.match(/\bt="([^"]+)"/i)?.[1];
      const raw = xmlText(body, "v")[0] ?? xmlText(body, "t").join("");
      const value = type === "s" ? shared[Number(raw)] ?? "" : raw;
      values[column] = value;
    }
    rows.push(values.map((value) => value ?? ""));
  }
  return rows;
}

function inferMapping(headers: string[]): SpogomiRosterColumnMapping {
  const mapping: SpogomiRosterColumnMapping = {};
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (!mapping.name && /^(nom|nom complet|participant|prenom nom|full name)$/.test(normalized)) mapping.name = header;
    else if (!mapping.group && /(equipe|groupe|amis|team|group)/.test(normalized)) mapping.group = header;
    else if (!mapping.sourceRowId && /(id|identifiant|reference|ref|ligne source)/.test(normalized)) mapping.sourceRowId = header;
  }
  return mapping;
}

function buildRows(rawRows: string[][], mapping: SpogomiRosterColumnMapping) {
  const headers = rawRows[0] ?? [];
  const indexes = Object.fromEntries(Object.entries(mapping).map(([key, header]) => [key, headers.indexOf(header ?? "")])) as Partial<Record<SpogomiRosterColumn, number>>;
  const errors: SpogomiRosterRowError[] = [];
  const rows: SpogomiRosterRow[] = [];
  for (const [offset, values] of rawRows.slice(1, MAX_ROWS + 1).entries()) {
    const rowNumber = offset + 2;
    if (values.length > MAX_COLUMNS) {
      errors.push({ rowNumber, code: "row_too_wide", message: "Trop de colonnes dans cette ligne." });
      continue;
    }
    const name = normalizeValue(indexes.name === undefined ? "" : values[indexes.name]);
    const group = normalizeValue(indexes.group === undefined ? "" : values[indexes.group]);
    const sourceRowId = normalizeValue(indexes.sourceRowId === undefined ? "" : values[indexes.sourceRowId]);
    if (!name) {
      errors.push({ rowNumber, code: "name_required", message: "Le nom du participant est obligatoire." });
      continue;
    }
    if (name.length > MAX_NAME_LENGTH) {
      errors.push({ rowNumber, code: "name_too_long", message: "Le nom du participant est trop long." });
      continue;
    }
    if (sourceRowId.length > 160) {
      errors.push({ rowNumber, code: "invalid_source_row_id", message: "La référence de ligne est trop longue." });
      continue;
    }
    const candidate = { rowNumber, name, groupPreference: group ? group.slice(0, MAX_GROUP_LENGTH) : null, sourceRowId: sourceRowId || null, sourceFingerprint: "" };
    candidate.sourceFingerprint = fingerprint(candidate);
    rows.push(candidate);
  }
  return { headers, rows, errors };
}

export async function previewRosterFile(file: File, mapping?: SpogomiRosterColumnMapping): Promise<SpogomiRosterPreview> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Fichier trop volumineux (5 Mo maximum).");
  const fileName = file.name.trim() || "roster";
  const extension = fileName.toLocaleLowerCase().endsWith(".xlsx") ? "xlsx" : fileName.toLocaleLowerCase().endsWith(".csv") ? "csv" : null;
  if (!extension) throw new Error("Format refusé : utilisez un fichier CSV ou XLSX.");
  const allowedMimeTypes = extension === "csv"
    ? new Set(["", "text/csv", "application/csv", "text/plain"])
    : new Set(["", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"]);
  if (!allowedMimeTypes.has(file.type.toLocaleLowerCase())) throw new Error("Type MIME incohérent avec l'extension du fichier.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const rawRows = extension === "csv" ? parseCsv(new TextDecoder().decode(bytes).replace(/^\uFEFF/, "")) : parseXlsx(bytes);
  if (!rawRows.length || !rawRows[0]?.length) throw new Error("Le fichier ne contient pas d'en-tête exploitable.");
  if (rawRows[0].length > MAX_COLUMNS) throw new Error("Le fichier contient trop de colonnes.");
  const headers = rawRows[0].map(normalizeValue);
  const resolvedMapping = mapping ?? inferMapping(headers);
  const { rows, errors } = buildRows([headers, ...rawRows.slice(1)], resolvedMapping);
  const mappedHeaders = new Set(Object.values(resolvedMapping).filter(Boolean));
  const unknownHeaders = headers.filter((header) => !mappedHeaders.has(header));
  const byFingerprint = new Map<string, number[]>();
  for (const row of rows) byFingerprint.set(row.sourceFingerprint, [...(byFingerprint.get(row.sourceFingerprint) ?? []), row.rowNumber]);
  return {
    format: extension,
    fileName,
    contentHash: await sha256Hex(bytes),
    headers,
    unknownHeaders,
    mapping: resolvedMapping,
    rows,
    errors,
    probableDuplicateRowNumbers: [...byFingerprint.values()].filter((group) => group.length > 1),
    importKey: crypto.randomUUID(),
  };
}

export function buildDeterministicTeamFormation(input: {
  participants: Array<{ id: string; sourceOrder: number; groupPreference: string | null }>;
  mode: "casual" | "world_cup";
  casualTeamSize: number | null;
}): SpogomiTeamFormation {
  const target = input.mode === "world_cup" ? 3 : input.casualTeamSize;
  if (!target || target < 1) {
    return { teams: [], unassignedParticipantIds: input.participants.map(({ id }) => id), reasons: Object.fromEntries(input.participants.map(({ id }) => [id, "team_size_required"])) };
  }
  const sorted = [...input.participants].sort((a, b) => a.sourceOrder - b.sourceOrder || a.id.localeCompare(b.id));
  const groups = new Map<string, typeof sorted>();
  const ungrouped: typeof sorted = [];
  for (const participant of sorted) {
    const key = participant.groupPreference?.trim().toLocaleLowerCase("fr-FR");
    if (key) groups.set(key, [...(groups.get(key) ?? []), participant]);
    else ungrouped.push(participant);
  }
  const chunks: typeof sorted[] = [];
  const unassigned: string[] = [];
  const reasons: SpogomiTeamFormation["reasons"] = {};
  for (const group of groups.values()) {
    if (group.length > target) {
      group.forEach(({ id }) => { unassigned.push(id); reasons[id] = "group_exceeds_team_size"; });
    } else if (group.length === target) chunks.push(group);
    else chunks.push(group);
  }
  chunks.push(...ungrouped.map((participant) => [participant]));
  const teams: SpogomiTeamFormation["teams"] = [];
  let pending: typeof sorted = [];
  for (const chunk of chunks) {
    if (pending.length + chunk.length <= target) pending = [...pending, ...chunk];
    else {
      if (pending.length === target) teams.push({ draftKey: `team-${teams.length + 1}`, teamNumber: teams.length + 1, participantIds: pending.map(({ id }) => id), compositionState: "draft" });
      else pending.forEach(({ id }) => { unassigned.push(id); reasons[id] = "incomplete_team"; });
      pending = chunk;
    }
  }
  if (pending.length === target) teams.push({ draftKey: `team-${teams.length + 1}`, teamNumber: teams.length + 1, participantIds: pending.map(({ id }) => id), compositionState: "draft" });
  else pending.forEach(({ id }) => { unassigned.push(id); reasons[id] = "incomplete_team"; });
  return { teams, unassignedParticipantIds: unassigned, reasons };
}
