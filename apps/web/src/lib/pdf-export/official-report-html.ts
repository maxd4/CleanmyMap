import type { ReportPdfTheme } from "./report-pdf-theme";
import { formatGeneratedAt } from "./official-report-sections";
import { buildClassicReportHtml } from "./official-report-html-classic";
import { buildWebReportHtml } from "./official-report-html-web";
import type { PdfReportPayload } from "./simple-pdf";

export { renderOfficialMarkdown } from "./official-report-markdown";

export function buildOfficialReportHtml(
  payload: PdfReportPayload,
  options: { theme?: ReportPdfTheme } = {},
): string {
  const generatedAt = formatGeneratedAt(payload.data.generatedAt);
  const title = payload.title || payload.data.title || "Rapport CleanMyMap";
  const summary = payload.data.summary?.filter((line) => line.trim().length > 0) ?? [];
  const chapters = payload.data.chapters ?? [];

  if (chapters.length > 0) {
    return buildWebReportHtml(payload, title, generatedAt, options.theme);
  }

  return buildClassicReportHtml(
    payload,
    title,
    generatedAt,
    summary,
    summary.length > 0,
    Boolean(payload.data.stats?.length),
    chapters.length > 0,
    Boolean(payload.data.rows?.length),
    options.theme,
  );
}
