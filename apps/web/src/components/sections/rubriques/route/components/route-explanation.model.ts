import type {
  RouteTraceExclusionReason,
  RouteRecommendationTrace,
  RouteTraceSelectedStop,
} from "@/lib/route/route-trace";
import type { RouteResponse } from "@/lib/route/route-response-contract";
import { formatScorePercent } from "@/lib/formatters/score";

export type RouteExplanationData = RouteResponse;

export type RouteExplanationProps = {
  data: RouteExplanationData;
  fr: boolean;
};

export type DisplayedRouteSelection = {
  selection: RouteTraceSelectedStop;
  groupIndex: number | null;
};

export type DisplayedRouteSelectionGroup = {
  groupIndex: number | null;
  selections: DisplayedRouteSelection[];
};

export type RouteMetricProvenance = "network" | "mixed" | "fallback";

/**
 * Uses final per-group stops when the multi-route trace carries them, while
 * keeping the global trace as the compatibility source for older responses.
 * Guided waypoints and candidate IDs are deliberately not selections.
 */
export function getDisplayedRouteSelections(
  trace: RouteRecommendationTrace,
): DisplayedRouteSelection[] {
  const groups = trace.multiRoute?.groups;
  if (groups && groups.length > 0 && groups.every((group) => Array.isArray(group.selectedStops))) {
    return groups.flatMap((group) =>
      group.selectedStops.map((selection) => ({ selection, groupIndex: group.groupIndex })),
    );
  }

  return trace.selectedStops.map((selection) => ({ selection, groupIndex: null }));
}

export function getDisplayedRouteSelectionGroups(
  selections: DisplayedRouteSelection[],
): DisplayedRouteSelectionGroup[] {
  const groups: DisplayedRouteSelectionGroup[] = [];
  for (const displayedSelection of selections) {
    const existing = groups.find(({ groupIndex }) => groupIndex === displayedSelection.groupIndex);
    if (existing) {
      existing.selections.push(displayedSelection);
      continue;
    }
    groups.push({
      groupIndex: displayedSelection.groupIndex,
      selections: [displayedSelection],
    });
  }
  return groups;
}

export function getRouteMetricProvenance(
  data: RouteExplanationData,
): RouteMetricProvenance {
  const traceGroupModes = data.trace.multiRoute?.groups
    .map((group) => group.routeMode)
    .filter((mode): mode is "network" | "fallback" => mode === "network" || mode === "fallback");
  const responseGroupRoutes = Array.isArray(data.groupRoutes) ? data.groupRoutes : [];
  const groupModes = traceGroupModes && traceGroupModes.length > 0
    ? traceGroupModes
    : responseGroupRoutes.map((group) => group.routeGeometry.mode);
  const modes = groupModes.length > 0 ? groupModes : [data.trace.routing.mode];
  const hasNetwork = modes.includes("network");
  const hasFallback = modes.includes("fallback");
  return hasNetwork && hasFallback ? "mixed" : hasNetwork ? "network" : "fallback";
}

export function routeMetricProvenanceLabel(
  provenance: RouteMetricProvenance,
  fr: boolean,
): string {
  if (provenance === "network") return fr ? "Réseau intégral" : "Full network routing";
  if (provenance === "mixed") return fr ? "Routage mixte : réseau + estimation" : "Mixed routing: network + estimate";
  return fr ? "Estimation / fallback" : "Estimate / fallback";
}

export function routeMetricMeasurementLabel(
  provenance: RouteMetricProvenance,
): string {
  if (provenance === "network") return "mesure réseau";
  if (provenance === "mixed") return "mesure partielle";
  return "estimé";
}

export const exclusionLabels: Record<RouteTraceExclusionReason, string> = {
  not_admissible: "non admissible",
  unsafe_trained_only: "réservé à un bénévole formé",
  unsafe_no_pickup: "ramassage non autorisé",
  unsafe_missing_categories: "catégories de déchets absentes",
  unsafe_unknown_categories: "catégories de déchets inconnues",
  travel_budget: "hors budget de déplacement",
  source_unavailable: "source indisponible",
};

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value);
}

export function formatDistance(value: number | null): string {
  return value === null ? "Inconnue" : `${formatNumber(value)} km`;
}

export function formatDuration(value: number | null): string {
  return value === null ? "Inconnue" : `${formatNumber(value)} min`;
}

export function riskLabel(value: number): string {
  return formatScorePercent(value);
}

export type RouteEventTemporalStatus = "past" | "today" | "future";

export function routeEventStatusLabel(
  status: RouteEventTemporalStatus,
  fr = true,
): string {
  if (status === "past") return fr ? "Passé" : "Past";
  if (status === "today") return fr ? "Aujourd’hui" : "Today";
  return fr ? "À venir" : "Upcoming";
}

export function stopLabel(
  stopId: string,
  data: RouteExplanationData,
  originLabel: string,
): string {
  if (stopId === "origin") return originLabel;
  return data.stops.find((stop) => stop.id === stopId)?.label ?? stopId;
}

export type PredictedRouteEvidence = Extract<
  NonNullable<RouteTraceSelectedStop["evidence"]>,
  { family: "predicted" }
>;
