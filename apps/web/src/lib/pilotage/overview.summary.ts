import type { PilotageComparisonResult } from "./metrics";
import type { OperationalPriority } from "./prioritization";
import type { DecisionSummary, PilotageDataAvailability } from "./overview.types";
import { formatSigned } from "./overview.utils";
import { ADMIN_ROUTE, DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";
import { formatScorePercent } from "@/lib/formatters/score";

function isCorpusIncomplete(dataAvailability?: PilotageDataAvailability): boolean {
  if (!dataAvailability) return false;
  return Boolean(
    dataAvailability.isTruncated ||
      dataAvailability.sourceHealth.partial ||
      dataAvailability.sourceHealth.failedSources.length > 0,
  );
}

export function pickDecisionRecommendation(
  comparison: PilotageComparisonResult,
  dataAvailability?: PilotageDataAvailability,
): {
  href: string;
  label: string;
  reason: string;
} {
  if (isCorpusIncomplete(dataAvailability)) {
    const actionsFailed = Boolean(
      dataAvailability?.sourceHealth.failedSources.includes("actions"),
    );
    return {
      href: DASHBOARD_ROUTE,
      label: "Verifier la disponibilite des donnees",
      reason: actionsFailed
        ? "La source des actions est indisponible ; aucune recommandation comparative ne peut etre emise."
        : "Le corpus est tronque ou partiel ; les variations entre periodes ne sont pas comparables.",
    };
  }

  const qualityComparable =
    comparison.current.approvedActions > 0 && comparison.previous.approvedActions > 0;
  const qualityRisk =
    qualityComparable &&
    comparison.metrics.qualityScore.interpretation === "negative" &&
    comparison.metrics.qualityScore.deltaPercent !== null
      ? Math.abs(comparison.metrics.qualityScore.deltaPercent)
      : 0;
  const coverageRisk =
    qualityComparable &&
    comparison.metrics.coverageRate.interpretation === "negative" &&
    comparison.metrics.coverageRate.deltaPercent !== null
      ? Math.abs(comparison.metrics.coverageRate.deltaPercent)
      : 0;
  const moderationComparison = comparison.metrics.moderationDelayDays;
  const moderationRisk =
    moderationComparison?.interpretation === "negative" &&
    moderationComparison.deltaPercent !== null
      ? Math.abs(moderationComparison.deltaPercent)
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
  dataAvailability?: PilotageDataAvailability,
): DecisionSummary {
  const actionsUnavailable = Boolean(
    dataAvailability?.sourceHealth.failedSources.includes("actions"),
  );
  const corpusIncomplete = isCorpusIncomplete(dataAvailability);
  const currentWasteComplete =
    !actionsUnavailable &&
    comparison.current.approvedActions > 0 &&
    comparison.current.wasteKnownActions === comparison.current.approvedActions;
  const previousWasteComplete =
    !actionsUnavailable &&
    comparison.previous.approvedActions > 0 &&
    comparison.previous.wasteKnownActions === comparison.previous.approvedActions;
  const wasteComparable =
    !corpusIncomplete && currentWasteComplete && previousWasteComplete;
  const iurCurrentAvailable = currentWasteComplete;
  const iurPreviousAvailable = previousWasteComplete;
  const iurComparable =
    !corpusIncomplete && iurCurrentAvailable && iurPreviousAvailable;
  const qualityCurrentAvailable =
    !actionsUnavailable && comparison.current.approvedActions > 0;
  const qualityPreviousAvailable =
    !actionsUnavailable && comparison.previous.approvedActions > 0;
  const qualityComparable =
    !corpusIncomplete && qualityCurrentAvailable && qualityPreviousAvailable;
  const unavailableDeltaLabel = actionsUnavailable ? "Indisponible" : "Non comparable";
  const topPriority = priorities.find(
    (priority) =>
      priority.id !== "admin-backlog" ||
      comparison.metrics.moderationDelayDays !== null,
  );
  const recommendedAction = pickDecisionRecommendation(comparison, dataAvailability);

  return {
    kpis: [
      {
        id: "impact",
        label: "Impact terrain",
        value: actionsUnavailable ? "Indisponible" : formatWindowMass(comparison.current),
        previousValue: actionsUnavailable ? "Indisponible" : formatWindowMass(comparison.previous),
        deltaAbsolute: wasteComparable ? `${formatSigned(comparison.metrics.impactVolumeKg.deltaAbsolute)} kg` : unavailableDeltaLabel,
        deltaPercent:
          wasteComparable && comparison.metrics.impactVolumeKg.deltaPercent !== null
            ? `${formatSigned(comparison.metrics.impactVolumeKg.deltaPercent)}%`
            : unavailableDeltaLabel,
        interpretation: wasteComparable ? comparison.metrics.impactVolumeKg.interpretation : "neutral",
      },
      {
        id: "mobilization",
        label: "IUR (Sobriété)",
        value: iurCurrentAvailable ? `${comparison.current.iurIndex.toFixed(2)}` : "Indisponible",
        previousValue: iurPreviousAvailable ? `${comparison.previous.iurIndex.toFixed(2)}` : "Indisponible",
        deltaAbsolute: iurComparable ? formatSigned(comparison.metrics.iurIndex.deltaAbsolute) : unavailableDeltaLabel,
        deltaPercent:
          iurComparable && comparison.metrics.iurIndex.deltaPercent !== null
            ? `${formatSigned(comparison.metrics.iurIndex.deltaPercent)}%`
            : unavailableDeltaLabel,
        interpretation: iurComparable ? comparison.metrics.iurIndex.interpretation : "neutral",
      },
      {
        id: "quality",
        label: "Qualite data",
        value: qualityCurrentAvailable ? formatScorePercent(comparison.current.qualityScore, 1) : "Indisponible",
        previousValue: qualityPreviousAvailable ? formatScorePercent(comparison.previous.qualityScore, 1) : "Indisponible",
        deltaAbsolute: qualityComparable ? formatSigned(comparison.metrics.qualityScore.deltaAbsolute) : unavailableDeltaLabel,
        deltaPercent:
          qualityComparable && comparison.metrics.qualityScore.deltaPercent !== null
            ? `${formatSigned(comparison.metrics.qualityScore.deltaPercent)}%`
            : unavailableDeltaLabel,
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
