import { escapeCsvCell } from "./csv";

export type TabularCsvColumn = { key: string; label: string };

export function buildTabularCsv(
  data: Record<string, unknown>[],
  columns?: TabularCsvColumn[],
): string {
  if (!data.length) {
    return "";
  }

  const resolvedColumns = columns?.length
    ? columns
    : Object.keys(data[0] ?? {}).map((key) => ({ key, label: key }));
  const header = resolvedColumns.map((column) => escapeCsvCell(column.label, ";")).join(";");
  const rows = data.map((item) =>
    resolvedColumns.map((column) => escapeCsvCell(item[column.key], ";")).join(";"),
  );

  return [header, ...rows].join("\n");
}
