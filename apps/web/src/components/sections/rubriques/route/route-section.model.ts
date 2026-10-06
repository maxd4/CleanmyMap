import type { RouteGeometry } from "@/lib/route/route-contract";
import type { RouteResponse, RouteGroupRoute } from "@/lib/route/route-response-contract";
import { formatBusinessDurationRangeMinutes } from "@/lib/actions/time-contract";

export const EMPTY_ROUTE_GEOMETRY: RouteGeometry = {
  isLoop: true,
  origin: null,
  returnLeg: null,
  coordinates: [],
  distanceKm: 0,
  durationMinutes: 0,
  legs: [],
  provider: "none",
  profile: null,
  mode: "fallback",
  estimated: true,
};

export type RouteSectionDerivedState = {
  groupRoutes: RouteGroupRoute[];
  visibleStops: RouteResponse["stops"];
  visibleGeometry: RouteGeometry;
  eventBudgetMinutes: number | null;
  actionBudgetMinutes: number | null;
  organizationMarginMinutes: number | null;
  actionDurationLabel: string;
  operationalTotalLabel: string;
  dataStatusMessage: string | null;
};

function buildRouteDataStatusMessage(
  data: RouteResponse | undefined,
  fr: boolean,
): string | null {
  if (!data) return null;
  if (data.status === "empty") {
    return fr
      ? "Aucune donnée géolocalisée exploitable n'est disponible pour cette recommandation."
      : "No usable geolocated data is available for this recommendation.";
  }
  if (data.status !== "degraded") return null;
  if (data.dataStatus === "unavailable") {
    return fr
      ? "Recommandation dégradée : la source de signalements est indisponible."
      : "Degraded recommendation: the report source is unavailable.";
  }
  if (data.routeGeometry.mode === "fallback") {
    return fr
      ? "Recommandation dégradée : l’itinéraire affiché est estimé."
      : "Degraded recommendation: the displayed route is estimated.";
  }
  return fr
    ? "Recommandation dégradée : les données disponibles ne sont pas exhaustives."
    : "Degraded recommendation: the available data is not exhaustive.";
}

export function deriveRouteSectionState(input: {
  data?: RouteResponse;
  picks: RouteResponse["stops"];
  selectedGroupIndex: number | null;
  fr: boolean;
  serviceMinutes: number | null;
  operationalTotalMinutes: number | null;
}): RouteSectionDerivedState {
  const { data, picks, selectedGroupIndex, fr, serviceMinutes, operationalTotalMinutes } = input;
  const groupRoutes = data?.groupRoutes ?? [];
  const selectedGroup = selectedGroupIndex === null
    ? null
    : groupRoutes.find(({ groupIndex }) => groupIndex === selectedGroupIndex) ?? null;
  return {
    groupRoutes,
    visibleStops: selectedGroup?.stops ?? picks,
    visibleGeometry: selectedGroup?.routeGeometry ?? data?.routeGeometry ?? EMPTY_ROUTE_GEOMETRY,
    eventBudgetMinutes: data?.eventBudgetMinutes ?? null,
    actionBudgetMinutes: data?.actionBudgetMinutes ?? null,
    organizationMarginMinutes: data?.organizationMarginMinutes ?? null,
    actionDurationLabel: formatBusinessDurationRangeMinutes(serviceMinutes),
    operationalTotalLabel: formatBusinessDurationRangeMinutes(operationalTotalMinutes),
    dataStatusMessage: buildRouteDataStatusMessage(data, fr),
  };
}
