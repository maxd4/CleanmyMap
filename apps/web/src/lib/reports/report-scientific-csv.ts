import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";
import { escapeCsvCell } from "./csv";
import { buildReportScientificExport } from "./report-scientific-export";

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function buildReportScientificCsv(generation: ReportGenerationSnapshotRecord): string {
  const exportData = buildReportScientificExport(generation);
  const reference = exportData.reference;
  const headers = [
    "generation_id", "report_title", "generated_at", "period_id", "period_from", "period_to",
    "period_timezone", "scope_kind", "scope_value", "scope_label", "table_id", "table_title",
    "row_index", "field_id", "field_label", "unit", "value", "status",
  ];
  const lines = [headers.map((header) => escapeCsvCell(header)).join(",")];
  for (const table of exportData.tables) {
    for (const row of table.rows) {
      for (const column of table.columns) {
        const cell = row.values[column.id];
        lines.push([
          reference.generationId, reference.title, reference.generatedAt, reference.period.id,
          reference.period.from, reference.period.to, reference.period.timeZone,
          reference.scope.kind, reference.scope.value, reference.scope.label, table.id,
          table.title, row.index, column.id, column.label, column.unit, csvValue(cell.value), cell.status,
        ].map((value) => escapeCsvCell(value)).join(","));
      }
    }
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
