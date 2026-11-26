import type { PilotageComparisonResult } from "./metrics";
import type { OperationalPriority } from "./prioritization";
import type { DecisionSummary } from "./overview.types";
import { formatSigned } from "./overview.utils";
import { ADMIN_ROUTE, DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";
import { formatScorePercent } from "@/lib/formatters/score";

export function pickDecisionRecommendation(comparison: PilotageComparisonResult): {
  href: string;
  label: string;
  reason: string;
} {
  const qualityComparable =
    comparison.current.approvedActions > 0 && comparison.previous.approvedActions > 0;
  const qualityRisk =
    qualityComparable && comparison.metrics.qualityScore.interpretation === "negative"
      ? Math.abs(comparison.metrics.qualityScore.deltaPercent ?? comparison.metrics.qualityScore.deltaAbsolute)
      : 0;
  const coverageRisk =
    qualityComparable && comparison.metrics.coverageRate.interpretation === "negative"
      ? Math.abs(comparison.metrics.coverageRate.deltaPercent ?? comparison.metrics.coverageRate.deltaAbsolute)
      : 0;
  const moderationComparison = comparison.metrics.moderationDelayDays;
  const moderationRisk =
    moderationComparison?.interpretation === "negative"
      ? Math.abs(moderationComparison.deltaPercent ?? moderationComparison.deltaAbsolute)
      : 0;

  const ranked = [
    ...(moderationComparison
      ? [
          {
            risk: moderationRisk,
            href: ADMIN_ROUTE,
            label: "Traiter backlog moderation",
            reason: `Delai moderation en degradation (${moderationComparison.deltaAbsolute >= 0 ? "+" : ""}${moderationComparison.deltaAbsolute.toFixed(1)} j, ${comparison.current.moderationDelayDays?.toFixed(1)} j actuels).`,
          },
        ]
      : []),
    {
      risk: qualityRisk,
      href: "/actions/history",
      label: "Renforcer geo-tracabilite",
      reason: `Qualite data en baisse (${comparison.metrics.qualityScore.deltaAbsolute.toFixed(1)} pt, score actuel ${formatScorePercent(comparison.current.qualityScore, 1)}).`,
    },
    {
      risk: coverageRisk,
      href: "/actions/new",
      label: "Renforcer geo-couverture",
      reason: `Couverture geoloc en degradation (${comparison.metrics.coverageRate.deltaAbsolute.toFixed(1)} pt, couverture actuelle ${comparison.current.coverageRate.toFixed(1)}%).`,
    },
  ].sort((a, b) => b.risk - a.risk);

  const top = ranked[0];
  if (!top || top.risk <= 0) {
    return {
      href: DASHBOARD_ROUTE,
      label: "Maintenir le pilotage courant",
      reason:
        moderationComparison
          ? "Aucune degradation majeure detectee sur qualite, couverture ou moderation."
          : "Aucune degradation majeure detectee sur qualite ou couverture; moderation indisponible avec la source actuelle.",
    };
  }

  return {
    href: top.href,
    label: top.label,
    reason: top.reason,
  };
}

function formatWindowMass(window: PilotageComparisonResult["current"]): string {
  if (window.approvedActions === 0) return "Non renseigné (aucune action)";
  if (window.wasteKnownActions === 0) return "Non renseigné (0% renseigné)";
  return `${window.impactVolumeKg.toFixed(1)} kg (${window.wasteCoverageRate.toFixed(0)}% renseigné)`;
}

export function buildSummary(
  comparison: PilotageComparisonResult,
  priorities: OperationalPriority[],
): DecisionSummary {
  const wasteComparable =
    comparison.current.approvedActions > 0 &&
    comparison.previous.approvedActions > 0 &&
    comparison.current.wasteCoverageRate === 100 &&
    comparison.previous.wasteCoverageRate === 100;
  const iurCurrentAvailable =
    comparison.current.approvedActions > 0 && comparison.current.wasteCoverageRate === 100;
  const iurPreviousAvailable =
    comparison.previous.approvedActions > 0 && comparison.previous.wasteCoverageRate === 100;
  const iurComparable = iurCurrentAvailable && iurPreviousAvailable;
  const qualityCurrentAvailable = comparison.current.approvedActions > 0;
  const qualityPreviousAvailable = comparison.previous.approvedActions > 0;
  const qualityComparable = qualityCurrentAvailable && qualityPreviousAvailable;
  const topPriority = priorities.find(
    (priority) =>
      priority.id !== "admin-backlog" ||
      comparison.metrics.moderationDelayDays !== null,
  );
  const recommendedAction = pickDecisionRecommendation(comparison);

  return {
    kpis: [
      {
        id: "impact",
        label: "Impact terrain",
        value: formatWindowMass(comparison.current),
        previousValue: formatWindowMass(comparison.previous),
        deltaAbsolute: wasteComparable ? `${formatSigned(comparison.metrics.impactVolumeKg.deltaAbsolute)} kg` : "Non comparable",
        deltaPercent:
          wasteComparable && comparison.metrics.impactVolumeKg.deltaPercent !== null
            ? `${formatSigned(comparison.metrics.impactVolumeKg.deltaPercent)}%`
            : "Non comparable",
        interpretation: wasteComparable ? comparison.metrics.impactVolumeKg.interpretation : "neutral",
      },
      {
        id: "mobilization",
        label: "IUR (Sobriété)",
        value: iurCurrentAvailable ? `${comparison.current.iurIndex.toFixed(2)}` : "Indisponible",
        previousValue: iurPreviousAvailable ? `${comparison.previous.iurIndex.toFixed(2)}` : "Indisponible",
        deltaAbsolute: iurComparable ? formatSigned(comparison.metrics.iurIndex.deltaAbsolute) : "Non comparable",
        deltaPercent:
          iurComparable && comparison.metrics.iurIndex.deltaPercent !== null
            ? `${formatSigned(comparison.metrics.iurIndex.deltaPercent)}%`
            : "Non comparable",
        interpretation: iurComparable ? comparison.metrics.iurIndex.interpretation : "neutral",
      },
      {
        id: "quality",
        label: "Qualite data",
        value: qualityCurrentAvailable ? formatScorePercent(comparison.current.qualityScore, 1) : "Indisponible",
        previousValue: qualityPreviousAvailable ? formatScorePercent(comparison.previous.qualityScore, 1) : "Indisponible",
        deltaAbsolute: qualityComparable ? formatSigned(comparison.metrics.qualityScore.deltaAbsolute) : "Non comparable",
        deltaPercent:
          qualityComparable && comparison.metrics.qualityScore.deltaPercent !== null
            ? `${formatSigned(comparison.metrics.qualityScore.deltaPercent)}%`
            : "Non comparable",
        interpretation: qualityComparable ? comparison.metrics.qualityScore.interpretation : "neutral",
      },
    ],
    alert: {
      severity: topPriority?.severity ?? "low",
      title: topPriority?.title ?? "Aucune alerte prioritaire",
      detail:
        topPriority?.reason ??
        "Le pilotage ne detecte pas d'urgence immediate sur la fenetre courante.",
    },
    recommendedAction,
  };
}
