import type { EnvironmentalImpactCaptureResult } from "@/lib/environmental-impact-estimator/dashboard-capture";
import { buildServiceThresholdAlerts } from "@/lib/environmental-impact-estimator/service-risk";
import { formatScorePercent } from "@/lib/formatters/score";
import type { StorageUsageReport } from "@/lib/supabase/storage-usage-service";
import { formatStorageBytes } from "@/lib/supabase/storage-usage";
import {
  buildStorageContributionHighlights,
  getFastestGrowingContribution,
} from "./governance-monthly-report-business";
import type { GovernanceMonthlyReportPayload } from "./governance-monthly-report-store";

export const GOVERNANCE_RISK_BANNER_THRESHOLD = 70;

export function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function formatNumber(value: number | null, maximumFractionDigits = 2): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? 0 : 0,
  }).format(value);
}

function formatMonthLabel(reportMonth: string): string {
  const parsed = new Date(`${reportMonth}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return reportMonth;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function getReportMonth(generatedAt: string): string {
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function getSnapshotServiceCharge(
  snapshot: EnvironmentalImpactCaptureResult["snapshots"][number] | null | undefined,
  serviceKey: string,
): number {
  if (!snapshot) {
    return 0;
  }

  const service = snapshot.model.infrastructure.services.find((item) => item.key === serviceKey);
  return service?.monthlyKgCo2eProxy ?? 0;
}

type GovernanceInfrastructureService = {
  key: string;
  label: string;
  monthlyKgCo2eProxy: number | null;
  sharePercent: number;
  confidencePercent: number;
  uncertaintyPercent: number;
  status: "reference" | "derived" | "partial" | "ready";
};

function getInfrastructureServicePriorityScore(service: GovernanceInfrastructureService): number {
  const statusScore =
    service.status === "partial"
      ? 30
      : service.status === "reference"
        ? 20
        : service.status === "ready"
          ? 0
          : 15;
  const shareScore = Math.min(45, Math.round(service.sharePercent * 1.2));
  const uncertaintyScore = Math.min(20, Math.round(service.uncertaintyPercent * 0.6));
  const confidencePenalty = Math.max(0, 18 - Math.round((service.confidencePercent - 70) * 0.4));

  return statusScore + shareScore + uncertaintyScore + confidencePenalty;
}

function sortServicesForGovernance(
  services: GovernanceInfrastructureService[],
): GovernanceInfrastructureService[] {
  return services
    .slice()
    .sort((left, right) => {
      const leftScore = getInfrastructureServicePriorityScore(left);
      const rightScore = getInfrastructureServicePriorityScore(right);
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      if ((right.monthlyKgCo2eProxy ?? 0) !== (left.monthlyKgCo2eProxy ?? 0)) {
        return (right.monthlyKgCo2eProxy ?? 0) - (left.monthlyKgCo2eProxy ?? 0);
      }

      return left.label.localeCompare(right.label, "fr");
    });
}

function buildTopGrowthHighlights(
  current: Array<{ key: string; label: string; monthlyKgCo2eProxy: number | null }>,
  previous: EnvironmentalImpactCaptureResult["snapshots"][number] | null | undefined,
): Array<{
  label: string;
  previousKgCo2eProxy: number;
  currentKgCo2eProxy: number;
  deltaKgCo2eProxy: number;
}> {
  return current
    .map((service) => {
      const previousKgCo2eProxy = getSnapshotServiceCharge(previous, service.key);
      const currentKgCo2eProxy = service.monthlyKgCo2eProxy ?? 0;
      return {
        label: service.label,
        previousKgCo2eProxy,
        currentKgCo2eProxy,
        deltaKgCo2eProxy: currentKgCo2eProxy - previousKgCo2eProxy,
      };
    })
    .sort((left, right) => right.deltaKgCo2eProxy - left.deltaKgCo2eProxy)
    .slice(0, 3);
}

function buildServiceEvolutionBreakdown(
  current: Array<{ key: string; label: string; monthlyKgCo2eProxy: number | null }>,
  previous: EnvironmentalImpactCaptureResult["snapshots"][number] | null | undefined,
): Array<{
  key: string;
  label: string;
  currentKgCo2eProxy: number;
  previousKgCo2eProxy: number;
  deltaKgCo2eProxy: number;
}> {
  return current.map((service) => {
    const previousKgCo2eProxy = getSnapshotServiceCharge(previous, service.key);
    const currentKgCo2eProxy = service.monthlyKgCo2eProxy ?? 0;
    return {
      key: service.key,
      label: service.label,
      currentKgCo2eProxy,
      previousKgCo2eProxy,
      deltaKgCo2eProxy: currentKgCo2eProxy - previousKgCo2eProxy,
    };
  });
}

function buildStorageGrowthHighlights(
  report: StorageUsageReport,
): Array<{
  label: string;
  previousBytes: number;
  currentBytes: number;
  deltaBytes: number;
}> {
  return [
    ...report.comparison.bucketGrowth.map((item) => ({
      label: item.label,
      previousBytes: item.previousBytes,
      currentBytes: item.currentBytes,
      deltaBytes: item.deltaBytes,
    })),
    ...report.comparison.extensionGrowth.map((item) => ({
      label: item.label,
      previousBytes: item.previousBytes,
      currentBytes: item.currentBytes,
      deltaBytes: item.deltaBytes,
    })),
  ]
    .sort((left, right) => right.deltaBytes - left.deltaBytes)
    .slice(0, 3);
}

function buildProjectSignalPrecision(report: EnvironmentalImpactCaptureResult) {
  const breakdown = report.signals.signalBreakdown;

  return {
    traffic: {
      pageViewEvents:
        breakdown?.traffic?.pageViewEvents ?? normalizeNumber(report.signals.siteInput.pageViews) ?? 0,
      legacyPageViewEvents: breakdown?.traffic?.legacyPageViewEvents ?? 0,
      distinctRoutes: breakdown?.traffic?.distinctRoutes ?? 0,
      topRoutes: breakdown?.traffic?.topRoutes ?? [],
    },
    community: {
      events: breakdown?.community?.events ?? 0,
      rsvps: breakdown?.community?.rsvps ?? 0,
      notifications: breakdown?.community?.notifications ?? 0,
      unreadNotifications: breakdown?.community?.unreadNotifications ?? 0,
    },
    communication: {
      emailsSent: breakdown?.communication?.emailsSent ?? 0,
      pdfExports: breakdown?.communication?.pdfExports ?? 0,
    },
  };
}

export function computeGovernanceRiskScore(params: {
  usagePercent: number;
  alerts: Array<{ severity: string }>;
}): number {
  const usageScore = Math.min(60, Math.max(0, params.usagePercent) * 0.6);
  const alertScore = params.alerts.reduce((sum, alert) => {
    if (alert.severity === "critical") {
      return sum + 18;
    }
    if (alert.severity === "warning") {
      return sum + 10;
    }
    return sum + 4;
  }, 0);

  return Math.min(100, Math.round(usageScore + Math.min(40, alertScore)));
}

export function getGovernanceRiskLabel(score: number): string {
  if (score >= 80) {
    return "critique";
  }
  if (score >= 60) {
    return "vigilance";
  }
  if (score >= 30) {
    return "surveillance";
  }
  return "stable";
}

export function buildGovernanceMonthlyReportPayload(params: {
  environmentalImpact: EnvironmentalImpactCaptureResult;
  storageUsage: StorageUsageReport;
  generatedAt?: string;
}): GovernanceMonthlyReportPayload {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const reportMonth = getReportMonth(generatedAt);
  const reportMonthLabel = formatMonthLabel(reportMonth);
  const currentServices = sortServicesForGovernance(
    params.environmentalImpact.model.infrastructure.services.map((service) => ({
      key: service.key,
      label: service.label,
      monthlyKgCo2eProxy: service.monthlyKgCo2eProxy ?? 0,
      sharePercent: service.sharePercent,
      confidencePercent: service.confidencePercent,
      uncertaintyPercent: service.uncertaintyPercent,
      status: service.status,
    })),
  );
  const previousImpactSnapshot = params.environmentalImpact.snapshots[1] ?? null;
  const topService = currentServices[0] ?? null;
  const impactGrowthHighlights = buildTopGrowthHighlights(
    currentServices.map((service) => ({
      key: service.key,
      label: service.label,
      monthlyKgCo2eProxy: service.monthlyKgCo2eProxy ?? 0,
    })),
    previousImpactSnapshot,
  );
  const serviceEvolutionBreakdown = buildServiceEvolutionBreakdown(
    currentServices.map((service) => ({
      key: service.key,
      label: service.label,
      monthlyKgCo2eProxy: service.monthlyKgCo2eProxy ?? 0,
    })),
    previousImpactSnapshot,
  );
  const storageTopBucket = params.storageUsage.current.bucketBreakdown[0] ?? null;
  const storageTopExtension = params.storageUsage.current.extensionBreakdown[0] ?? null;
  const storageTopContribution = params.storageUsage.businessContributions.items[0] ?? null;
  const storageFastestGrowingContribution =
    getFastestGrowingContribution(params.storageUsage.businessContributions.items) ?? null;
  const storageGrowthHighlights = buildStorageGrowthHighlights(params.storageUsage);
  const storageContributionHighlights = buildStorageContributionHighlights(params.storageUsage);
  const projectSignals = buildProjectSignalPrecision(params.environmentalImpact);
  const serviceThresholdAlerts = buildServiceThresholdAlerts({
    currentGeneratedAt: generatedAt,
    currentServices: params.environmentalImpact.model.infrastructure.services,
    snapshots: params.environmentalImpact.snapshots,
  });
  const governanceRiskScore = computeGovernanceRiskScore({
    usagePercent: params.storageUsage.current.usagePercent,
    alerts: [...params.storageUsage.businessContributions.alerts, ...serviceThresholdAlerts].map(
      (alert) => ({ severity: alert.severity }),
    ),
  });
  const storagePrimaryAlert = params.storageUsage.businessContributions.alerts[0] ?? null;
  const primaryAlert = serviceThresholdAlerts[0] ?? storagePrimaryAlert;
  const primaryAlertLabel =
    serviceThresholdAlerts[0]?.serviceLabel ?? storagePrimaryAlert?.label ?? null;

  const summary = [
    `Risque global du mois: ${getGovernanceRiskLabel(governanceRiskScore)} (${formatScorePercent(governanceRiskScore)}).`,
    topService
      ? `Service le plus exposé: ${topService.label} (${formatNumber(topService.monthlyKgCo2eProxy ?? 0, 2)} kg CO2e proxy / mois).`
      : "Service le plus exposé: aucune donnée de service disponible.",
    storageTopContribution
      ? `Catégorie métier la plus coûteuse: ${storageTopContribution.label} (${formatStorageBytes(storageTopContribution.currentBytes)}, ${formatNumber(storageTopContribution.currentSharePercent, 1)}% du total).`
      : "Catégorie métier la plus coûteuse: aucune donnée de contribution disponible.",
    primaryAlert
      ? `Alerte principale: [${primaryAlert.severity}] ${primaryAlertLabel} — ${primaryAlert.title}.`
      : "Alerte principale: aucune alerte de seuil active.",
    governanceRiskScore >= GOVERNANCE_RISK_BANNER_THRESHOLD
      ? `Bandeau rouge de gouvernance: seuil ${formatScorePercent(GOVERNANCE_RISK_BANNER_THRESHOLD)} dépassé.`
      : "Bandeau rouge de gouvernance: non déclenché.",
  ];

  const notes = [
    "Le rapport mensuel agrège les signaux déjà persistés dans le projet.",
    "Le PDF public et l'archive interne partagent la même source de vérité mensuelle.",
    "Les dérives sont calculées versus le snapshot précédent quand il existe.",
  ];

  return {
    generatedAt,
    reportMonth,
    reportMonthLabel,
    summary,
    impact: {
      monthlyKgCo2eProxy: normalizeNumber(
        params.environmentalImpact.model.infrastructure.monthlyKgCo2eProxy,
      ),
      confidencePercent: normalizeNumber(
        params.environmentalImpact.model.infrastructure.confidencePercent,
      ),
      snapshotCount: params.environmentalImpact.snapshots.length,
      latestSnapshotDate: params.environmentalImpact.snapshots[0]?.snapshotDate ?? null,
      topServiceLabel: topService?.label ?? null,
      topServiceMonthlyKgCo2eProxy: normalizeNumber(topService?.monthlyKgCo2eProxy ?? null),
      topServiceDeltaKgCo2eProxy: impactGrowthHighlights[0]?.deltaKgCo2eProxy ?? null,
      serviceBreakdown: serviceEvolutionBreakdown,
      growthHighlights: impactGrowthHighlights,
    },
    storage: {
      quotaBytes: params.storageUsage.current.quotaBytes,
      quotaLabel: params.storageUsage.current.quotaLabel,
      totalBytes: params.storageUsage.current.totalBytes,
      totalLabel: params.storageUsage.current.totalLabel,
      remainingBytes: params.storageUsage.current.remainingBytes,
      remainingLabel: params.storageUsage.current.remainingLabel,
      usagePercent: params.storageUsage.current.usagePercent,
      objectCount: params.storageUsage.current.objectCount,
      snapshotCount: params.storageUsage.history.length,
      latestSnapshotMonth: params.storageUsage.current.snapshotMonth,
      deltaBytes: params.storageUsage.comparison.deltaBytes,
      deltaPercent: params.storageUsage.comparison.deltaPercent,
      topBucketLabel: storageTopBucket?.label ?? null,
      topBucketBytes: storageTopBucket?.bytes ?? 0,
      topExtensionLabel: storageTopExtension?.label ?? null,
      topExtensionBytes: storageTopExtension?.bytes ?? 0,
      growthHighlights: storageGrowthHighlights,
      topContributionLabel: storageTopContribution?.label ?? null,
      topContributionBytes: storageTopContribution?.currentBytes ?? 0,
      topContributionSharePercent: storageTopContribution?.currentSharePercent ?? 0,
      topContributionDeltaBytes: storageTopContribution?.deltaBytes ?? 0,
      topContributionDeltaPercent: storageTopContribution?.deltaPercent ?? null,
      fastestGrowingLabel: storageFastestGrowingContribution?.label ?? null,
      fastestGrowingBytes: storageFastestGrowingContribution?.currentBytes ?? 0,
      fastestGrowingDeltaBytes: storageFastestGrowingContribution?.deltaBytes ?? 0,
      fastestGrowingDeltaPercent: storageFastestGrowingContribution?.deltaPercent ?? null,
      businessContributions: params.storageUsage.businessContributions,
      contributionHighlights: storageContributionHighlights,
    },
    serviceThresholdAlerts,
    projectSignals,
    notes,
  };
}
