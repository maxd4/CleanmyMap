import { buildDeliverableHeaders } from "@/lib/reports/http";
import { formatScorePercent } from "@/lib/formatters/score";
import { formatStorageBytes } from "@/lib/supabase/storage-usage";
import { buildGovernanceMethodologyLinks } from "./governance-links";
import { buildBusinessBlockByIds } from "./governance-monthly-report-business";
import {
  computeGovernanceRiskScore,
  formatNumber,
  getGovernanceRiskLabel,
  GOVERNANCE_RISK_BANNER_THRESHOLD,
} from "./governance-monthly-report.model";
import type {
  GovernanceMonthlyReportPayload,
  GovernanceMonthlyReportRecord,
} from "./governance-monthly-report-store";

function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 2)} kg`;
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
    `- Risque global du mois: ${getGovernanceRiskLabel(governanceRiskScore)} (${formatScorePercent(governanceRiskScore)}).`,
    governanceRiskScore >= GOVERNANCE_RISK_BANNER_THRESHOLD
      ? `- Bandeau rouge de gouvernance: seuil ${formatScorePercent(GOVERNANCE_RISK_BANNER_THRESHOLD)} dépassé.`
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
      ? `!! Bandeau rouge de gouvernance: ${getGovernanceRiskLabel(governanceRiskScore)} (${formatScorePercent(governanceRiskScore)}) - seuil ${formatScorePercent(GOVERNANCE_RISK_BANNER_THRESHOLD)} dépassé.`
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
