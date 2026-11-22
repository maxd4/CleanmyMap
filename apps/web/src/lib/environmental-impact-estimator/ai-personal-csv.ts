import type { PersonalAiDeclarationDraft } from "./personal-ai-usage-normalization";
import {
  PERSONAL_AI_IMPORT_LIMITS,
  normalizePersonalAiImportRow,
  type PersonalAiImportMetadata,
  type PersonalAiImportRow,
} from "./ai-personal-import";

export type PersonalAiCsvMapping = {
  delimiter: "," | ";";
  unit: "tokens";
  sourceVersion: string;
  startUtcColumn?: string;
  endUtcColumn?: string;
  inputColumn?: string;
  outputColumn?: string;
  cacheReadColumn?: string;
  cacheWriteColumn?: string;
  modelColumn?: string;
  costColumn?: string;
  currencyColumn?: string;
};

function csvCells(text: string, delimiter: string): string[][] {
  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') {
      if (cell !== "") throw new Error("CSV: guillemet hors champ");
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell); cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.trim() !== "")) table.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("CSV: guillemet non fermé");
  if (cell !== "" || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value.trim() !== "")) table.push(row);
  }
  return table;
}

export function readPersonalAiCsvHeaders(text: string, delimiter: "," | ";"): readonly string[] {
  if (new TextEncoder().encode(text).byteLength > PERSONAL_AI_IMPORT_LIMITS.csvBytes) throw new Error("CSV trop volumineux");
  const rows = csvCells(text.replace(/^\uFEFF/, ""), delimiter);
  if (rows.length === 0 || rows[0].length === 0 || rows[0].some((header) => !header.trim())) throw new Error("CSV: en-tête invalide");
  return rows[0];
}

function optionalCount(value: string, field: string): number | null {
  if (value.trim() === "") return null;
  if (!/^\d+$/.test(value)) throw new Error(`CSV ${field}: entier de tokens non négatif requis`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`CSV ${field}: entier supérieur à la précision sûre`);
  return parsed;
}

function optionalCost(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+(?:[.,]\d{1,6})?$/.test(value)) throw new Error("CSV coût: montant décimal non négatif requis");
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) throw new Error("CSV coût invalide");
  return parsed;
}

function validUtc(value: string): string {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)) throw new Error("CSV période: date UTC ISO requise");
  const time = Date.parse(value);
  const fraction = value.match(/\.(\d{1,3})Z$/)?.[1];
  const normalized = fraction ? value.replace(/\.\d{1,3}Z$/, `.${fraction.padEnd(3, "0")}Z`) : value.replace(/Z$/, ".000Z");
  if (!Number.isFinite(time) || new Date(time).toISOString() !== normalized) throw new Error("CSV période UTC invalide");
  return new Date(time).toISOString();
}

export async function parseExplicitlyMappedPersonalAiCsv(text: string, mapping: PersonalAiCsvMapping): Promise<{ rows: readonly PersonalAiImportRow[]; rejectedCount: number; warnings: readonly string[] }> {
  if (new TextEncoder().encode(text).byteLength > PERSONAL_AI_IMPORT_LIMITS.csvBytes) throw new Error("CSV trop volumineux");
  if (mapping.unit !== "tokens") throw new Error("L'unité de tokens doit être explicitement confirmée");
  const rows = csvCells(text.replace(/^\uFEFF/, ""), mapping.delimiter);
  if (rows.length < 2 || rows.length > PERSONAL_AI_IMPORT_LIMITS.csvLines + 1) throw new Error("CSV hors plage de lignes");
  const headers = rows[0];
  if (new Set(headers).size !== headers.length) throw new Error("CSV: en-têtes dupliqués");
  const mappedColumns = [mapping.startUtcColumn, mapping.endUtcColumn, mapping.inputColumn, mapping.outputColumn,
    mapping.cacheReadColumn, mapping.cacheWriteColumn, mapping.modelColumn, mapping.costColumn, mapping.currencyColumn]
    .filter((value): value is string => value !== undefined);
  for (const column of mappedColumns) if (!headers.includes(column)) throw new Error(`CSV: colonne mappée absente (${column})`);
  if ((mapping.startUtcColumn === undefined) !== (mapping.endUtcColumn === undefined)) throw new Error("CSV: les deux bornes de période doivent être mappées ensemble");
  if (!mapping.inputColumn && !mapping.outputColumn && !mapping.costColumn) throw new Error("CSV: mappez au moins un token ou un coût");
  if ((mapping.costColumn === undefined) !== (mapping.currencyColumn === undefined)) throw new Error("CSV: un coût exige une devise mappée");

  const result: PersonalAiImportRow[] = [];
  const warnings: string[] = [];
  let rejectedCount = 0;
  for (const [rowIndex, row] of rows.slice(1).entries()) {
    try {
    if (row.length !== headers.length) throw new Error(`CSV ligne ${rowIndex + 2}: colonnes incohérentes`);
    const value = (column?: string) => column === undefined ? "" : row[headers.indexOf(column)] ?? "";
    const input = optionalCount(value(mapping.inputColumn), "input");
    const output = optionalCount(value(mapping.outputColumn), "output");
    const cacheRead = optionalCount(value(mapping.cacheReadColumn), "cacheRead");
    const cacheWrite = optionalCount(value(mapping.cacheWriteColumn), "cacheWrite");
    const cost = optionalCost(value(mapping.costColumn));
    const mappedCurrency = value(mapping.currencyColumn).trim().toUpperCase() || null;
    const currency = cost === null ? null : mappedCurrency;
    if (currency !== null && !/^[A-Z]{3}$/.test(currency)) throw new Error(`CSV ligne ${rowIndex + 2}: code devise invalide`);
    if (cost !== null && currency === null) throw new Error(`CSV ligne ${rowIndex + 2}: devise manquante`);
    if (input === null && output === null && cost === null) throw new Error(`CSV ligne ${rowIndex + 2}: aucun token ni coût explicite`);
    const startValue = value(mapping.startUtcColumn).trim();
    const endValue = value(mapping.endUtcColumn).trim();
    const start = startValue ? validUtc(startValue) : null;
    const end = endValue ? validUtc(endValue) : null;
    if ((start === null) !== (end === null)) throw new Error(`CSV ligne ${rowIndex + 2}: période incomplète`);
    if (start !== null && end !== null && start >= end) throw new Error(`CSV ligne ${rowIndex + 2}: période vide ou inversée`);
    const hasTokens = input !== null || output !== null;
    const draft: PersonalAiDeclarationDraft = {
      provider: "OTHER", source: "MANUAL", sourceVersion: mapping.sourceVersion, provenance: "USER_DECLARED",
      granularity: start === null ? "UNKNOWN" : "AGGREGATE", periodStartUtc: start, periodEndUtc: end,
      modelRaw: value(mapping.modelColumn).trim() || null, modelCanonical: null, operator: null, execution: "CLOUD",
      inferenceRegion: null, access: "UNKNOWN", requestCount: null,
      tokens: {
        inputTotal: input, inputUncached: null, cacheRead, cacheWrite,
        outputVisible: output, outputReasoning: null, outputTotal: output, reasoningRelation: "UNKNOWN",
      },
      modality: { images: null, audioMinutes: null, videoSeconds: null },
      energy: { kwh: null, boundary: null, evidence: null, averageWatts: null, durationSeconds: null, idleWatts: null },
    };
    const metadata: PersonalAiImportMetadata = {
      provider: "OTHER", granularity: start === null ? "UNKNOWN" : "AGGREGATE",
      completeness: hasTokens ? "UNKNOWN" : "PARTIAL", freshnessUtc: null,
    };
    result.push(await normalizePersonalAiImportRow(draft, metadata,
      ["csv-mapped", mapping.sourceVersion, start, end, draft.modelRaw, start === null ? draft.tokens : null, cost], cost, currency));
    } catch (error) {
      rejectedCount += 1;
      const reason = error instanceof Error ? error.message : "contenu non conforme";
      warnings.push(`Ligne ${rowIndex + 2} rejetée : ${reason}`);
    }
  }
  return { rows: result, rejectedCount, warnings };
}
