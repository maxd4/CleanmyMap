import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeValue, workbookRows } from "./preparation-import-workbook";
import type { SpogomiImportFormat } from "./types";
import { callSpogomiFieldOperation } from "./field-operations-service";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FORMAT_EXTENSIONS: SpogomiImportFormat[] = ["xlsx", "xls", "ods", "csv", "tsv"];

function normalizeHeader(value: string): string {
  return normalizeValue(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").replace(/[^a-z0-9]+/g, " ").trim();
}
function formatFromFileName(fileName: string): SpogomiImportFormat {
  const extension = fileName.toLowerCase().split(".").pop() as SpogomiImportFormat | undefined;
  if (!extension || !FORMAT_EXTENSIONS.includes(extension)) throw new Error("Format refusé : utilisez CSV, TSV, XLSX, XLS ou ODS.");
  return extension;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function columnIndex(headers: string[], names: string[]): number {
  const normalized = headers.map(normalizeHeader);
  return normalized.findIndex((header) => names.includes(header));
}

function decimal(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const MEASUREMENT_COLUMN_NAMES = {
  team: ["equipe", "team", "team number", "numero equipe", "numero dequipe", "team id"],
  category: ["categorie", "category", "code categorie", "category code", "code"],
  value: ["valeur", "value", "mesure", "measurement", "quantite", "quantity", "masse g", "mass grams", "count"],
  kind: ["type", "kind", "measurement kind", "nature"],
  unit: ["unite", "unit"],
  method: ["methode", "method", "measurement method"],
  provenance: ["provenance", "source", "origine"],
};

type MeasurementColumnIndexes = Record<keyof typeof MEASUREMENT_COLUMN_NAMES, number>;

function findMeasurementColumns(headers: string[]): MeasurementColumnIndexes {
  return Object.fromEntries(Object.entries(MEASUREMENT_COLUMN_NAMES).map(([key, names]) => [key, columnIndex(headers, names)])) as MeasurementColumnIndexes;
}

function buildMeasurementRow(
  row: string[],
  offset: number,
  columns: MeasurementColumnIndexes,
  teamsByNumber: Map<string, { id: string; team_number: number; public_name: string }>,
  categoriesByCode: Map<string, { id: string; code: string; measurement_kind: string; unit: string }>,
) {
  const teamValue = normalizeValue(row[columns.team]);
  const categoryValue = normalizeHeader(row[columns.category] ?? "");
  const team = teamsByNumber.get(teamValue);
  const category = categoriesByCode.get(categoryValue);
  const measurementKind = resolveMeasurementKind(row[columns.kind], category?.measurement_kind);
  const value = decimal(row[columns.value]);
  const diagnostics = measurementDiagnostics(team, category, measurementKind, value);
  return { rowNumber: offset + 2, teamNumber: Number(teamValue) || null, teamId: team?.id ?? null, categoryCode: categoryValue || null, categoryRuleId: category?.id ?? null, measurementKind, ...measurementValues(measurementKind, value), ...measurementMetadata(row, columns, category), selected: diagnostics.length === 0, diagnostics };
}

function measurementValues(measurementKind: "mass" | "count" | "volume" | null, value: number | null) {
  return { quantity: measurementKind === "volume" ? value : null, massGrams: measurementKind === "mass" ? value : null, objectCount: measurementKind === "count" ? value : null };
}

function measurementMetadata(row: string[], columns: MeasurementColumnIndexes, category: { unit: string } | undefined) {
  return { unit: normalizeValue(row[columns.unit] ?? category?.unit ?? "") || null, measurementMethod: normalizeValue(row[columns.method] ?? "import Excel") || "import Excel", provenance: normalizeValue(row[columns.provenance] ?? "import_excel") || "import_excel" };
}

function resolveMeasurementKind(value: string | undefined, categoryKind: string | undefined): "mass" | "count" | "volume" | null {
  const kind = normalizeHeader(value ?? categoryKind ?? "");
  if (kind === "mass" || kind === "count" || kind === "volume") return kind;
  return categoryKind === "mass" || categoryKind === "count" || categoryKind === "volume" ? categoryKind : null;
}

function measurementDiagnostics(team: unknown, category: { measurement_kind: string } | undefined, measurementKind: string | null, value: number | null): string[] {
  const diagnostics: string[] = [];
  if (!team) diagnostics.push("Équipe introuvable dans cette division.");
  if (!category) diagnostics.push("Catégorie introuvable dans ce règlement.");
  if (!measurementKind) diagnostics.push("Nature de mesure inconnue.");
  if (value === null) diagnostics.push("Valeur numérique absente ou invalide.");
  if (category && measurementKind !== category.measurement_kind) diagnostics.push("La nature de mesure ne correspond pas au règlement.");
  return diagnostics;
}

function buildMeasurementColumnMapping(headers: string[], columns: MeasurementColumnIndexes): Record<string, string> {
  const mapping: Record<string, string> = { team: headers[columns.team], category: headers[columns.category], value: headers[columns.value] };
  if (columns.kind >= 0) mapping.kind = headers[columns.kind];
  if (columns.unit >= 0) mapping.unit = headers[columns.unit];
  if (columns.method >= 0) mapping.method = headers[columns.method];
  if (columns.provenance >= 0) mapping.provenance = headers[columns.provenance];
  return mapping;
}

async function reserveMeasurementImport(params: { supabase: SupabaseClient; eventId: string; divisionId: string; contentHash: string; fileName: string; format: SpogomiImportFormat; sheetName: string; columnMapping: Record<string, string>; importKey: string; actorClerkId: string }): Promise<{ importId: string; alreadyConfirmed: boolean }> {
  const existing = await params.supabase.from("spogomi_measurement_imports").select("id, status, import_key, content_sha256, sheet_name, column_mapping").eq("event_id", params.eventId).eq("division_id", params.divisionId).eq("content_sha256", params.contentHash).eq("sheet_name", params.sheetName).eq("column_mapping", params.columnMapping).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return { importId: String(existing.data.id), alreadyConfirmed: existing.data.status === "confirmed" };
  const inserted = await params.supabase.from("spogomi_measurement_imports").insert({ event_id: params.eventId, division_id: params.divisionId, content_sha256: params.contentHash, import_key: params.importKey, file_name: params.fileName, format: params.format, sheet_name: params.sheetName, column_mapping: params.columnMapping, imported_by_clerk_id: params.actorClerkId }).select("id").single();
  if (!inserted.error) return { importId: String(inserted.data.id), alreadyConfirmed: false };
  if (inserted.error.code !== "23505") throw inserted.error;
  const raced = await params.supabase.from("spogomi_measurement_imports").select("id, status").eq("event_id", params.eventId).eq("division_id", params.divisionId).eq("content_sha256", params.contentHash).eq("sheet_name", params.sheetName).eq("column_mapping", params.columnMapping).single();
  if (raced.error) throw raced.error;
  return { importId: String(raced.data.id), alreadyConfirmed: raced.data.status === "confirmed" };
}

export async function previewSpogomiMeasurementWorkbook(params: { supabase: SupabaseClient; eventId: string; divisionId: string; file: File; sheetName?: string; actorClerkId: string }): Promise<unknown> {
  const bytes = new Uint8Array(await params.file.arrayBuffer());
  if (!bytes.length || bytes.byteLength > MAX_FILE_BYTES) throw new Error("Classeur refusé : taille absente ou supérieure à 5 Mo.");
  const format = formatFromFileName(params.file.name);
  const contentHash = await sha256(bytes);
  const workbook = workbookRows(bytes, format);
  const selectedSheet = params.sheetName ? workbook.sheets.find((sheet) => sheet.name === params.sheetName) : workbook.sheets[0];
  if (!selectedSheet) throw new Error("La feuille demandée est introuvable.");
  const headers = selectedSheet.rows[0] ?? [];
  const columns = findMeasurementColumns(headers);
  if (columns.team < 0 || columns.category < 0 || columns.value < 0) throw new Error("L’aperçu doit contenir équipe, catégorie et valeur.");
  const [teamsResult, categoriesResult] = await Promise.all([
    params.supabase.from("spogomi_teams").select("id, team_number, public_name").eq("event_id", params.eventId).eq("division_id", params.divisionId),
    params.supabase.from("spogomi_category_rules").select("id, code, measurement_kind, unit").eq("event_id", params.eventId).eq("division_id", params.divisionId),
  ]);
  if (teamsResult.error) throw teamsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  const teamsByNumber = new Map((teamsResult.data ?? []).map((team) => [String(team.team_number), team]));
  const categoriesByCode = new Map((categoriesResult.data ?? []).map((category) => [normalizeHeader(String(category.code)), category]));
  const rows = selectedSheet.rows.slice(1).map((row, offset) => buildMeasurementRow(row, offset, columns, teamsByNumber, categoriesByCode));
  const columnMapping = buildMeasurementColumnMapping(headers, columns);
  const mappingKey = JSON.stringify(columnMapping);
  const importKey = `${params.eventId}:${params.divisionId}:${contentHash}:${selectedSheet.name}:${mappingKey}`;
  const reservation = await reserveMeasurementImport({ supabase: params.supabase, eventId: params.eventId, divisionId: params.divisionId, contentHash, fileName: params.file.name, format, sheetName: selectedSheet.name, columnMapping, importKey, actorClerkId: params.actorClerkId });
  if (reservation.alreadyConfirmed) return { importId: reservation.importId, contentHash, fileName: params.file.name, format, sheetName: selectedSheet.name, rows, alreadyConfirmed: true };
  const rowsInsert = rows.map((row) => ({ ...row, import_id: reservation.importId, event_id: params.eventId, division_id: params.divisionId, diagnostics: row.diagnostics }));
  const rowsResult = await params.supabase.from("spogomi_measurement_import_rows").upsert(rowsInsert, { onConflict: "import_id,row_number" });
  if (rowsResult.error) throw rowsResult.error;
  return { importId: reservation.importId, contentHash, fileName: params.file.name, format, sheetName: selectedSheet.name, rows, alreadyConfirmed: false };
}

export async function confirmSpogomiMeasurementImport(params: { supabase: SupabaseClient; eventId: string; divisionId: string; importId: string; selectedRowNumbers?: number[]; actorClerkId: string }): Promise<{ imported: number; alreadyConfirmed: boolean }> {
  const result = await callSpogomiFieldOperation({
    supabase: params.supabase,
    rpc: "spogomi_confirm_measurement_import",
    args: {
      p_event_id: params.eventId,
      p_division_id: params.divisionId,
      p_import_id: params.importId,
      p_selected_row_numbers: params.selectedRowNumbers ?? null,
      p_actor_clerk_id: params.actorClerkId,
    },
  });
  if (!result || typeof result !== "object") throw new Error("La confirmation d’import est invalide.");
  const payload = result as { imported?: unknown; alreadyConfirmed?: unknown };
  return {
    imported: typeof payload.imported === "number" ? payload.imported : Number(payload.imported ?? 0),
    alreadyConfirmed: payload.alreadyConfirmed === true,
  };
}
