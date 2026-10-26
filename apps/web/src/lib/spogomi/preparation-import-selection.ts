import type { SpogomiRosterColumnMapping, SpogomiRosterPreview } from "./types";

export type SelectedImportRows = {
  eligibleRows: SpogomiRosterPreview["rows"];
  selectedRows: SpogomiRosterPreview["rows"];
};

export function selectImportRows(
  preview: SpogomiRosterPreview,
  acceptedRowNumbers?: number[],
): SelectedImportRows {
  const errorsByRow = new Set(preview.errors.map((error) => error.rowNumber));
  const eligibleRows = preview.rows.filter((row) => !errorsByRow.has(row.rowNumber));
  const selectedRowNumbers = acceptedRowNumbers ?? eligibleRows.map((row) => row.rowNumber);
  if (!selectedRowNumbers.length && eligibleRows.length) throw new Error("Validation: sélectionnez explicitement les lignes admissibles avant confirmation.");
  if (selectedRowNumbers.some((rowNumber) => errorsByRow.has(rowNumber) || !preview.rows.some((row) => row.rowNumber === rowNumber))) throw new Error("Validation: une ligne sélectionnée est invalide ou absente de l’aperçu.");
  const selectedRows = preview.rows.filter((row) => selectedRowNumbers.includes(row.rowNumber));
  if (!selectedRows.length && preview.rows.length) throw new Error("Validation: aucune ligne admissible sélectionnée.");
  return { eligibleRows, selectedRows };
}

export function assertSelectedImportRowsAllowed(
  preview: SpogomiRosterPreview,
  selectedRows: SpogomiRosterPreview["rows"],
): void {
  const selectedRowNumbers = new Set(selectedRows.map((row) => row.rowNumber));
  const selectedConflictRows = (preview.conflictRowNumbers ?? []).filter((rowNumber) => selectedRowNumbers.has(rowNumber));
  if (preview.sourceSystem === "cachan_ticketing" && selectedConflictRows.length) throw new Error(`Conflict: les lignes ${selectedConflictRows.join(", ")} nécessitent une résolution organisateur avant confirmation.`);
}

function canonicalImportColumns(mapping: SpogomiRosterColumnMapping): string {
  return JSON.stringify(["name", "group", "sourceRowId", "ticketReference", "orderReference", "orderAlternativeReference", "ticketStatus", "ticketDeleted"].filter((key) => mapping[key as keyof SpogomiRosterColumnMapping] !== undefined).map((key) => [key, mapping[key as keyof SpogomiRosterColumnMapping]]));
}

function canonicalImportMapping(mapping: SpogomiRosterColumnMapping, options?: Pick<SpogomiRosterPreview, "sheetName" | "headerRow">): string {
  return JSON.stringify({
    columns: canonicalImportColumns(mapping),
    sheetName: options?.sheetName ?? null,
    headerRow: options?.headerRow ?? null,
  });
}

export function importMappingMatches(
  stored: SpogomiRosterColumnMapping,
  preview: SpogomiRosterPreview,
): boolean {
  if (canonicalImportColumns(stored) !== canonicalImportColumns(preview.mapping)) return false;
  const metadata = stored as Record<string, string>;
  if (!metadata.__sheetName && !metadata.__headerRow) return true;
  return canonicalImportMapping(stored, { sheetName: String(metadata.__sheetName ?? ""), headerRow: Number(metadata.__headerRow ?? 0) }) === canonicalImportMapping(preview.mapping, preview);
}
