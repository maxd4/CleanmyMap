import type { GovernanceMonthlyReportPayload } from "./governance-monthly-report-store";

export function normalizeGovernanceImpactPayload(
  payload: GovernanceMonthlyReportPayload["impact"] | null | undefined,
): GovernanceMonthlyReportPayload["impact"] {
  if (!payload) {
    return {
      monthlyKgCo2eProxy: null,
      confidencePercent: null,
      snapshotCount: 0,
      latestSnapshotDate: null,
      topServiceLabel: null,
      topServiceMonthlyKgCo2eProxy: null,
      topServiceDeltaKgCo2eProxy: null,
      serviceBreakdown: [],
      growthHighlights: [],
    };
  }

  return {
    monthlyKgCo2eProxy: payload.monthlyKgCo2eProxy ?? null,
    confidencePercent: payload.confidencePercent ?? null,
    snapshotCount: payload.snapshotCount ?? 0,
    latestSnapshotDate: payload.latestSnapshotDate ?? null,
    topServiceLabel: payload.topServiceLabel ?? null,
    topServiceMonthlyKgCo2eProxy: payload.topServiceMonthlyKgCo2eProxy ?? null,
    topServiceDeltaKgCo2eProxy: payload.topServiceDeltaKgCo2eProxy ?? null,
    serviceBreakdown: Array.isArray(payload.serviceBreakdown)
      ? payload.serviceBreakdown.map((item) => ({ key: typeof item.key === "string" ? item.key : "", label: typeof item.label === "string" ? item.label : "", currentKgCo2eProxy: item.currentKgCo2eProxy ?? null, previousKgCo2eProxy: item.previousKgCo2eProxy ?? null, deltaKgCo2eProxy: item.deltaKgCo2eProxy ?? null }))
      : [],
    growthHighlights: Array.isArray(payload.growthHighlights)
      ? payload.growthHighlights.map((item) => ({ label: typeof item.label === "string" ? item.label : "", previousKgCo2eProxy: item.previousKgCo2eProxy ?? null, currentKgCo2eProxy: item.currentKgCo2eProxy ?? null, deltaKgCo2eProxy: item.deltaKgCo2eProxy ?? null }))
      : [],
  };
}
