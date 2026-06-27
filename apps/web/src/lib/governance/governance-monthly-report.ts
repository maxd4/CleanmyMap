import { Buffer } from "node:buffer";
import { buildSimplePdf } from "@/lib/pdf-export/simple-pdf";
import { buildDeliverableHeaders } from "@/lib/reports/http";
import type { EnvironmentalImpactCaptureResult } from "@/lib/environmental-impact-estimator/dashboard-capture";
import { buildServiceThresholdAlerts } from "@/lib/environmental-impact-estimator/service-risk";
import type { StorageUsageReport } from "@/lib/supabase/storage-usage-service";
import { formatStorageBytes } from "@/lib/supabase/storage-usage";
import { buildStorageBusinessMetadata } from "@/lib/supabase/storage-business-classification";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildGovernanceMethodologyLinks,
} from "./governance-links";
import {
  buildBusinessBlockByIds,
  buildStorageContributionHighlights,
  getFastestGrowingContribution,
} from "./governance-monthly-report-business";
import {
  GOVERNANCE_MONTHLY_REPORT_KEY,
  listGovernanceMonthlyReports,
  upsertGovernanceMonthlyReport,
  type GovernanceMonthlyReportPayload,
  type GovernanceMonthlyReportRecord,
} from "./governance-monthly-report-store";

export const GOVERNANCE_MONTHLY_REPORT_VERSION = "governance-monthly-report-2026.05-v1";
const GOVERNANCE_MONTHLY_REPORT_PDF_BUCKET = "reports";
const GOVERNANCE_RISK_BANNER_THRESHOLD = 70;

function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatNumber(value: number | null, maximumFractionDigits = 2): string {
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

function buildGovernanceMonthlyReportPdfPath(reportMonth: string): string {
  return `governance-monthly/${buildGovernanceMonthlyReportFilename(reportMonth)}`;
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

function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 2)} kg`;
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

function buildMonthlyStorageSummaryLines(
  payload: GovernanceMonthlyReportPayload,
): string[] {
  const items = payload.storage.businessContributions.items.slice(0, 5);

  return items.length > 0
    ? items.map(
        (item) =>
          `- ${item.label}: ${formatStorageBytes(item.currentBytes)} (${formatNumber(item.currentSharePercent, 1)}% du total, ${item.currentCount} fichier${item.currentCount > 1 ? "s" : ""})`,
      )
    : ["- Aucune donnée métier disponible."];
}

function buildBusinessContributionChartBlock(
  report: GovernanceMonthlyReportPayload["storage"]["businessContributions"],
): string[] {
  const items = report.items
    .slice()
    .sort((left, right) => right.currentBytes - left.currentBytes);

  if (items.length === 0) {
    return ["- Aucune donnée métier disponible pour le camembert."];
  }

  const totalBytes = items.reduce((sum, item) => sum + item.currentBytes, 0);
  const totalPreviousBytes = items.reduce((sum, item) => sum + item.previousBytes, 0);

  return [
    "@@CMBR_START|stockage|Répartition métier du stockage",
    `@@CMBR_META|${report.previousSnapshotMonth ?? ""}|${totalBytes}|${totalPreviousBytes}|${items.length}`,
    ...items.map(
      (item, index) =>
        `@@CMBR_ITEM|${index}|${item.id}|${item.label}|${item.currentBytes}|${item.currentSharePercent.toFixed(1)}|${item.previousBytes}|${item.deltaBytes}|${item.deltaPercent === null ? "na" : item.deltaPercent.toFixed(1)}|${item.currentCount}`,
    ),
    "@@CMBR_END",
  ];
}

function buildMonthlyDriftLines(payload: GovernanceMonthlyReportPayload): string[] {
  const storageGrowthLines =
    payload.storage.growthHighlights.length > 0
      ? payload.storage.growthHighlights.map(
          (item) =>
            `- Stockage ${item.label}: ${formatStorageBytes(item.previousBytes)} -> ${formatStorageBytes(item.currentBytes)} (${item.deltaBytes > 0 ? "+" : ""}${formatStorageBytes(item.deltaBytes)})`,
        )
      : ["- Aucun glissement du stockage n'a été détecté."];

  const impactGrowthLines =
    payload.impact.growthHighlights.length > 0
      ? payload.impact.growthHighlights.map(
          (item) =>
            `- Service ${item.label}: ${formatNumber(item.previousKgCo2eProxy, 2)} kg -> ${formatNumber(item.currentKgCo2eProxy, 2)} kg (${formatDelta(item.deltaKgCo2eProxy)})`,
        )
      : ["- Aucune hausse de service significative n'a été détectée."];

  return [
    "### Stockage",
    ...storageGrowthLines,
    "",
    "### Services",
    ...impactGrowthLines,
  ];
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

function computeGovernanceRiskScore(params: {
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

function getGovernanceRiskLabel(score: number): string {
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

function buildThresholdBreachLines(
  storageAlerts: Array<{
    label: string;
    severity: string;
    title: string;
    message: string;
    signal: string;
  }>,
  serviceAlerts: Array<{
    serviceLabel: string;
    severity: string;
    title: string;
    signal: string;
    thresholdLabel: string;
    details: string;
    sinceLabel: string;
    recommendedAction: string;
  }>,
): string[] {
  const lines = [
    ...serviceAlerts.map(
      (alert) =>
        `- [${alert.severity}] ${alert.serviceLabel} (${alert.signal}): ${alert.title} — ${alert.thresholdLabel}; ${alert.details}; depuis ${alert.sinceLabel}. Action recommandée: ${alert.recommendedAction}`,
    ),
    ...storageAlerts.map(
      (alert) => `- [${alert.severity}] ${alert.label} (${alert.signal}): ${alert.title} — ${alert.message}`,
    ),
  ];

  if (lines.length === 0) {
    return ["- Aucun franchissement de seuil n'a été détecté ce mois-ci."];
  }

  return lines.slice(0, 6);
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
    `Risque global du mois: ${getGovernanceRiskLabel(governanceRiskScore)} (${governanceRiskScore}/100).`,
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
      ? `Bandeau rouge de gouvernance: seuil ${GOVERNANCE_RISK_BANNER_THRESHOLD}/100 dépassé.`
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
      latestSnapshotDate:
        params.environmentalImpact.snapshots[0]?.snapshotDate ?? null,
      topServiceLabel: topService?.label ?? null,
      topServiceMonthlyKgCo2eProxy: normalizeNumber(topService?.monthlyKgCo2eProxy ?? null),
      topServiceDeltaKgCo2eProxy:
        impactGrowthHighlights[0]?.deltaKgCo2eProxy ?? null,
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

export function buildGovernanceMonthlyReportLines(
  record: GovernanceMonthlyReportRecord,
  recentReports: GovernanceMonthlyReportRecord[] = [],
): string[] {
  const { payload } = record;
  const sectionBreak = "\f";
  const businessItems = payload.storage.businessContributions.items;
  const governanceRiskScore = computeGovernanceRiskScore({
    usagePercent: payload.storage.usagePercent,
    alerts: [...payload.storage.businessContributions.alerts, ...payload.serviceThresholdAlerts].map(
      (alert) => ({ severity: alert.severity }),
    ),
  });
  const primaryAlert =
    payload.serviceThresholdAlerts[0] ?? payload.storage.businessContributions.alerts[0] ?? null;
  const primaryAlertLabel =
    payload.serviceThresholdAlerts[0]?.serviceLabel ??
    payload.storage.businessContributions.alerts[0]?.label ??
    null;
  const coverReports = recentReports
    .slice()
    .sort((left, right) => right.reportMonth.localeCompare(left.reportMonth))
    .slice(0, 3);

  const coverHistoryLines = coverReports.length
    ? coverReports.map((item) => {
        const reportPayload = item.payload;
        const impact = formatNumber(reportPayload.impact.monthlyKgCo2eProxy, 2);
        const storage = `${reportPayload.storage.totalLabel} / ${reportPayload.storage.quotaLabel}`;
        const leader = reportPayload.impact.topServiceLabel ?? "n/a";
        return `- ${reportPayload.reportMonthLabel}: impact ${impact} kg, stockage ${storage}, service ${leader}.`;
      })
    : ["- Aucun historique mensuel n'est encore disponible."];

  const coverSummaryLines = [
    `- Risque global du mois: ${getGovernanceRiskLabel(governanceRiskScore)} (${governanceRiskScore}/100).`,
    governanceRiskScore >= GOVERNANCE_RISK_BANNER_THRESHOLD
      ? `- Bandeau rouge de gouvernance: seuil ${GOVERNANCE_RISK_BANNER_THRESHOLD}/100 dépassé.`
      : "- Bandeau rouge de gouvernance: non déclenché.",
    payload.impact.topServiceLabel
      ? `- Service le plus exposé: ${payload.impact.topServiceLabel} (${formatNumber(payload.impact.topServiceMonthlyKgCo2eProxy, 2)} kg CO2e proxy / mois).`
      : "- Service le plus exposé: aucune donnée de service disponible.",
    payload.storage.topContributionLabel
      ? `- Catégorie métier dominante: ${payload.storage.topContributionLabel} (${formatStorageBytes(payload.storage.topContributionBytes)}, ${formatNumber(payload.storage.topContributionSharePercent, 1)}% du total).`
      : "- Catégorie métier dominante: aucune donnée de contribution disponible.",
    primaryAlert
      ? `- Alerte principale: [${primaryAlert.severity}] ${primaryAlertLabel} — ${primaryAlert.title}.`
      : "- Alerte principale: aucune alerte de seuil active.",
    `- Quota restant: ${payload.storage.remainingLabel}.`,
    `- Historique métier suivi: ${payload.storage.businessContributions.historyMonths.length} mois.`,
  ];

  const storageGlobalLines = [
    "## Stockage global",
    `- Utilisé: ${payload.storage.totalLabel} sur ${payload.storage.quotaLabel}.`,
    `- Restant: ${payload.storage.remainingLabel}.`,
    `- Tension quota: ${formatNumber(payload.storage.usagePercent, 1)}%.`,
    `- Objets suivis: ${payload.storage.objectCount}.`,
    payload.storage.snapshotCount > 0
      ? `- Snapshots consolidés: ${payload.storage.snapshotCount}.`
      : "- Snapshots consolidés: aucun historique mensuel.",
  ];

  const storageBusinessSummaryLines = [
    "## Découpage métier",
    ...buildMonthlyStorageSummaryLines(payload),
    "",
    "### Indicateurs métier",
    ...payload.storage.contributionHighlights.slice(0, 4),
  ];

  const businessChartLines = [
    "## Camembert mensuel",
    "Bloc vectoriel de la répartition métier du stockage sur le mois courant.",
    ...buildBusinessContributionChartBlock(payload.storage.businessContributions),
  ];

  const monthlyDriftLines = [
    "## Dérive mensuelle",
    ...buildMonthlyDriftLines(payload),
  ];

  const methodologySectionLines = [
    "## Méthodologie et liens",
    ...buildGovernanceMethodologyLinks(payload.reportMonth).map(
      (item) => `- ${item.label}: ${item.href}`,
    ),
  ];

  const pilotagePageLines = [
    "## Lecture pilotage",
    "### Évolution par service",
    ...(payload.impact.serviceBreakdown.length > 0
      ? payload.impact.serviceBreakdown.map(
          (service) =>
            `- ${service.label}: ${formatNumber(service.previousKgCo2eProxy, 2)} kg -> ${formatNumber(service.currentKgCo2eProxy, 2)} kg (${formatDelta(service.deltaKgCo2eProxy)})`,
        )
      : ["- Aucune évolution de service disponible."]),
    "",
    "### Franchissements de seuils",
    ...buildThresholdBreachLines(payload.storage.businessContributions.alerts, payload.serviceThresholdAlerts),
    "",
    "### Top 3 hausses",
    ...(payload.impact.growthHighlights.length > 0
      ? payload.impact.growthHighlights.map(
          (item) =>
            `- ${item.label}: ${formatNumber(item.previousKgCo2eProxy, 2)} kg -> ${formatNumber(item.currentKgCo2eProxy, 2)} kg (${formatDelta(item.deltaKgCo2eProxy)})`,
        )
      : ["- Aucune hausse significative n'a été détectée."]),
  ];

  const soclePageLines = buildBusinessBlockByIds(
    "## Socle d’estimateur d’impact environnemental",
    businessItems,
    ["socle_estimateur_impact"],
    "Ce bloc suit les exports, rapports et livrables du socle d’estimation.",
  );

  const communicationsPageLines = buildBusinessBlockByIds(
    "## Communications: emails, messages, pièces jointes",
    businessItems,
    ["emails", "messages", "pieces_jointes_document", "pieces_jointes_photo"],
    "Ce bloc regroupe les courriels, les fils de discussion et les pièces jointes métier.",
  );

  const terrainPageLines = buildBusinessBlockByIds(
    "## Terrain: actions, photos, preuves",
    businessItems,
    ["actions_terrain", "pieces_jointes_photo", "pieces_jointes_document"],
    "Ce bloc regroupe les actions terrain, les médias de preuve et les livrables associés.",
  );

  const userPageLines = buildBusinessBlockByIds(
    "## Compte utilisateur",
    businessItems,
    ["donnees_utilisateur"],
    "Ce bloc suit les profils, avatars et pièces rattachées aux comptes.",
  );

  const gamificationPageLines = buildBusinessBlockByIds(
    "## Gamification",
    businessItems,
    ["badges_gamification"],
    "Ce bloc suit les badges, récompenses et actifs de progression.",
  );

  return [
    "# Rapport mensuel de gouvernance CleanMyMap",
    "",
    "## Couverture",
    ...coverSummaryLines,
    governanceRiskScore >= GOVERNANCE_RISK_BANNER_THRESHOLD
      ? `!! Bandeau rouge de gouvernance: ${getGovernanceRiskLabel(governanceRiskScore)} (${governanceRiskScore}/100) - seuil ${GOVERNANCE_RISK_BANNER_THRESHOLD}/100 dépassé.`
      : "",
    "",
    "### Historique de couverture",
    ...coverHistoryLines,
    "",
    `Periode: ${payload.reportMonthLabel}`,
    `Genere le: ${new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(payload.generatedAt))}`,
    "",
    sectionBreak,
    ...storageGlobalLines,
    sectionBreak,
    ...storageBusinessSummaryLines,
    sectionBreak,
    ...businessChartLines,
    sectionBreak,
    ...monthlyDriftLines,
    sectionBreak,
    ...pilotagePageLines,
    sectionBreak,
    ...soclePageLines,
    sectionBreak,
    ...communicationsPageLines,
    sectionBreak,
    ...terrainPageLines,
    sectionBreak,
    ...userPageLines,
    sectionBreak,
    ...gamificationPageLines,
    "",
    "## Alertes de gouvernance",
    ...buildThresholdBreachLines(payload.storage.businessContributions.alerts, payload.serviceThresholdAlerts),
    "",
    sectionBreak,
    ...methodologySectionLines,
    "",
    "## Notes de gouvernance",
    ...payload.notes.map((line) => `- ${line}`),
  ].filter((line) => line.length > 0);
}

export function buildGovernanceMonthlyReportFilename(reportMonth: string): string {
  return `rapport_gouvernance_mensuel_${reportMonth.slice(0, 7)}.pdf`;
}

export function buildGovernanceMonthlyReportDownloadHeaders(record: GovernanceMonthlyReportRecord) {
  return buildDeliverableHeaders({
    rubrique: "rapport_gouvernance_mensuel",
    extension: "pdf",
    contentType: "application/pdf",
    date: new Date(record.reportMonth),
  });
}

async function bestEffort<T>(fallback: T, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

async function persistGovernanceMonthlyReportPdf(record: GovernanceMonthlyReportRecord): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const recentReports = await listGovernanceMonthlyReports(3);
  const pdfBytes = buildSimplePdf(buildGovernanceMonthlyReportLines(record, recentReports));
  const pdfPath = buildGovernanceMonthlyReportPdfPath(record.reportMonth);
  const pdfBlob = new Blob([Buffer.from(pdfBytes)], { type: "application/pdf" });
  const { error } = await supabase.storage.from(GOVERNANCE_MONTHLY_REPORT_PDF_BUCKET).upload(
    pdfPath,
    pdfBlob,
    {
      upsert: true,
      cacheControl: "3600",
      metadata: buildStorageBusinessMetadata({
        businessDomain: "socle_estimateur_impact",
        sourceTable: "governance_monthly_reports",
        businessContext: "governance_report",
        extra: {
          reportMonth: record.reportMonth,
          version: record.version,
        },
      }),
    },
  );

  return error ? null : pdfPath;
}

export async function captureGovernanceMonthlyReport(params: {
  environmentalImpact: EnvironmentalImpactCaptureResult;
  storageUsage: StorageUsageReport;
  generatedAt?: string;
}): Promise<GovernanceMonthlyReportRecord> {
  const payload = buildGovernanceMonthlyReportPayload(params);
  const record: GovernanceMonthlyReportRecord = {
    id: `governance-${payload.reportMonth}`,
    reportKey: GOVERNANCE_MONTHLY_REPORT_KEY,
    reportMonth: payload.reportMonth,
    generatedAt: payload.generatedAt,
    version: GOVERNANCE_MONTHLY_REPORT_VERSION,
    title: "Rapport mensuel de gouvernance",
    payload,
  };

  await upsertGovernanceMonthlyReport(record);

  const pdfStoragePath = await bestEffort<string | null>(null, () =>
    persistGovernanceMonthlyReportPdf(record),
  );

  if (!pdfStoragePath) {
    return record;
  }

  const recordWithAsset: GovernanceMonthlyReportRecord = {
    ...record,
    payload: {
      ...record.payload,
      artifacts: {
        pdfStoragePath,
        pdfGeneratedAt: record.generatedAt,
      },
    },
  };

  await upsertGovernanceMonthlyReport(recordWithAsset);
  return recordWithAsset;
}

export { listGovernanceMonthlyReports, loadGovernanceMonthlyReport } from "./governance-monthly-report-store";
