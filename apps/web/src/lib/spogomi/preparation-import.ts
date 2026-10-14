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

type DelimitedState = {
  row: string[];
  field: string;
  quoted: boolean;
  rowHasData: boolean;
};

function consumeDelimitedCharacter(state: DelimitedState, character: string, nextCharacter: string | undefined, delimiter: string): "append" | "push" | "skip" {
  if (character === '"') {
    if (state.quoted && nextCharacter === '"') {
      state.field += '"';
      return "skip";
    }
    state.quoted = !state.quoted;
    state.rowHasData = true;
    return "append";
  }
  if (character === delimiter && !state.quoted) {
    state.row.push(state.field);
    state.field = "";
    state.rowHasData = true;
    return "append";
  }
  if ((character === "\n" || character === "\r") && !state.quoted) {
    return "push";
  }
  state.field += character;
  if (character.trim()) state.rowHasData = true;
  return "append";
}

function parseDelimited(text: string, delimiter: string): { rows: string[][]; malformedRowNumbers: number[] } {
  const rows: string[][] = [];
  const malformedRowNumbers: number[] = [];
  const state: DelimitedState = { row: [], field: "", quoted: false, rowHasData: false };
  let sourceRow = 1;
  const pushRow = () => {
    if (state.row.some((cell) => cell.trim()) || state.rowHasData) rows.push([...state.row, state.field]);
    state.row = [];
    state.field = "";
    state.rowHasData = false;
    sourceRow += 1;
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const action = consumeDelimitedCharacter(state, character, text[index + 1], delimiter);
    if (action === "skip") index += 1;
    if (action === "push") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      pushRow();
    }
  }
  if (state.field || state.row.length || state.rowHasData) pushRow();
  if (state.quoted) malformedRowNumbers.push(sourceRow);
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

type HeaderCandidate = { header: string; index: number; confidence: SpogomiRosterMappingConfidence; distance: number };

function candidatesForRule(headers: string[], rule: FieldRule): HeaderCandidate[] {
  return headers.flatMap((header, index) => {
    const match = candidateForHeader(header, rule);
    return match ? [{ header, index, ...match }] : [];
  }).sort((left, right) => left.distance - right.distance || left.index - right.index);
}

function bestCandidates(candidates: HeaderCandidate[]): HeaderCandidate[] {
  const exactOrHigh = candidates.filter((candidate) => candidate.confidence === "exact" || candidate.confidence === "high");
  return exactOrHigh.length ? exactOrHigh : candidates.filter((candidate) => candidate.confidence === "suggested");
}

function candidatesAreAmbiguous(candidates: HeaderCandidate[]): boolean {
  return candidates.length > 1 && candidates[0]?.distance === candidates[1]?.distance && candidates[0]?.confidence === candidates[1]?.confidence;
}

function recognizedCandidate(candidates: HeaderCandidate[]): HeaderCandidate | null {
  const candidate = candidates[0];
  return candidate && candidate.confidence !== "suggested" ? candidate : null;
}

function fieldDiagnostic(rule: FieldRule, candidates: HeaderCandidate[], selected: HeaderCandidate | null, ambiguous: boolean): SpogomiRosterColumnDiagnostic {
  return {
    field: rule.field,
    selectedHeader: selected?.header ?? null,
    confidence: ambiguous ? "ambiguous" : selected?.confidence ?? (candidates[0]?.confidence ?? "missing"),
    candidates: candidates.map((candidate) => candidate.header),
    required: rule.requiredForTicket,
    status: ambiguous ? "ambiguous" : selected ? "recognized" : "optional_absent",
  };
}

function inferField(rule: FieldRule, headers: string[]): { diagnostic: SpogomiRosterColumnDiagnostic; selectedHeader: string | null } {
  const best = bestCandidates(candidatesForRule(headers, rule));
  const ambiguous = candidatesAreAmbiguous(best);
  const selected = ambiguous ? null : recognizedCandidate(best);
  return {
    selectedHeader: selected?.header ?? null,
    diagnostic: fieldDiagnostic(rule, best, selected, ambiguous),
  };
}

function inferMapping(headers: string[]): { mapping: SpogomiRosterColumnMapping; diagnostics: SpogomiRosterColumnDiagnostic[]; ambiguousFields: SpogomiRosterColumn[] } {
  const mapping: SpogomiRosterColumnMapping = {};
  const diagnostics: SpogomiRosterColumnDiagnostic[] = [];
  const ambiguousFields: SpogomiRosterColumn[] = [];
  for (const rule of FIELD_RULES) {
    const inferred = inferField(rule, headers);
    if (inferred.diagnostic.status === "ambiguous") ambiguousFields.push(rule.field);
    if (inferred.selectedHeader) mapping[rule.field] = inferred.selectedHeader;
    diagnostics.push(inferred.diagnostic);
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

type RowIndexes = Partial<Record<SpogomiRosterColumn, number>>;
type RowBuildResult = { row: SpogomiRosterRow | null; errors: SpogomiRosterRowError[]; ignored: boolean };

function rowIndexes(headers: string[], mapping: SpogomiRosterColumnMapping): RowIndexes {
  return Object.fromEntries(Object.entries(mapping).map(([key, header]) => [key, headers.indexOf(header ?? "")])) as RowIndexes;
}

function rowError(rowNumber: number, code: SpogomiRosterRowError["code"], message: string): SpogomiRosterRowError {
  return { rowNumber, code, message };
}

function readRowValue(values: string[], indexes: RowIndexes, field: SpogomiRosterColumn): string {
  return normalizeValue(indexes[field] === undefined ? "" : values[indexes[field] as number]);
}

function rejectRow(rowNumber: number, code: SpogomiRosterRowError["code"], message: string): RowBuildResult {
  return { row: null, errors: [rowError(rowNumber, code, message)], ignored: true };
}

function rowHasActiveContent(values: string[]): boolean {
  return values.some((value) => /^(?:=|\+|@|-?[A-Za-z_][A-Za-z0-9_.]*\()/i.test(normalizeValue(value)));
}

function validateRowShape(rowNumber: number, values: string[], formulaRows: number[]): RowBuildResult | null {
  if (formulaRows.includes(rowNumber)) return rejectRow(rowNumber, "formula_or_active_content", "Ligne exclue : formule ou lien actif détecté.");
  if (values.length > MAX_COLUMNS) return rejectRow(rowNumber, "row_too_wide", "Trop de colonnes dans cette ligne.");
  if (!values.some((value) => normalizeValue(value))) return { row: null, errors: [], ignored: false };
  if (rowHasActiveContent(values)) return rejectRow(rowNumber, "formula_or_active_content", "Ligne exclue : contenu textuel interprétable comme une formule ou un lien actif.");
  return null;
}

type ParsedRowFields = {
  name: string | null;
  group: string;
  sourceRowId: string;
  externalReference: string;
  orderReference: string;
  orderAlternativeReference: string;
  ticketStatus: string;
  rawDeletedValue: string;
};

function readRowFields(values: string[], indexes: RowIndexes): ParsedRowFields {
  const rawName = readRowValue(values, indexes, "name");
  return {
    name: rawName || null,
    group: readRowValue(values, indexes, "group"),
    sourceRowId: readRowValue(values, indexes, "sourceRowId"),
    externalReference: readRowValue(values, indexes, "ticketReference"),
    orderReference: readRowValue(values, indexes, "orderReference"),
    orderAlternativeReference: readRowValue(values, indexes, "orderAlternativeReference"),
    ticketStatus: readRowValue(values, indexes, "ticketStatus"),
    rawDeletedValue: readRowValue(values, indexes, "ticketDeleted"),
  };
}

function ticketDeletionValue(rawDeletedValue: string, indexes: RowIndexes, ticketImport: boolean): { classification: ReturnType<typeof classifyCachanTicketDeletion>; value: boolean | null } {
  const classification = ticketImport && indexes.ticketDeleted !== undefined ? classifyCachanTicketDeletion(rawDeletedValue) : "absent";
  const value = classification === "deleted" ? true : classification === "not_deleted" ? false : indexes.ticketDeleted === undefined ? false : null;
  return { classification, value };
}

function validateRequiredRowFields(rowNumber: number, fields: ParsedRowFields, ticketImport: boolean): RowBuildResult | null {
  if (ticketImport && fields.externalReference.startsWith("__AMBIGUOUS_NUMERIC_ID__")) return rejectRow(rowNumber, "ambiguous_identifier", "Identifiant numérique ambigu : conservez le billet comme texte pour éviter un arrondi ou une notation scientifique.");
  if (ticketImport && !fields.externalReference) return rejectRow(rowNumber, "ticket_reference_required", "La référence N. Billet est obligatoire pour une ligne de billetterie ; aucun identifiant n’est inventé.");
  if (!ticketImport && !fields.name) return rejectRow(rowNumber, "name_required", "Le nom du participant est obligatoire pour une liste manuelle.");
  return null;
}

function ticketDiagnostics(rowNumber: number, fields: ParsedRowFields, deletionClassification: ReturnType<typeof classifyCachanTicketDeletion>, ticketImport: boolean, hasDeletionColumn: boolean): SpogomiRosterRowError[] {
  if (!ticketImport) return [];
  const errors: SpogomiRosterRowError[] = [];
  const statusClassification = classifyCachanTicketStatus(fields.ticketStatus);
  if (statusClassification === "absent") errors.push(rowError(rowNumber, "ticket_status_missing", "Statut du billet absent : la ligne doit être revue avant confirmation."));
  if (statusClassification === "pending") errors.push(rowError(rowNumber, "ticket_status_pending", `Statut du billet en attente (${fields.ticketStatus}) : la ligne ne peut pas être confirmée comme place admissible.`));
  if (statusClassification === "unknown") errors.push(rowError(rowNumber, "ticket_status_unknown", `Statut du billet inconnu (${fields.ticketStatus}) : la ligne doit être revue avant confirmation.`));
  if (deletionClassification === "absent" && hasDeletionColumn) errors.push(rowError(rowNumber, "ticket_deletion_missing", "La valeur Supprimé est absente : la ligne doit être revue avant confirmation."));
  if (deletionClassification === "unknown") errors.push(rowError(rowNumber, "ticket_deletion_unknown", `La valeur Supprimé est ambiguë (${fields.rawDeletedValue}) : la ligne doit être revue avant confirmation.`));
  return errors;
}

function validateRowLimits(fields: ParsedRowFields, errors: SpogomiRosterRowError[], rowNumber: number): RowBuildResult | null {
  if (fields.name && fields.name.length > MAX_NAME_LENGTH) return { row: null, errors: [...errors, rowError(rowNumber, "name_too_long", "Le nom du participant est trop long.")], ignored: false };
  if ([fields.sourceRowId, fields.externalReference, fields.orderReference, fields.orderAlternativeReference].some((value) => value.length > MAX_EXTERNAL_REFERENCE_LENGTH)) return { row: null, errors: [...errors, rowError(rowNumber, "invalid_source_row_id", "La référence de ligne est trop longue.")], ignored: false };
  return null;
}

function normalizedRosterRow(rowNumber: number, fields: ParsedRowFields, deletionValue: boolean | null, indexes: RowIndexes, ticketImport: boolean): SpogomiRosterRow {
  const row: SpogomiRosterRow = {
    rowNumber,
    name: fields.name,
    groupPreference: (fields.orderReference || fields.group) ? (fields.orderReference || fields.group).slice(0, MAX_GROUP_LENGTH) : null,
    sourceRowId: fields.sourceRowId || fields.externalReference || null,
    externalReference: fields.externalReference || null,
    orderReference: fields.orderReference || null,
    orderAlternativeReference: fields.orderAlternativeReference || null,
    ticketStatus: fields.ticketStatus || null,
    ticketDeleted: deletionValue,
    ticketDeletedRaw: indexes.ticketDeleted === undefined ? null : fields.rawDeletedValue || null,
    sourceSystem: ticketImport ? "cachan_ticketing" : "manual_roster",
    sourceFingerprint: "",
  };
  row.sourceFingerprint = fingerprint(row);
  return row;
}

function buildRosterRow(rowNumber: number, values: string[], indexes: RowIndexes, ticketImport: boolean): RowBuildResult {
  const fields = readRowFields(values, indexes);
  const deletion = ticketDeletionValue(fields.rawDeletedValue, indexes, ticketImport);
  const requiredFailure = validateRequiredRowFields(rowNumber, fields, ticketImport);
  if (requiredFailure) return requiredFailure;
  const errors = ticketDiagnostics(rowNumber, fields, deletion.classification, ticketImport, indexes.ticketDeleted !== undefined);
  const limitFailure = validateRowLimits(fields, errors, rowNumber);
  if (limitFailure) return limitFailure;
  return { row: normalizedRosterRow(rowNumber, fields, deletion.value, indexes, ticketImport), errors, ignored: false };
}

function buildRows(rawRows: string[][], mapping: SpogomiRosterColumnMapping, malformedRowNumbers: number[], formulaRows: number[]) {
  const headers = rawRows[0] ?? [];
  const indexes = rowIndexes(headers, mapping);
  const errors: SpogomiRosterRowError[] = malformedRowNumbers.map((rowNumber) => rowError(rowNumber, "row_excluded", "Ligne ignorée : guillemet non fermé ou structure CSV incomplète."));
  const rows: SpogomiRosterRow[] = [];
  const ignoredRowNumbers = [...malformedRowNumbers];
  const ticketImport = Boolean(mapping.ticketReference);
  for (const [offset, values] of rawRows.slice(1, MAX_ROWS + 1).entries()) {
    const rowNumber = offset + 2;
    const shape = validateRowShape(rowNumber, values, formulaRows);
    if (shape) {
      errors.push(...shape.errors);
      if (shape.ignored) ignoredRowNumbers.push(rowNumber);
      continue;
    }
    const built = buildRosterRow(rowNumber, values, indexes, ticketImport);
    errors.push(...built.errors);
    if (built.ignored) ignoredRowNumbers.push(rowNumber);
    if (built.row) rows.push(built.row);
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

type ImportSheet = { name: string; rows: string[][]; formulaRows: number[] };
type ImportReadResult = { sheets: ImportSheet[]; encoding: "utf-8" | "windows-1252" | "binary"; malformedRowNumbers: number[] };

function normalizePreviewOptions(options?: SpogomiRosterPreviewOptions | SpogomiRosterColumnMapping): SpogomiRosterPreviewOptions {
  if (options && ("mapping" in options || "sheetName" in options || "headerRow" in options || "allowIncompatibleMapping" in options)) return options as SpogomiRosterPreviewOptions;
  return { mapping: options as SpogomiRosterColumnMapping | undefined };
}

function readImportSheets(bytes: Uint8Array, format: SpogomiImportFormat): ImportReadResult {
  if (format === "csv" || format === "tsv") {
    const decoded = decodeText(bytes);
    const parsed = parseDelimited(decoded.text, detectDelimiter(decoded.text, format));
    return { sheets: [{ name: "CSV", rows: parsed.rows, formulaRows: [] }], encoding: decoded.encoding, malformedRowNumbers: parsed.malformedRowNumbers };
  }
  const workbook = workbookRows(bytes, format);
  return { sheets: workbook.sheets, encoding: workbook.encoding, malformedRowNumbers: [] };
}

function buildSheetCandidates(sheets: ImportSheet[]): SpogomiRosterSheetCandidate[] {
  return sheets.map((sheet, index) => {
    const selected = selectHeader(sheet.rows);
    const score = selected ? headerScore(selected.headers) : { recognizedFieldCount: 0, confidence: "missing" as const };
    return { index, name: sheet.name, headerRow: selected ? selected.rowIndex + 1 : null, recognizedFieldCount: score.recognizedFieldCount, confidence: score.confidence, rowCount: sheet.rows.length };
  });
}

function selectImportSheet(sheets: ImportSheet[], candidates: SpogomiRosterSheetCandidate[], options: SpogomiRosterPreviewOptions): ImportSheet | undefined {
  if (options.sheetName) return sheets.find((sheet) => sheet.name === options.sheetName);
  const best = candidates.slice().sort((left, right) => right.recognizedFieldCount - left.recognizedFieldCount || left.index - right.index)[0];
  return best ? sheets[best.index] : undefined;
}

function explicitMappingDiagnostics(inferred: ReturnType<typeof inferMapping>, headers: string[], mapping?: SpogomiRosterColumnMapping) {
  return inferred.diagnostics.map((diagnostic) => {
    const explicit = mapping?.[diagnostic.field];
    return explicit && headers.includes(explicit) ? { ...diagnostic, selectedHeader: explicit, confidence: "exact" as const, candidates: [explicit], status: "recognized" as const } : diagnostic;
  });
}

function mappingErrors(headerRow: number, diagnostics: SpogomiRosterColumnDiagnostic[], ticketImport: boolean): { errors: SpogomiRosterRowError[]; missingFields: SpogomiRosterColumn[]; ambiguousFields: SpogomiRosterColumn[] } {
  const missingFields = diagnostics.filter((diagnostic) => diagnostic.required && ticketImport && diagnostic.status === "optional_absent").map(({ field }) => field);
  const ambiguousFields = diagnostics.filter((diagnostic) => diagnostic.status === "ambiguous").map(({ field }) => field);
  const errors: SpogomiRosterRowError[] = [];
  if (ambiguousFields.length) errors.push(rowError(headerRow, "ambiguous_mapping", `Correspondance ambiguë à confirmer : ${ambiguousFields.join(", ")}.`));
  if (ticketImport && missingFields.length) errors.push(rowError(headerRow, "ambiguous_mapping", `Colonnes critiques absentes ou non reconnues : ${missingFields.join(", ")}.`));
  return { errors, missingFields, ambiguousFields };
}

function duplicateTicketErrors(rows: SpogomiRosterRow[], ticketReferenceMapped: boolean): SpogomiRosterRowError[] {
  if (!ticketReferenceMapped) return [];
  const rowNumbersByReference = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.externalReference) continue;
    rowNumbersByReference.set(row.externalReference, [...(rowNumbersByReference.get(row.externalReference) ?? []), row.rowNumber]);
  }
  return [...rowNumbersByReference.values()].filter((rowNumbers) => rowNumbers.length > 1).flatMap((rowNumbers) => rowNumbers.map((rowNumber) => rowError(rowNumber, "ticket_reference_collision", "La même référence de billet apparaît plusieurs fois dans le fichier ; aucune place n’est fusionnée.")));
}

function previewWithoutHeader(format: SpogomiImportFormat, fileName: string, contentHash: string, encoding: "utf-8" | "windows-1252" | "binary", sheetName: string, candidates: SpogomiRosterSheetCandidate[]): SpogomiRosterPreview {
  return {
    format, fileName, contentHash, headers: [], unknownHeaders: [], mapping: {}, rows: [], errors: [rowError(1, "header_not_found", "Aucune ligne d’en-tête reconnue.")], probableDuplicateRowNumbers: [], sourceSystem: "manual_roster", cancelledRowNumbers: [], encoding, sheetName, headerRow: 0, sheetCandidates: candidates, columnDiagnostics: [], missingFields: [], ambiguousFields: [], rowsRead: 0, ignoredRowNumbers: [], requiresExplicitSelection: true, importKey: "",
  };
}

function buildPreviewContent(params: {
  format: SpogomiImportFormat;
  fileName: string;
  contentHash: string;
  headers: string[];
  mapping: SpogomiRosterColumnMapping;
  rows: SpogomiRosterRow[];
  errors: SpogomiRosterRowError[];
  sourceSystem: "manual_roster" | "cachan_ticketing";
  encoding: "utf-8" | "windows-1252" | "binary";
  sheetName: string;
  headerRow: number;
  sheetCandidates: SpogomiRosterSheetCandidate[];
  columnDiagnostics: SpogomiRosterColumnDiagnostic[];
  missingFields: SpogomiRosterColumn[];
  ambiguousFields: SpogomiRosterColumn[];
  rowsRead: number;
  ignoredRowNumbers: number[];
  explicitSheetSelection: boolean;
}): Omit<SpogomiRosterPreview, "importKey"> & { importKey: string } {
  const { headers, mapping, rows, errors, sourceSystem, ambiguousFields, sheetCandidates, sheetName, headerRow, explicitSheetSelection, ...content } = params;
  const mappedHeaders = new Set(Object.values(mapping).filter(Boolean));
  const byFingerprint = new Map<string, number[]>();
  for (const row of rows) byFingerprint.set(row.sourceFingerprint, [...(byFingerprint.get(row.sourceFingerprint) ?? []), row.rowNumber]);
  return {
    ...content,
    headers,
    mapping,
    rows,
    errors,
    sourceSystem,
    unknownHeaders: headers.filter((header) => !mappedHeaders.has(header)),
    probableDuplicateRowNumbers: [...byFingerprint.values()].filter((group) => group.length > 1),
    cancelledRowNumbers: rows.filter((row) => row.ticketDeleted || classifyCachanTicketStatus(row.ticketStatus) === "cancelled").map((row) => row.rowNumber),
    sheetName,
    headerRow,
    sheetCandidates,
    columnDiagnostics: params.columnDiagnostics,
    missingFields: params.missingFields,
    ambiguousFields,
    requiresExplicitSelection: Boolean(ambiguousFields.length || (sheetCandidates.filter((candidate) => candidate.recognizedFieldCount > 0).length > 1 && !explicitSheetSelection)) || Boolean(errors.some((error) => error.code === "ambiguous_mapping")),
    importKey: "",
  };
}

export async function parseRosterFile(file: File, options?: SpogomiRosterPreviewOptions | SpogomiRosterColumnMapping): Promise<SpogomiRosterPreview> {
  if (file.size > MAX_SPOGOMI_FILE_BYTES) throw new Error("Fichier trop volumineux (5 Mo maximum).");
  const fileName = file.name.trim() || "roster";
  const format = extensionOf(fileName);
  if (!format) throw new Error("Format refusé : utilisez CSV, TSV, XLSX, XLS ou ODS.");
  assertMime(file, format);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentHash = await sha256Hex(bytes);
  const normalizedOptions = normalizePreviewOptions(options);
  const { sheets, encoding, malformedRowNumbers } = readImportSheets(bytes, format);
  if (!sheets.length) throw new Error("Le fichier ne contient aucune feuille exploitable.");
  const candidates = buildSheetCandidates(sheets);
  const selectedSheet = selectImportSheet(sheets, candidates, normalizedOptions);
  if (!selectedSheet) throw new Error("Validation: la feuille demandée est introuvable.");
  const selectedCandidate = candidates.find((candidate) => candidate.name === selectedSheet.name);
  const header = selectHeader(selectedSheet.rows, normalizedOptions.headerRow ?? selectedCandidate?.headerRow ?? undefined);
  if (!header) return { ...previewWithoutHeader(format, fileName, contentHash, encoding, selectedSheet.name, candidates), importKey: await deterministicImportKey(contentHash, {}) };
  if (header.headers.length > MAX_COLUMNS) throw new Error("Le fichier contient trop de colonnes.");
  const headers = header.headers.map(normalizeValue);
  const inferred = inferMapping(headers);
  const resolvedMapping = normalizedOptions.mapping
    ? normalizedOptions.allowIncompatibleMapping
      ? { ...inferred.mapping, ...resolveExplicitMapping(headers, normalizedOptions.mapping, true) }
      : resolveExplicitMapping(headers, normalizedOptions.mapping)
    : inferred.mapping;
  const mappingDiagnostics = explicitMappingDiagnostics(inferred, headers, normalizedOptions.mapping);
  const ticketImport = Boolean(resolvedMapping.ticketReference);
  const mapping = mappingErrors(header.rowIndex + 1, mappingDiagnostics, ticketImport);
  const dataRows = selectedSheet.rows.slice(header.rowIndex);
  const built = buildRows(dataRows, resolvedMapping, malformedRowNumbers.map((row) => row - header.rowIndex), selectedSheet.formulaRows.map((row) => row - header.rowIndex));
  const errors = [...mapping.errors, ...built.errors, ...duplicateTicketErrors(built.rows, Boolean(resolvedMapping.ticketReference))];
  const sourceSystem = resolvedMapping.ticketReference ? "cachan_ticketing" : "manual_roster";
  const content = buildPreviewContent({ format, fileName, contentHash, headers, mapping: resolvedMapping, rows: built.rows, errors, sourceSystem, encoding, sheetName: selectedSheet.name, headerRow: header.rowIndex + 1, sheetCandidates: candidates, columnDiagnostics: mappingDiagnostics, missingFields: mapping.missingFields, ambiguousFields: mapping.ambiguousFields, rowsRead: selectedSheet.rows.length - header.rowIndex - 1, ignoredRowNumbers: built.ignoredRowNumbers, explicitSheetSelection: Boolean(normalizedOptions.sheetName) });
  return { ...content, importKey: await deterministicImportKey(contentHash, resolvedMapping) };
}
