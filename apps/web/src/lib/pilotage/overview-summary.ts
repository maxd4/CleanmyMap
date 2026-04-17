import type { PilotageComparisonResult } from "./metrics";
import type { OperationalPriority } from "./prioritization";
import type { DecisionSummary } from "./overview-types";
import { formatSigned } from "./overview-shared";

export function pickDecisionRecommendation(
  comparison: PilotageComparisonResult,
): {
  href: string;
  label: string;
  reason: string;
} {
  const qualityRisk =
    comparison.metrics.qualityScore.interpretation === "negative"
      ? Math.abs(comparison.metrics.qualityScore.deltaPercent)
      : 0;
  const coverageRisk =
    comparison.metrics.coverageRate.interpretation === "negative"
      ? Math.abs(comparison.metrics.coverageRate.deltaPercent)
      : 0;
  const moderationRisk =
    comparison.metrics.moderationDelayDays.interpretation === "negative"
      ? Math.abs(comparison.metrics.moderationDelayDays.deltaPercent)
      : 0;

  const ranked = [
    {
      key: "moderation" as const,
      risk: moderationRisk,
      href: "/admin",
      label: "Traiter backlog moderation",
      reason: `Delai moderation en degradation (${comparison.metrics.moderationDelayDays.deltaAbsolute >= 0 ? "+" : ""}${comparison.metrics.moderationDelayDays.deltaAbsolute.toFixed(1)} j, ${comparison.current.moderationDelayDays.toFixed(1)} j actuels).`,
    },
    {
      key: "quality" as const,
      risk: qualityRisk,
      href: "/actions/history",
      label: "Renforcer geo-tracabilite",
      reason: `Qualite data en baisse (${comparison.metrics.qualityScore.deltaAbsolute.toFixed(1)} pt, score actuel ${comparison.current.qualityScore.toFixed(1)}/100).`,
    },
    {
      key: "coverage" as const,
      risk: coverageRisk,
      href: "/actions/new",
      label: "Renforcer geo-couverture",
      reason: `Couverture geoloc en degradation (${comparison.metrics.coverageRate.deltaAbsolute.toFixed(1)} pt, couverture actuelle ${comparison.current.coverageRate.toFixed(1)}%).`,
    },
  ].sort((a, b) => b.risk - a.risk);

  const top = ranked[0];
  if (!top || top.risk <= 0) {
    return {
      href: "/dashboard",
      label: "Maintenir le pilotage courant",
      reason:
        "Aucune degradation majeure detectee sur qualite, couverture ou moderation.",
    };
  }

  return {
    href: top.href,
    label: top.label,
    reason: top.reason,
  };
}

export function buildSummary(
  comparison: PilotageComparisonResult,
  priorities: OperationalPriority[],
): DecisionSummary {
  const topPriority = priorities[0];
  const recommendedAction = pickDecisionRecommendation(comparison);

  return {
    kpis: [
      {
        id: "impact",
        label: "Impact terrain",
        value: `${comparison.current.impactVolumeKg.toFixed(1)} kg`,
        previousValue: `${comparison.previous.impactVolumeKg.toFixed(1)} kg`,
        deltaAbsolute: `${formatSigned(comparison.metrics.impactVolumeKg.deltaAbsolute)} kg`,
        deltaPercent: `${formatSigned(comparison.metrics.impactVolumeKg.deltaPercent)}%`,
        interpretation: comparison.metrics.impactVolumeKg.interpretation,
      },
      {
        id: "mobilization",
        label: "Mobilisation",
        value: `${comparison.current.mobilizationCount}`,
        previousValue: `${comparison.previous.mobilizationCount}`,
        deltaAbsolute: formatSigned(
          comparison.metrics.mobilizationCount.deltaAbsolute,
        ),
        deltaPercent: `${formatSigned(comparison.metrics.mobilizationCount.deltaPercent)}%`,
        interpretation: comparison.metrics.mobilizationCount.interpretation,
      },
      {
        id: "quality",
        label: "Qualite data",
        value: `${comparison.current.qualityScore.toFixed(1)}/100`,
        previousValue: `${comparison.previous.qualityScore.toFixed(1)}/100`,
        deltaAbsolute: formatSigned(
          comparison.metrics.qualityScore.deltaAbsolute,
        ),
        deltaPercent: `${formatSigned(comparison.metrics.qualityScore.deltaPercent)}%`,
        interpretation: comparison.metrics.qualityScore.interpretation,
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
