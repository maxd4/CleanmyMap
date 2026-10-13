import type {
  SpogomiImportFormat,
  SpogomiRosterColumn,
  SpogomiRosterColumnDiagnostic,
  SpogomiRosterColumnMapping,
  SpogomiRosterMappingConfidence,
  SpogomiRosterPreview,
  SpogomiRosterRow,
  SpogomiRosterRowError,
  SpogomiRosterSheetCandidate,
} from "./types";
import { normalizeValue, workbookRows } from "./preparation-import-workbook";
import { classifyCachanTicketDeletion, classifyCachanTicketStatus } from "./ticket-status";

export { assertArchiveSafe } from "./preparation-import-workbook";

export type SpogomiRosterPreviewOptions = {
  mapping?: SpogomiRosterColumnMapping;
  sheetName?: string;
  headerRow?: number;
  allowIncompatibleMapping?: boolean;
};

const MAX_SPOGOMI_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;
const MAX_COLUMNS = 64;
const MAX_HEADER_SCAN_ROWS = 60;
const MAX_NAME_LENGTH = 160;
const MAX_GROUP_LENGTH = 120;
const MAX_EXTERNAL_REFERENCE_LENGTH = 160;

type FieldRule = {
  field: SpogomiRosterColumn;
  requiredForTicket: boolean;
  exact: string[];
  synonyms: string[];
};

const FIELD_RULES: FieldRule[] = [
  { field: "ticketReference", requiredForTicket: true, exact: ["n billet", "numero billet", "ticket id", "ticket number", "place id", "place reference"], synonyms: ["reference billet", "identifiant billet", "ticket reference", "external ticket reference"] },
  { field: "orderReference", requiredForTicket: false, exact: ["n de commande", "numero commande", "order id", "order reference", "order group id"], synonyms: ["commande", "reference commande", "order number"] },
  { field: "orderAlternativeReference", requiredForTicket: false, exact: ["n de commande avance", "numero commande avance", "advanced order id", "advanced order reference"], synonyms: ["commande avancee", "reference commande avancee"] },
  { field: "ticketStatus", requiredForTicket: true, exact: ["statut du billet", "statut billet", "ticket status", "registration status"], synonyms: ["statut ticket", "status billet", "etat billet"] },
  { field: "ticketDeleted", requiredForTicket: false, exact: ["supprime", "deleted", "cancelled", "canceled"], synonyms: ["annule", "annulation", "suppression", "ticket deleted"] },
  { field: "name", requiredForTicket: false, exact: ["nom", "nom complet", "participant", "prenom nom", "full name", "person display name"], synonyms: ["display name"] },
  { field: "participantLastName", requiredForTicket: false, exact: ["nom participant", "participant last name", "last name", "nom declarant"], synonyms: ["nom du participant"] },
  { field: "participantFirstName", requiredForTicket: false, exact: ["prenom participant", "participant first name", "first name", "prenom declarant"], synonyms: ["prenom du participant"] },
  { field: "group", requiredForTicket: false, exact: ["equipe", "groupe", "amis", "team", "group"], synonyms: ["nom equipe", "nom groupe", "group preference", "team preference"] },
  { field: "sourceRowId", requiredForTicket: false, exact: ["id", "identifiant", "reference", "ref", "ligne source", "source row id"], synonyms: ["identifiant ligne", "source reference", "external id"] },
];

const MAPPING_KEYS = FIELD_RULES.map(({ field }) => field);

function normalizeHeader(value: string): string {
  return value
    .replace(/°/g, "o")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fingerprint(row: Pick<SpogomiRosterRow, "name" | "groupPreference" | "externalReference" | "sourceRowId">): string {
  let hash = 2166136261;
  const stableKey = row.externalReference ?? row.sourceRowId ?? `${row.name ?? ""}|${row.groupPreference ?? ""}`;
  for (const character of `${normalizeHeader(stableKey)}|${normalizeHeader(row.groupPreference ?? "")}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function decodeText(bytes: Uint8Array): { text: string; encoding: "utf-8" | "windows-1252" } {
  const hasUtf8Bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const payload = hasUtf8Bom ? bytes.slice(3) : bytes;
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(payload), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(payload), encoding: "windows-1252" };
  }
}

function countDelimiter(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted;
    else if (line[index] === delimiter && !quoted) count += 1;
  }
  return count;
}

function detectDelimiter(text: string, extension: SpogomiImportFormat): string {
  if (extension === "tsv") return "\t";
  const sample = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 5).join("\n");
  return Array.from([";", ",", "\t"] as const).sort((a: string, b: string) => countDelimiter(sample, b) - countDelimiter(sample, a))[0] ?? ";";
}

function parseDelimited(text: string, delimiter: string): { rows: string[][]; malformedRowNumbers: number[] } {
  const rows: string[][] = [];
  const malformedRowNumbers: number[] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let sourceRow = 1;
  let rowHasData = false;
  const pushRow = () => {
    if (row.some((cell) => cell.trim()) || rowHasData) rows.push([...row, field]);
    row = [];
    field = "";
    rowHasData = false;
    sourceRow += 1;
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
        rowHasData = true;
      }
    } else if (character === delimiter && !quoted) {
      row.push(field);
      field = "";
      rowHasData = true;
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      pushRow();
    } else {
      field += character;
      if (character.trim()) rowHasData = true;
    }
  }
  if (field || row.length || rowHasData) pushRow();
  if (quoted) malformedRowNumbers.push(sourceRow);
  return { rows, malformedRowNumbers };
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const saved = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (left[row - 1] === right[column - 1] ? 0 : 1));
      diagonal = saved;
    }
  }
  return previous[right.length];
}

function candidateForHeader(header: string, rule: FieldRule): { confidence: SpogomiRosterMappingConfidence; distance: number } | null {
  const normalized = normalizeHeader(header);
  if (rule.exact.includes(normalized)) return { confidence: "exact", distance: 0 };
  if (rule.synonyms.includes(normalized)) return { confidence: "high", distance: 0 };
  const distances = [...rule.exact, ...rule.synonyms].map((candidate) => levenshtein(normalized, candidate));
  const distance = Math.min(...distances);
  if (normalized && distance <= Math.max(2, Math.floor(normalized.length * 0.18))) return { confidence: "suggested", distance };
  return null;
}

function inferMapping(headers: string[]): { mapping: SpogomiRosterColumnMapping; diagnostics: SpogomiRosterColumnDiagnostic[]; ambiguousFields: SpogomiRosterColumn[] } {
  const mapping: SpogomiRosterColumnMapping = {};
  const diagnostics: SpogomiRosterColumnDiagnostic[] = [];
  const ambiguousFields: SpogomiRosterColumn[] = [];
  for (const rule of FIELD_RULES) {
    const candidates = headers.flatMap((header, index) => {
      const match = candidateForHeader(header, rule);
      return match ? [{ header, index, ...match }] : [];
    }).sort((left, right) => left.distance - right.distance || left.index - right.index);
    const exactOrHigh = candidates.filter((candidate) => candidate.confidence === "exact" || candidate.confidence === "high");
    const best = exactOrHigh.length ? exactOrHigh : candidates.filter((candidate) => candidate.confidence === "suggested");
    const ambiguous = best.length > 1 && best[0]?.distance === best[1]?.distance && best[0]?.confidence === best[1]?.confidence;
    const selected = !ambiguous && best[0] && best[0].confidence !== "suggested" ? best[0] : null;
    if (ambiguous) ambiguousFields.push(rule.field);
    if (selected) mapping[rule.field] = selected.header;
    diagnostics.push({
      field: rule.field,
      selectedHeader: selected?.header ?? null,
      confidence: ambiguous ? "ambiguous" : selected?.confidence ?? (best[0]?.confidence ?? "missing"),
      candidates: best.map((candidate) => candidate.header),
      required: rule.requiredForTicket,
      status: ambiguous ? "ambiguous" : selected ? "recognized" : "optional_absent",
    });
  }
  return { mapping, diagnostics, ambiguousFields };
}

function resolveExplicitMapping(headers: string[], mapping: SpogomiRosterColumnMapping, allowIncompatibleMapping = false): SpogomiRosterColumnMapping {
  const resolved: SpogomiRosterColumnMapping = {};
  const seenHeaders = new Set<string>();
  for (const key of MAPPING_KEYS) {
    const header = mapping[key];
    if (header === undefined) continue;
    if (!headers.includes(header)) {
      if (allowIncompatibleMapping) continue;
      throw new Error("Validation: la correspondance référence une colonne absente.");
    }
    if (seenHeaders.has(header)) throw new Error("Validation: une même colonne ne peut pas être utilisée deux fois.");
    seenHeaders.add(header);
    resolved[key] = header;
  }
  return resolved;
}

function canonicalMapping(mapping: SpogomiRosterColumnMapping): string {
  return JSON.stringify(MAPPING_KEYS.filter((key) => mapping[key] !== undefined).map((key) => [key, mapping[key]]));
}

async function deterministicImportKey(contentHash: string, mapping: SpogomiRosterColumnMapping): Promise<string> {
  const digest = await sha256Hex(new TextEncoder().encode(`spogomi-roster-v2:${contentHash}:${canonicalMapping(mapping)}`));
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

function headerScore(headers: string[]): { recognizedFieldCount: number; confidence: SpogomiRosterMappingConfidence } {
  const inferred = inferMapping(headers);
  const recognized = inferred.diagnostics.filter((diagnostic) => diagnostic.status === "recognized");
  const confidence = recognized.some((diagnostic) => diagnostic.confidence === "exact") ? "exact" : recognized.length ? "high" : "missing";
  return { recognizedFieldCount: recognized.length, confidence };
}

function selectHeader(rows: string[][], requestedHeaderRow?: number): { rowIndex: number; headers: string[] } | null {
  if (requestedHeaderRow !== undefined) {
    const row = rows[requestedHeaderRow - 1];
    if (!row) throw new Error("Validation: la ligne d’en-tête demandée est introuvable.");
    return { rowIndex: requestedHeaderRow - 1, headers: row.map(normalizeValue) };
  }
  const candidates = rows.slice(0, MAX_HEADER_SCAN_ROWS).map((row, index) => ({ index, row: row.map(normalizeValue), score: headerScore(row.map(normalizeValue)) })).filter(({ score }) => score.recognizedFieldCount > 0);
  const best = candidates.sort((left, right) => right.score.recognizedFieldCount - left.score.recognizedFieldCount || left.index - right.index)[0];
  return best ? { rowIndex: best.index, headers: best.row } : null;
}

function buildRows(rawRows: string[][], mapping: SpogomiRosterColumnMapping, malformedRowNumbers: number[], formulaRows: number[]) {
  const headers = rawRows[0] ?? [];
  const indexes = Object.fromEntries(Object.entries(mapping).map(([key, header]) => [key, headers.indexOf(header ?? "")])) as Partial<Record<SpogomiRosterColumn, number>>;
  const errors: SpogomiRosterRowError[] = malformedRowNumbers.map((rowNumber) => ({ rowNumber, code: "row_excluded", message: "Ligne ignorée : guillemet non fermé ou structure CSV incomplète." }));
  const rows: SpogomiRosterRow[] = [];
  const ignoredRowNumbers = [...malformedRowNumbers];
  const ticketImport = Boolean(mapping.ticketReference);
  for (const [offset, values] of rawRows.slice(1, MAX_ROWS + 1).entries()) {
    const rowNumber = offset + 2;
    if (formulaRows.includes(rowNumber)) {
      errors.push({ rowNumber, code: "formula_or_active_content", message: "Ligne exclue : formule ou lien actif détecté." });
      ignoredRowNumbers.push(rowNumber);
      continue;
    }
    if (values.length > MAX_COLUMNS) {
      errors.push({ rowNumber, code: "row_too_wide", message: "Trop de colonnes dans cette ligne." });
      ignoredRowNumbers.push(rowNumber);
      continue;
    }
    if (!values.some((value) => normalizeValue(value))) continue;
    if (values.some((value) => /^(?:=|\+|@|-?[A-Za-z_][A-Za-z0-9_.]*\()/i.test(normalizeValue(value)))) {
      errors.push({ rowNumber, code: "formula_or_active_content", message: "Ligne exclue : contenu textuel interprétable comme une formule ou un lien actif." });
      ignoredRowNumbers.push(rowNumber);
      continue;
    }
    const rawName = normalizeValue(indexes.name === undefined ? "" : values[indexes.name]);
    const name = rawName || null;
    const group = normalizeValue(indexes.group === undefined ? "" : values[indexes.group]);
    const sourceRowId = normalizeValue(indexes.sourceRowId === undefined ? "" : values[indexes.sourceRowId]);
    const externalReference = normalizeValue(indexes.ticketReference === undefined ? "" : values[indexes.ticketReference]);
    const orderReference = normalizeValue(indexes.orderReference === undefined ? "" : values[indexes.orderReference]);
    const orderAlternativeReference = normalizeValue(indexes.orderAlternativeReference === undefined ? "" : values[indexes.orderAlternativeReference]);
    const ticketStatus = normalizeValue(indexes.ticketStatus === undefined ? "" : values[indexes.ticketStatus]);
    const rawDeletedValue = normalizeValue(indexes.ticketDeleted === undefined ? "" : values[indexes.ticketDeleted]);
    const deletionClassification = ticketImport && indexes.ticketDeleted !== undefined
      ? classifyCachanTicketDeletion(rawDeletedValue)
      : "absent";
    const ticketDeleted = deletionClassification === "deleted"
      ? true
      : deletionClassification === "not_deleted"
        ? false
        : indexes.ticketDeleted === undefined
          ? false
          : null;
    if (ticketImport && externalReference.startsWith("__AMBIGUOUS_NUMERIC_ID__")) {
      errors.push({ rowNumber, code: "ambiguous_identifier", message: "Identifiant numérique ambigu : conservez le billet comme texte pour éviter un arrondi ou une notation scientifique." });
      ignoredRowNumbers.push(rowNumber);
      continue;
    }
    if (ticketImport && !externalReference) {
      errors.push({ rowNumber, code: "ticket_reference_required", message: "La référence N. Billet est obligatoire pour une ligne de billetterie ; aucun identifiant n’est inventé." });
      ignoredRowNumbers.push(rowNumber);
      continue;
    }
    if (!ticketImport && !name) {
      errors.push({ rowNumber, code: "name_required", message: "Le nom du participant est obligatoire pour une liste manuelle." });
      ignoredRowNumbers.push(rowNumber);
      continue;
    }
    if (ticketImport) {
      const statusClassification = classifyCachanTicketStatus(ticketStatus);
      if (statusClassification === "absent") errors.push({ rowNumber, code: "ticket_status_missing", message: "Statut du billet absent : la ligne doit être revue avant confirmation." });
      else if (statusClassification === "pending") errors.push({ rowNumber, code: "ticket_status_pending", message: `Statut du billet en attente (${ticketStatus}) : la ligne ne peut pas être confirmée comme place admissible.` });
      else if (statusClassification === "unknown") errors.push({ rowNumber, code: "ticket_status_unknown", message: `Statut du billet inconnu (${ticketStatus}) : la ligne doit être revue avant confirmation.` });
      if (deletionClassification === "absent" && indexes.ticketDeleted !== undefined) errors.push({ rowNumber, code: "ticket_deletion_missing", message: "La valeur Supprimé est absente : la ligne doit être revue avant confirmation." });
      else if (deletionClassification === "unknown") errors.push({ rowNumber, code: "ticket_deletion_unknown", message: `La valeur Supprimé est ambiguë (${rawDeletedValue}) : la ligne doit être revue avant confirmation.` });
    }
    if (name && name.length > MAX_NAME_LENGTH) {
      errors.push({ rowNumber, code: "name_too_long", message: "Le nom du participant est trop long." });
      continue;
    }
    if (sourceRowId.length > MAX_EXTERNAL_REFERENCE_LENGTH || externalReference.length > MAX_EXTERNAL_REFERENCE_LENGTH || orderReference.length > MAX_EXTERNAL_REFERENCE_LENGTH || orderAlternativeReference.length > MAX_EXTERNAL_REFERENCE_LENGTH) {
      errors.push({ rowNumber, code: "invalid_source_row_id", message: "La référence de ligne est trop longue." });
      continue;
    }
    const candidate: SpogomiRosterRow = {
      rowNumber,
      name,
      groupPreference: (orderReference || group) ? (orderReference || group).slice(0, MAX_GROUP_LENGTH) : null,
      sourceRowId: sourceRowId || externalReference || null,
      externalReference: externalReference || null,
      orderReference: orderReference || null,
      orderAlternativeReference: orderAlternativeReference || null,
      ticketStatus: ticketStatus || null,
      ticketDeleted,
      ticketDeletedRaw: indexes.ticketDeleted === undefined ? null : rawDeletedValue || null,
      sourceSystem: ticketImport ? "cachan_ticketing" : "manual_roster",
      sourceFingerprint: "",
    };
    candidate.sourceFingerprint = fingerprint(candidate);
    rows.push(candidate);
  }
  if (rawRows.length - 1 > MAX_ROWS) errors.push({ rowNumber: MAX_ROWS + 2, code: "row_excluded", message: `Les lignes au-delà de ${MAX_ROWS} sont exclues par la limite d’import.` });
  return { headers, rows, errors, ignoredRowNumbers };
}

function extensionOf(fileName: string): SpogomiImportFormat | null {
  const extension = fileName.toLocaleLowerCase().split(".").pop();
  return extension && ["csv", "tsv", "xlsx", "xls", "ods"].includes(extension) ? extension as SpogomiImportFormat : null;
}

function assertMime(file: File, format: SpogomiImportFormat): void {
  const type = file.type.toLocaleLowerCase();
  if (!type) return;
  const allowed = format === "csv" ? ["text/csv", "application/csv", "text/plain"] : format === "tsv" ? ["text/tab-separated-values", "text/plain"] : format === "xlsx" ? ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"] : format === "xls" ? ["application/vnd.ms-excel", "application/octet-stream"] : ["application/vnd.oasis.opendocument.spreadsheet", "application/zip"];
  if (!allowed.includes(type)) throw new Error("Type MIME incohérent avec l’extension du fichier.");
}

export async function parseRosterFile(file: File, options?: SpogomiRosterPreviewOptions | SpogomiRosterColumnMapping): Promise<SpogomiRosterPreview> {
  if (file.size > MAX_SPOGOMI_FILE_BYTES) throw new Error("Fichier trop volumineux (5 Mo maximum).");
  const fileName = file.name.trim() || "roster";
  const format = extensionOf(fileName);
  if (!format) throw new Error("Format refusé : utilisez CSV, TSV, XLSX, XLS ou ODS.");
  assertMime(file, format);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentHash = await sha256Hex(bytes);
  const normalizedOptions = options && ("mapping" in options || "sheetName" in options || "headerRow" in options || "allowIncompatibleMapping" in options) ? options as SpogomiRosterPreviewOptions : { mapping: options as SpogomiRosterColumnMapping | undefined };
  let sheets: Array<{ name: string; rows: string[][]; formulaRows: number[] }>;
  let encoding: "utf-8" | "windows-1252" | "binary";
  let malformedRowNumbers: number[] = [];
  if (format === "csv" || format === "tsv") {
    const decoded = decodeText(bytes);
    const parsed = parseDelimited(decoded.text, detectDelimiter(decoded.text, format));
    sheets = [{ name: "CSV", rows: parsed.rows, formulaRows: [] }];
    malformedRowNumbers = parsed.malformedRowNumbers;
    encoding = decoded.encoding;
  } else {
    const workbook = workbookRows(bytes, format);
    sheets = workbook.sheets;
    encoding = workbook.encoding;
  }
  if (!sheets.length) throw new Error("Le fichier ne contient aucune feuille exploitable.");
  const candidates: SpogomiRosterSheetCandidate[] = sheets.map((sheet, index) => {
    const selected = selectHeader(sheet.rows);
    const score = selected ? headerScore(selected.headers) : { recognizedFieldCount: 0, confidence: "missing" as const };
    return { index, name: sheet.name, headerRow: selected ? selected.rowIndex + 1 : null, recognizedFieldCount: score.recognizedFieldCount, confidence: score.confidence, rowCount: sheet.rows.length };
  });
  const selectedSheet = normalizedOptions.sheetName ? sheets.find((sheet) => sheet.name === normalizedOptions.sheetName) : sheets.find((_, index) => index === candidates.slice().sort((left, right) => right.recognizedFieldCount - left.recognizedFieldCount || left.index - right.index)[0]?.index);
  if (!selectedSheet) throw new Error("Validation: la feuille demandée est introuvable.");
  const selectedCandidate = candidates.find((candidate) => candidate.name === selectedSheet.name);
  const header = selectHeader(selectedSheet.rows, normalizedOptions.headerRow ?? selectedCandidate?.headerRow ?? undefined);
  if (!header) {
    return {
      format, fileName, contentHash, headers: [], unknownHeaders: [], mapping: {}, rows: [], errors: [{ rowNumber: 1, code: "header_not_found", message: "Aucune ligne d’en-tête reconnue." }], probableDuplicateRowNumbers: [], sourceSystem: "manual_roster", cancelledRowNumbers: [], encoding, sheetName: selectedSheet.name, headerRow: 0, sheetCandidates: candidates, columnDiagnostics: [], missingFields: [], ambiguousFields: [], rowsRead: 0, ignoredRowNumbers: [], requiresExplicitSelection: true, importKey: await deterministicImportKey(contentHash, {}),
    };
  }
  if (header.headers.length > MAX_COLUMNS) throw new Error("Le fichier contient trop de colonnes.");
  const headers = header.headers.map(normalizeValue);
  const inferred = inferMapping(headers);
  const resolvedMapping = normalizedOptions.mapping
    ? normalizedOptions.allowIncompatibleMapping
      ? { ...inferred.mapping, ...resolveExplicitMapping(headers, normalizedOptions.mapping, true) }
      : resolveExplicitMapping(headers, normalizedOptions.mapping)
    : inferred.mapping;
  const mappingDiagnostics = inferred.diagnostics.map((diagnostic) => {
    const explicit = normalizedOptions.mapping?.[diagnostic.field];
    return explicit && headers.includes(explicit) ? { ...diagnostic, selectedHeader: explicit, confidence: "exact" as const, candidates: [explicit], status: "recognized" as const } : diagnostic;
  });
  const ticketImport = Boolean(resolvedMapping.ticketReference);
  const missingFields = mappingDiagnostics.filter((diagnostic) => diagnostic.required && ticketImport && diagnostic.status === "optional_absent").map(({ field }) => field);
  const ambiguousFields = mappingDiagnostics.filter((diagnostic) => diagnostic.status === "ambiguous").map(({ field }) => field);
  const mappingErrors: SpogomiRosterRowError[] = [];
  if (ambiguousFields.length) mappingErrors.push({ rowNumber: header.rowIndex + 1, code: "ambiguous_mapping", message: `Correspondance ambiguë à confirmer : ${ambiguousFields.join(", ")}.` });
  if (ticketImport && missingFields.length) mappingErrors.push({ rowNumber: header.rowIndex + 1, code: "ambiguous_mapping", message: `Colonnes critiques absentes ou non reconnues : ${missingFields.join(", ")}.` });
  const dataRows = selectedSheet.rows.slice(header.rowIndex);
  const built = buildRows(dataRows, resolvedMapping, malformedRowNumbers.map((row) => row - header.rowIndex), selectedSheet.formulaRows.map((row) => row - header.rowIndex));
  const errors = [...mappingErrors, ...built.errors];
  const byFingerprint = new Map<string, number[]>();
  for (const row of built.rows) byFingerprint.set(row.sourceFingerprint, [...(byFingerprint.get(row.sourceFingerprint) ?? []), row.rowNumber]);
  const duplicateTicketRows = resolvedMapping.ticketReference ? [...new Map(built.rows.filter((row) => row.externalReference).map((row) => [row.externalReference as string, [] as number[]])).entries()]
    .map(([reference]) => [reference, built.rows.filter((row) => row.externalReference === reference).map((row) => row.rowNumber)] as const)
    .filter(([, rowNumbers]) => rowNumbers.length > 1) : [];
  for (const [, rowNumbers] of duplicateTicketRows) for (const rowNumber of rowNumbers) errors.push({ rowNumber, code: "ticket_reference_collision", message: "La même référence de billet apparaît plusieurs fois dans le fichier ; aucune place n’est fusionnée." });
  const sourceSystem = resolvedMapping.ticketReference ? "cachan_ticketing" : "manual_roster";
  const requiresExplicitSelection = Boolean(ambiguousFields.length || (candidates.filter((candidate) => candidate.recognizedFieldCount > 0).length > 1 && !normalizedOptions.sheetName)) || Boolean(mappingErrors.length);
  const content = { format, fileName, contentHash, headers, unknownHeaders: headers.filter((header) => !new Set(Object.values(resolvedMapping).filter(Boolean)).has(header)), mapping: resolvedMapping, rows: built.rows, errors, probableDuplicateRowNumbers: [...byFingerprint.values()].filter((group) => group.length > 1), sourceSystem, cancelledRowNumbers: built.rows.filter((row) => row.ticketDeleted || classifyCachanTicketStatus(row.ticketStatus) === "cancelled").map((row) => row.rowNumber), encoding, sheetName: selectedSheet.name, headerRow: header.rowIndex + 1, sheetCandidates: candidates, columnDiagnostics: mappingDiagnostics, missingFields, ambiguousFields, rowsRead: selectedSheet.rows.length - header.rowIndex - 1, ignoredRowNumbers: built.ignoredRowNumbers, requiresExplicitSelection, importKey: "" } satisfies Omit<SpogomiRosterPreview, "importKey"> & { importKey: string };
  return { ...content, importKey: await deterministicImportKey(contentHash, resolvedMapping) };
}
