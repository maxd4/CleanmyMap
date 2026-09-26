import type { ExecutiveNarrative } from "@/lib/reports/master-pack/analytics/executive";
import type { ReportModel } from "@/lib/reports/report-model/types";
import { escapeHtml, safeImageSource } from "@/lib/security/html-escape";

export function sanitizeReportForPdfHtml(report: ReportModel): ReportModel {
  return {
    ...report,
    generatedAt: escapeHtml(report.generatedAt),
    areas: report.areas.map((area) => ({ ...area, area: escapeHtml(area.area) })),
    highlightPhotos: report.highlightPhotos.flatMap((photo) => {
      const source = safeImageSource(photo.url);
      return source
        ? [{ ...photo, url: escapeHtml(source), label: escapeHtml(photo.label), date: escapeHtml(photo.date) }]
        : [];
    }),
    community: {
      ...report.community,
      topLeaderboard: report.community.topLeaderboard.map((user) => ({
        ...user,
        name: escapeHtml(user.name),
      })),
      sourceBuckets: { ...report.community.sourceBuckets },
    },
  };
}

export function sanitizeExecutiveNarrative(
  executive: ExecutiveNarrative | null,
): ExecutiveNarrative | null {
  if (!executive) return null;

  return {
    ...executive,
    readinessLabel: escapeHtml(executive.readinessLabel),
    headline: escapeHtml(executive.headline),
    summary: escapeHtml(executive.summary),
    evidence: executive.evidence.map((value) => escapeHtml(value)),
    budgetUseCases: executive.budgetUseCases.map((value) => escapeHtml(value)),
    watchouts: executive.watchouts.map((value) => escapeHtml(value)),
  };
}
