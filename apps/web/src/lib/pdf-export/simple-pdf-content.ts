import { normalizeDeliverableRubrique } from "@/lib/reports/deliverable-name";
import { formatPdfValue } from "./format-pdf-value";

type PdfReportColumn = {
  key: string;
  label: string;
};

type PdfReportStat = {
  label: string;
  value: string | number;
  detail?: string;
};

export type PdfReportChapter = {
  id?: string;
  title: string;
  subtitle?: string;
  lines?: string[];
  stats?: PdfReportStat[];
  rows?: Record<string, unknown>[];
  columns?: PdfReportColumn[];
  locked?: boolean;
  requiredDetailLevelLabel?: string;
};

export type PdfReportData = {
  title?: string;
  summary?: string[];
  stats?: PdfReportStat[];
  chapters?: PdfReportChapter[];
  rows?: Record<string, unknown>[];
  columns?: PdfReportColumn[];
  generatedAt?: string;
};

export type PdfReportPayload = {
  title: string;
  rubrique: string;
  periode: string;
  organizationType: string;
  organizationName?: string;
  data: PdfReportData;
};

function normalizePeriodForFilename(value: string): string {
  return normalizeDeliverableRubrique(value || "periode");
}

export function buildPdfReportFilename(params: {
  rubrique: string;
  periode: string;
}): string {
  return `rapport_${normalizeDeliverableRubrique(params.rubrique)}_${normalizePeriodForFilename(params.periode)}.pdf`;
}

export function hasPdfReportData(data: PdfReportData | null | undefined): boolean {
  if (!data) return false;
  if (data.summary?.some((line) => line.trim().length > 0)) return true;
  if (data.stats?.length) return true;
  if (data.chapters?.length) return true;
  if (data.rows?.length) return true;
  return false;
}

function buildPdfReportHeader(payload: PdfReportPayload, generatedLabel: string): string[] {
  const lines: string[] = [
    payload.title,
    "",
    `Rubrique: ${payload.rubrique}`,
    `Periode: ${payload.periode}`,
    `Type d'organisation: ${payload.organizationType}`,
  ];

  if (payload.organizationName?.trim()) {
    lines.push(`Organisation: ${payload.organizationName.trim()}`);
  }

  lines.push(`Genere le: ${generatedLabel}`, "");
  return lines;
}

function appendSummary(lines: string[], summary: string[] | undefined): void {
  if (!summary?.length) return;
  lines.push("Resume");
  for (const item of summary) {
    if (item.trim()) lines.push(`- ${item.trim()}`);
  }
  lines.push("");
}

function appendStats(lines: string[], stats: PdfReportStat[] | undefined): void {
  if (!stats?.length) return;
  lines.push("Indicateurs");
  for (const stat of stats) {
    const detail = stat.detail ? ` (${stat.detail})` : "";
    lines.push(`- ${stat.label}: ${formatPdfValue(stat.value)}${detail}`);
  }
  lines.push("");
}

function appendChapter(lines: string[], chapter: PdfReportChapter, index: number): void {
  lines.push(`${index + 1}. ${chapter.title}`);
  if (chapter.subtitle?.trim()) lines.push(`- ${chapter.subtitle.trim()}`);
  for (const line of chapter.lines ?? []) {
    if (line.trim()) lines.push(`- ${line.trim()}`);
  }
  for (const stat of chapter.stats ?? []) {
    const detail = stat.detail ? ` (${stat.detail})` : "";
    lines.push(`  • ${stat.label}: ${formatPdfValue(stat.value)}${detail}`);
  }
  appendChapterRows(lines, chapter);
  lines.push("");
}

function appendChapterRows(lines: string[], chapter: PdfReportChapter): void {
  if (!chapter.rows?.length) return;
  const columns =
    chapter.columns ?? Object.keys(chapter.rows[0] ?? {}).map((key) => ({ key, label: key }));
  lines.push(`  ${columns.map((column) => column.label).join(" | ")}`);
  for (const row of chapter.rows.slice(0, 40)) {
    lines.push(`  ${columns.map((column) => formatPdfValue(row[column.key])).join(" | ")}`);
  }
}

function appendChapters(lines: string[], chapters: PdfReportChapter[] | undefined): void {
  if (!chapters?.length) return;
  lines.push("Chapitres");
  chapters.forEach((chapter, index) => appendChapter(lines, chapter, index));
}

function appendRows(
  lines: string[],
  rows: Record<string, unknown>[] | undefined,
  columns: PdfReportColumn[],
): void {
  if (!rows?.length) return;
  lines.push("Donnees visibles", columns.map((column) => column.label).join(" | "));
  for (const row of rows.slice(0, 80)) {
    lines.push(columns.map((column) => formatPdfValue(row[column.key])).join(" | "));
  }
  if (rows.length > 80) {
    lines.push(`... ${rows.length - 80} ligne(s) supplementaire(s) non affichee(s).`);
  }
}

export function buildPdfReportLines(payload: PdfReportPayload): string[] {
  const generatedAt = payload.data.generatedAt ?? new Date().toISOString();
  const generatedLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(generatedAt));
  const columns =
    payload.data.columns ?? Object.keys(payload.data.rows?.[0] ?? {}).map((key) => ({ key, label: key }));
  const lines = buildPdfReportHeader(payload, generatedLabel);

  appendSummary(lines, payload.data.summary);
  appendStats(lines, payload.data.stats);
  appendChapters(lines, payload.data.chapters);
  appendRows(lines, payload.data.rows, columns);

  return lines.filter((line) => line.length <= 180).map((line) => line.slice(0, 180));
}
