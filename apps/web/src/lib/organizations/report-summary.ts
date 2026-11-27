export type ReportMetric = { value: number | null; known: number; total: number };
export function sumKnown(values: readonly (number | null | undefined)[]): ReportMetric {
  const known = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  return { value: known.length ? known.reduce((a,b) => a+b,0) : null, known: known.length, total: values.length };
}
export function summarizeOrganizationReport(rows: readonly {massKg: number | null | undefined; butts: number | null | undefined; participations: number | null | undefined; durationMinutes: number | null | undefined}[]) {
  return { actions: rows.length, massKg: sumKnown(rows.map(row => row.massKg)), butts: sumKnown(rows.map(row => row.butts)), participations: sumKnown(rows.map(row => row.participations)), durationMinutes: sumKnown(rows.map(row => row.durationMinutes)) };
}
