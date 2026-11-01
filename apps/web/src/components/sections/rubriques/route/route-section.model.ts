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

type GuidedRouteGeometryAvailability = "network" | "fallback" | null;

function guidedRouteGeometryAvailability(
  data: RouteResponse,
): GuidedRouteGeometryAvailability {
  if (
    data.planningMode.type !== "territorial-guided" ||
    data.groupRoutes.length === 0 ||
    data.groupRoutes.length !== data.groupCount
  ) {
    return null;
  }

  const geometriesAreUsable = data.groupRoutes.every(({ routeGeometry }) =>
    routeGeometry.origin !== null &&
    routeGeometry.coordinates.length >= 2,
  );
  if (!geometriesAreUsable) return null;

  return data.groupRoutes.some(({ routeGeometry }) => routeGeometry.mode === "fallback")
    ? "fallback"
    : "network";
}

function buildRouteDataStatusMessage(
  data: RouteResponse | undefined,
  fr: boolean,
): string | null {
  if (!data) return null;
  if (data.status === "empty") {
    const guidedAvailability = guidedRouteGeometryAvailability(data);
    if (guidedAvailability === "network") {
      return fr
        ? "Aucune cible de pollution admissible n'est disponible, mais les itinéraires guidés planifiés par le réseau restent disponibles."
        : "No admissible pollution targets are available, but the network-planned guided routes remain available.";
    }
    if (guidedAvailability === "fallback") {
      return fr
        ? "Aucune cible de pollution admissible n'est disponible ; les itinéraires guidés planifiés restent disponibles, avec au moins un tracé estimé faute de routage réseau."
        : "No admissible pollution targets are available; the planned guided routes remain available, with at least one route estimated because network routing was unavailable.";
    }
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
