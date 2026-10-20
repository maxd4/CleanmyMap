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

export async function previewSpogomiMeasurementWorkbook(params: { supabase: SupabaseClient; eventId: string; divisionId: string; file: File; sheetName?: string; actorClerkId: string }): Promise<unknown> {
  const bytes = new Uint8Array(await params.file.arrayBuffer());
  if (!bytes.length || bytes.byteLength > MAX_FILE_BYTES) throw new Error("Classeur refusé : taille absente ou supérieure à 5 Mo.");
  const format = formatFromFileName(params.file.name);
  const contentHash = await sha256(bytes);
  const workbook = workbookRows(bytes, format);
  const selectedSheet = params.sheetName ? workbook.sheets.find((sheet) => sheet.name === params.sheetName) : workbook.sheets[0];
  if (!selectedSheet) throw new Error("La feuille demandée est introuvable.");
  const headers = selectedSheet.rows[0] ?? [];
  const teamIndex = columnIndex(headers, ["equipe", "team", "team number", "numero equipe", "numero dequipe", "team id"]);
  const categoryIndex = columnIndex(headers, ["categorie", "category", "code categorie", "category code", "code"]);
  const valueIndex = columnIndex(headers, ["valeur", "value", "mesure", "measurement", "quantite", "quantity", "masse g", "mass grams", "count"]);
  const kindIndex = columnIndex(headers, ["type", "kind", "measurement kind", "nature"]);
  const unitIndex = columnIndex(headers, ["unite", "unit"]);
  const methodIndex = columnIndex(headers, ["methode", "method", "measurement method"]);
  const provenanceIndex = columnIndex(headers, ["provenance", "source", "origine"]);
  if (teamIndex < 0 || categoryIndex < 0 || valueIndex < 0) throw new Error("L’aperçu doit contenir équipe, catégorie et valeur.");
  const [teamsResult, categoriesResult] = await Promise.all([
    params.supabase.from("spogomi_teams").select("id, team_number, public_name").eq("event_id", params.eventId).eq("division_id", params.divisionId),
    params.supabase.from("spogomi_category_rules").select("id, code, measurement_kind, unit").eq("event_id", params.eventId).eq("division_id", params.divisionId),
  ]);
  if (teamsResult.error) throw teamsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  const teamsByNumber = new Map((teamsResult.data ?? []).map((team) => [String(team.team_number), team]));
  const categoriesByCode = new Map((categoriesResult.data ?? []).map((category) => [normalizeHeader(String(category.code)), category]));
  const rows = selectedSheet.rows.slice(1).map((row, offset) => {
    const teamValue = normalizeValue(row[teamIndex]);
    const categoryValue = normalizeHeader(row[categoryIndex] ?? "");
    const team = teamsByNumber.get(teamValue);
    const category = categoriesByCode.get(categoryValue);
    const kind = normalizeHeader(row[kindIndex] ?? category?.measurement_kind ?? "");
    const measurementKind = kind === "mass" || kind === "count" || kind === "volume" ? kind : category?.measurement_kind ?? null;
    const value = decimal(row[valueIndex]);
    const diagnostics: string[] = [];
    if (!team) diagnostics.push("Équipe introuvable dans cette division.");
    if (!category) diagnostics.push("Catégorie introuvable dans ce règlement.");
    if (!measurementKind) diagnostics.push("Nature de mesure inconnue.");
    if (value === null) diagnostics.push("Valeur numérique absente ou invalide.");
    if (category && measurementKind !== category.measurement_kind) diagnostics.push("La nature de mesure ne correspond pas au règlement.");
    return { rowNumber: offset + 2, teamNumber: Number(teamValue) || null, teamId: team?.id ?? null, categoryCode: categoryValue || null, categoryRuleId: category?.id ?? null, measurementKind, unit: normalizeValue(row[unitIndex] ?? category?.unit ?? "") || null, quantity: measurementKind === "volume" ? value : null, massGrams: measurementKind === "mass" ? value : null, objectCount: measurementKind === "count" ? value : null, measurementMethod: normalizeValue(row[methodIndex] ?? "import Excel") || "import Excel", provenance: normalizeValue(row[provenanceIndex] ?? "import_excel") || "import_excel", selected: diagnostics.length === 0, diagnostics };
  });
  const columnMapping: Record<string, string> = {
    team: headers[teamIndex],
    category: headers[categoryIndex],
    value: headers[valueIndex],
  };
  if (kindIndex >= 0) columnMapping.kind = headers[kindIndex];
  if (unitIndex >= 0) columnMapping.unit = headers[unitIndex];
  if (methodIndex >= 0) columnMapping.method = headers[methodIndex];
  if (provenanceIndex >= 0) columnMapping.provenance = headers[provenanceIndex];
  const mappingKey = JSON.stringify(columnMapping);
  const importKey = `${params.eventId}:${params.divisionId}:${contentHash}:${selectedSheet.name}:${mappingKey}`;
  const existing = await params.supabase.from("spogomi_measurement_imports").select("id, status, import_key, content_sha256, sheet_name, column_mapping").eq("event_id", params.eventId).eq("division_id", params.divisionId).eq("content_sha256", contentHash).eq("sheet_name", selectedSheet.name).eq("column_mapping", columnMapping).maybeSingle();
  if (existing.error) throw existing.error;
  let importId = existing.data?.id as string | undefined;
  if (!importId) {
    const inserted = await params.supabase.from("spogomi_measurement_imports").insert({ event_id: params.eventId, division_id: params.divisionId, content_sha256: contentHash, import_key: importKey, file_name: params.file.name, format, sheet_name: selectedSheet.name, column_mapping: columnMapping, imported_by_clerk_id: params.actorClerkId }).select("id").single();
    if (inserted.error) {
      if (inserted.error.code !== "23505") throw inserted.error;
      const raced = await params.supabase.from("spogomi_measurement_imports").select("id, status").eq("event_id", params.eventId).eq("division_id", params.divisionId).eq("content_sha256", contentHash).eq("sheet_name", selectedSheet.name).eq("column_mapping", columnMapping).single();
      if (raced.error) throw raced.error;
      importId = raced.data.id;
    } else importId = inserted.data.id;
  }
  if (!importId) throw new Error("L’import n’a pas pu être réservé.");
  if (existing.data?.status === "confirmed") {
    return { importId, contentHash, fileName: params.file.name, format, sheetName: selectedSheet.name, rows, alreadyConfirmed: true };
  }
  const rowsInsert = rows.map((row) => ({ ...row, import_id: importId, event_id: params.eventId, division_id: params.divisionId, diagnostics: row.diagnostics }));
  const rowsResult = await params.supabase.from("spogomi_measurement_import_rows").upsert(rowsInsert, { onConflict: "import_id,row_number" });
  if (rowsResult.error) throw rowsResult.error;
  return { importId, contentHash, fileName: params.file.name, format, sheetName: selectedSheet.name, rows, alreadyConfirmed: existing.data?.status === "confirmed" };
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
