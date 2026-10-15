import { classifyCachanTicketStatus } from "./ticket-status";
import type {
  SpogomiImportFormat,
  SpogomiRosterColumn,
  SpogomiRosterColumnDiagnostic,
  SpogomiRosterColumnMapping,
  SpogomiRosterPreview,
  SpogomiRosterRow,
  SpogomiRosterRowError,
  SpogomiRosterSheetCandidate,
} from "./types";

export function buildPreviewContent(params: {
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
