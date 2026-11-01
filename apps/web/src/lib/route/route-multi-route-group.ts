import { routePolylineThroughFossgisFoot } from "./fossgis-foot-routing";
import {
  applyOriginRouteGeometryLegs,
  type RouteGeometry,
  type RouteStop,
  type RouteTopology,
} from "./route-contract";
import {
  routeDistanceKm,
  travelMinutesForDistance,
  type PlannedRouteStop,
  type RoutePlannerCandidate,
  type RoutePlannerOrigin,
} from "./route-planner";
import type { RouteGroupAssignment } from "./route-group-partition";
import type {
  RouteGuidedBudget,
  RoutePlannedWaypoint,
} from "./route-planning-mode";
import type {
  RouteGuidedRoutingAudit,
  RouteGuidedSectorStatus,
  RouteGuidedSegment,
} from "./route-response-contract";
import { buildRouteCalibrationContext } from "./route-calibration";
import {
  buildRouteOperationalBudget,
  type RouteOperationalBudgetDependency,
} from "./route-operational-budget";
import { buildCleanupWorkload } from "./route-cleanup-workload";
import { collectionCoordinatesForSectorAudit } from "./route-guided-geometry-audit";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";

type Coordinate = [number, number];
type RoutePoint = { latitude: number; longitude: number };
const GUIDED_WAYPOINT_MATCH_RADIUS_KM = 0.1;

export type RouteGroupRoutingResult = {
  group: RouteGroupAssignment;
  finalCandidateIds: string[];
  routeGeometry: RouteGeometry;
  plannedStops: PlannedRouteStop[];
  providerCalls: number;
  firstProviderMode: RouteGeometry["mode"] | null;
  degraded: boolean;
  warning: string | null;
  budgetPrefixApplied: boolean;
  guidedSegments?: RouteGuidedSegment[];
  guidedRouting?: RouteGuidedRoutingAudit;
};

function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
}

function routeCoordinates(
  origin: RoutePlannerOrigin,
  points: readonly RoutePoint[],
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): Coordinate[] {
  return [
    [origin.latitude, origin.longitude],
    ...points.map(({ latitude, longitude }) => [latitude, longitude] as Coordinate),
    ...(topology === "loop"
      ? [[origin.latitude, origin.longitude] as Coordinate]
      : arrival
        ? [[arrival.latitude, arrival.longitude] as Coordinate]
        : []),
  ];
}

function fallbackGeometry(origin: RoutePlannerOrigin, points: readonly RoutePoint[], topology: RouteTopology, arrival?: RoutePlannerOrigin): RouteGeometry {
  const coordinates = routeCoordinates(origin, points, topology, arrival);
  if (coordinates.length < 2) coordinates.push([origin.latitude, origin.longitude]);
  const legs = coordinates.slice(1).map((point, index) => {
    const from = coordinates[index]!;
    const distanceKm = routeDistanceKm(
      { latitude: from[0], longitude: from[1] },
      { latitude: point[0], longitude: point[1] },
    );
    return {
      fromStopIndex: index,
      toStopIndex: index + 1,
      distanceKm: round(distanceKm, 2),
      estimatedMinutes: Math.max(0, Math.round(travelMinutesForDistance(distanceKm))),
    };
  });
  return {
    isLoop: topology === "loop",
    origin: coordinates[0] ?? null,
    returnLeg: topology === "loop" ? legs.at(-1) ?? null : null,
    coordinates,
    distanceKm: round(legs.reduce((total, leg) => total + leg.distanceKm, 0), 2),
    durationMinutes: legs.reduce((total, leg) => total + leg.estimatedMinutes, 0),
    legs,
    provider: "none",
    profile: null,
    mode: "fallback",
    estimated: true,
  };
}

function geometryMatchesGuidedPlan(
  origin: RoutePlannerOrigin,
  waypoints: readonly RoutePlannedWaypoint[],
  geometry: RouteGeometry,
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): boolean {
  const first = geometry.coordinates[0];
  const last = geometry.coordinates.at(-1);
  const routeOrigin = geometry.origin;
  const originDistance = first && last
    ? routeDistanceKm(origin, { latitude: first[0], longitude: first[1] })
    : Number.POSITIVE_INFINITY;
  if ((topology === "loop" && (!geometry.isLoop || geometry.returnLeg === null)) ||
    (topology === "open" && geometry.isLoop) || !routeOrigin || originDistance > 0.01 || routeDistanceKm(origin, {
      latitude: routeOrigin[0],
      longitude: routeOrigin[1],
    }) > 0.01) {
    return false;
  }
  if (arrival && topology === "open") {
    const last = geometry.coordinates.at(-1);
    if (!last || routeDistanceKm(arrival, { latitude: last[0], longitude: last[1] }) > 0.01) return false;
  }
  const expectedLegs = topology === "loop" || arrival ? waypoints.length + 1 : waypoints.length;
  if (geometry.legs.length !== expectedLegs) return false;
  if (geometry.legs.some((leg, index) =>
    leg.fromStopIndex !== index || leg.toStopIndex !== index + 1,
  )) return false;
  let coordinateIndex = 0;
  for (const waypoint of waypoints) {
    const matchIndex = geometry.coordinates.findIndex((coordinate, index) =>
      index >= coordinateIndex && routeDistanceKm(
        waypoint,
        { latitude: coordinate[0], longitude: coordinate[1] },
      ) <= GUIDED_WAYPOINT_MATCH_RADIUS_KM,
    );
    if (matchIndex < 0) return false;
    coordinateIndex = matchIndex + 1;
  }
  return true;
}

type GuidedSectorAudit = {
  deviationKm: number | null;
  status: RouteGuidedSectorStatus;
};

function unknownGuidedSectorAudit(): GuidedSectorAudit {
  return { deviationKm: null, status: "unknown" };
}

function guidedSectorDeviationKm(
  geometry: RouteGeometry,
  sector: RouteGroupAssignment["plannedSector"],
  waypoints: readonly RoutePlannedWaypoint[],
  routeVerified: boolean,
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): GuidedSectorAudit {
  if (!sector || !routeVerified) return unknownGuidedSectorAudit();
  // When both provider representations are verifiable, the audit returns both
  // collection polylines so neither admissible geometry can hide an excursion.
  const verifiedCollectionCoordinates = collectionCoordinatesForSectorAudit(geometry, waypoints, topology, arrival);
  if (!verifiedCollectionCoordinates || verifiedCollectionCoordinates.length === 0 || verifiedCollectionCoordinates.some((coordinate) =>
    coordinate.length !== 2 || !Number.isFinite(coordinate[0]) || !Number.isFinite(coordinate[1]),
  )) {
    return unknownGuidedSectorAudit();
  }

  const deviationKm = Math.max(0, ...verifiedCollectionCoordinates.map((coordinate) =>
    routeDistanceKm(
      sector.center,
      { latitude: coordinate[0], longitude: coordinate[1] },
    ) - sector.radiusKm,
  ));
  return {
    deviationKm,
    status: deviationKm <= 0.01 ? "within" : "outside",
  };
}

function buildGuidedSegments(
  geometry: RouteGeometry,
  waypoints: readonly RoutePlannedWaypoint[],
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): RouteGuidedSegment[] {
  const segmentCount = topology === "loop" || arrival ? waypoints.length + 1 : waypoints.length;
  return Array.from({ length: segmentCount }, (_, index) => {
    const leg = geometry.legs[index];
    const fromWaypoint = index === 0 ? null : waypoints[index - 1]!.id;
    const toWaypoint = index === waypoints.length ? null : waypoints[index]!.id;
    return {
      kind: index === 0 || index === waypoints.length ? "origin-link" : "collection",
      fromWaypointId: fromWaypoint,
      toWaypointId: toWaypoint,
      distanceKm: leg?.distanceKm ?? 0,
      estimatedMinutes: leg?.estimatedMinutes ?? 0,
      estimated: geometry.estimated,
    };
  });
}

function buildGuidedRoutingAudit(params: {
  geometry: RouteGeometry;
  origin: RoutePlannerOrigin;
  waypoints: readonly RoutePlannedWaypoint[];
  topology: RouteTopology;
  arrival?: RoutePlannerOrigin;
  sector?: RouteGroupAssignment["plannedSector"];
  budget: RouteGuidedBudget;
  warning: string | null;
}): { segments: RouteGuidedSegment[]; audit: RouteGuidedRoutingAudit } {
  const routeVerified = geometryMatchesGuidedPlan(params.origin, params.waypoints, params.geometry, params.topology, params.arrival);
  const loopVerified = params.topology === "loop" && routeVerified;
  const first = params.geometry.coordinates[0];
  const last = params.geometry.coordinates.at(-1);
  const originVerified = Boolean(first && last) &&
    routeDistanceKm(params.origin, { latitude: first![0], longitude: first![1] }) <= 0.01 &&
    (params.topology === "loop"
      ? routeDistanceKm(params.origin, { latitude: last![0], longitude: last![1] }) <= 0.01
      : !params.arrival || routeDistanceKm(params.arrival, { latitude: last![0], longitude: last![1] }) <= 0.01);
  const sectorAudit = guidedSectorDeviationKm(
    params.geometry,
    params.sector,
    params.waypoints,
    routeVerified,
    params.topology,
    params.arrival,
  );
  const collectionMinutesAvailable = Math.max(
    0,
    params.budget.totalMinutes - params.budget.organizationMarginMinutes - params.geometry.durationMinutes,
  );
  const withinBudget = params.geometry.durationMinutes <= params.budget.travelMaxMinutes &&
    collectionMinutesAvailable >= params.budget.minimumCollectionMinutes;
  const warning = params.warning ?? (
    withinBudget
      ? sectorAudit.status === "outside"
        ? "Le tracé réseau guidé dépasse le secteur déclaré ; l'écart est exposé dans l'audit."
        : sectorAudit.status === "unknown"
          ? "Le respect du secteur guidé ne peut pas être vérifié à partir de la géométrie finale."
          : null
        : params.topology === "loop" ? "La boucle guidée ne respecte pas le budget utilisateur déclaré." : "Le trajet guidé ne respecte pas le budget utilisateur déclaré."
  );
  return {
    segments: buildGuidedSegments(params.geometry, params.waypoints, params.topology, params.arrival),
    audit: {
      availability: params.geometry.mode === "network" ? "network" : "fallback-estimated",
      loopVerified,
      originVerified,
      waypointOrderVerified: routeVerified,
      waypointIds: params.waypoints.map(({ id }) => id),
      sectorDeviationKm: sectorAudit.deviationKm === null ? null : round(sectorAudit.deviationKm),
      sectorWithinBounds: sectorAudit.status === "within",
      sectorStatus: sectorAudit.status,
      warning,
      budget: {
        ...params.budget,
        travelMinutes: params.geometry.durationMinutes,
        collectionMinutesAvailable: round(collectionMinutesAvailable),
        withinBudget,
      },
    },
  };
}

function plannedStopsFromGeometry(origin: RoutePlannerOrigin, candidates: readonly RoutePlannerCandidate[], geometry: RouteGeometry): PlannedRouteStop[] {
  let cumulativeDistanceKm = 0;
  let cumulativeTravelMinutes = 0;
  return candidates.map((candidate, index) => {
    const outboundLeg = geometry.legs[index];
    const returnLeg = geometry.isLoop
      ? geometry.legs[index + 1] ?? geometry.returnLeg
      : index === candidates.length - 1 && geometry.legs.length > candidates.length
        ? geometry.legs[index + 1]
        : undefined;
    const incrementalDistanceKm = outboundLeg?.distanceKm ?? routeDistanceKm(index === 0 ? origin : candidates[index - 1]!, candidate);
    const incrementalTravelMinutes = outboundLeg?.estimatedMinutes ?? Math.round(travelMinutesForDistance(incrementalDistanceKm));
    const returnDistanceKm = returnLeg?.distanceKm ?? routeDistanceKm(candidate, origin);
    const returnTravelMinutes = returnLeg?.estimatedMinutes ?? Math.round(travelMinutesForDistance(returnDistanceKm));
    cumulativeDistanceKm += incrementalDistanceKm;
    cumulativeTravelMinutes += incrementalTravelMinutes;
    return { candidate, incrementalDistanceKm, incrementalTravelMinutes, cumulativeTravelMinutes, returnDistanceKm, returnTravelMinutes, loopDistanceKm: cumulativeDistanceKm + returnDistanceKm, loopTravelMinutes: cumulativeTravelMinutes + returnTravelMinutes };
  });
}

export function routeStopsFromPlanned(plannedStops: PlannedRouteStop[], geometry: RouteGeometry): RouteStop[] {
  const baseStops = plannedStops.map(({ candidate, incrementalDistanceKm, incrementalTravelMinutes }) => ({
    id: candidate.id,
    label: candidate.label,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    segmentKm: incrementalDistanceKm,
    estimatedMinutes: Math.max(0, Math.round(incrementalTravelMinutes)),
    priorityReason: candidate.reason,
    score: Number(candidate.score.toFixed(2)),
    evidence: candidate.evidence,
  }));
  return applyOriginRouteGeometryLegs(baseStops, geometry);
}

type NetworkReduction = {
  candidates: RoutePlannerCandidate[];
  geometry: RouteGeometry;
  providerCalls: number;
  failed: boolean;
};

async function reduceNetworkCandidates(params: {
  origin: RoutePlannerOrigin;
  candidates: RoutePlannerCandidate[];
  geometry: RouteGeometry;
  fitsBudget: (candidates: readonly RoutePlannerCandidate[], geometry: RouteGeometry) => boolean;
  topology: RouteTopology;
  arrival?: RoutePlannerOrigin;
}): Promise<NetworkReduction> {
  let candidates = [...params.candidates];
  let geometry = params.geometry;
  let providerCalls = 0;
  let failed = false;
  while (candidates.length > 0) {
    candidates = candidates.slice(0, -1);
    if (candidates.length === 0) break;
    providerCalls += 1;
    const attempt = await (async () => {
      try {
        return { geometry: await routePolylineThroughFossgisFoot(routeCoordinates(params.origin, candidates, params.topology, params.arrival), { topology: params.topology }), failed: false };
      } catch {
        return { geometry: null, failed: true };
      }
    })();
    if (attempt.failed) {
      failed = true;
      break;
    }
    if (attempt.geometry && params.fitsBudget(candidates, attempt.geometry)) {
      geometry = attempt.geometry;
      break;
    }
  }
  return { candidates, geometry, providerCalls, failed };
}

function findFallbackBudgetPrefix(params: {
  origin: RoutePlannerOrigin;
  candidates: readonly RoutePlannerCandidate[];
  fitsBudget: (candidates: readonly RoutePlannerCandidate[], geometry: RouteGeometry) => boolean;
  topology: RouteTopology;
  arrival?: RoutePlannerOrigin;
}): { candidates: RoutePlannerCandidate[]; geometry: RouteGeometry } {
  for (let count = params.candidates.length; count > 0; count -= 1) {
    const candidates = params.candidates.slice(0, count);
    const geometry = fallbackGeometry(params.origin, candidates, params.topology, params.arrival);
    if (params.fitsBudget(candidates, geometry)) return { candidates, geometry };
  }
  return { candidates: [], geometry: fallbackGeometry(params.origin, [], params.topology, params.arrival) };
}

function routeGroupFitsBudget(params: {
  candidates: readonly RoutePlannerCandidate[];
  geometry: RouteGeometry;
  travelBudgetMinutes: number;
  operationalBudget?: RouteOperationalBudgetDependency;
  weatherContext?: PlannerWeatherContext;
  volunteersExpected: number;
  groupCount: number;
}): boolean {
  if (params.geometry.durationMinutes > params.travelBudgetMinutes) return false;
  if (!params.operationalBudget) return true;
  const context = buildRouteCalibrationContext({
    generatedAt: params.operationalBudget.generatedAt ?? new Date().toISOString(),
    routeEngineVersion: "route-planner-v2",
    volunteersExpected: params.volunteersExpected,
    groupCount: params.groupCount,
    candidates: params.candidates.map((candidate) => ({ candidateId: candidate.id, family: candidate.family, cleanupWorkload: buildCleanupWorkload(candidate) })),
  });
  const budget = buildRouteOperationalBudget({
    travelMinutes: params.geometry.durationMinutes,
    budgetMinutes: params.travelBudgetMinutes,
    calibrationContext: context,
    durationDependency: params.operationalBudget,
    weatherContext: params.weatherContext,
  });
  return budget.totalMinutes === null || budget.withinBudget === true;
}

function buildRouteGroupRoutingResult(params: {
  group: RouteGroupAssignment;
  candidates: readonly RoutePlannerCandidate[];
  geometry: RouteGeometry;
  providerCalls: number;
  firstProviderMode: RouteGeometry["mode"] | null;
  degraded: boolean;
  warning: string | null;
  budgetPrefixApplied: boolean;
  guidedSegments?: RouteGuidedSegment[];
  guidedRouting?: RouteGuidedRoutingAudit;
}): RouteGroupRoutingResult {
  return {
    group: params.group,
    finalCandidateIds: params.candidates.map(({ id }) => id),
    routeGeometry: params.geometry,
    plannedStops: plannedStopsFromGeometry(params.group.origin, params.candidates, params.geometry),
    providerCalls: params.providerCalls,
    firstProviderMode: params.firstProviderMode,
    degraded: params.degraded,
    warning: params.warning,
    budgetPrefixApplied: params.budgetPrefixApplied,
    ...(params.guidedSegments ? { guidedSegments: params.guidedSegments } : {}),
    ...(params.guidedRouting ? { guidedRouting: params.guidedRouting } : {}),
  };
}

function emptyRouteGroupResult(origin: RoutePlannerOrigin, group: RouteGroupAssignment, topology: RouteTopology, arrival?: RoutePlannerOrigin): RouteGroupRoutingResult {
  return buildRouteGroupRoutingResult({ group, candidates: [], geometry: fallbackGeometry(origin, [], topology, arrival), providerCalls: 0, firstProviderMode: null, degraded: false, warning: null, budgetPrefixApplied: false });
}

async function adjustRouteToBudget(params: {
  origin: RoutePlannerOrigin;
  initialCandidates: RoutePlannerCandidate[];
  candidates: RoutePlannerCandidate[];
  geometry: RouteGeometry;
  providerCalls: number;
  degraded: boolean;
  warning: string | null;
  fitsBudget: (candidates: readonly RoutePlannerCandidate[], geometry: RouteGeometry) => boolean;
  topology: RouteTopology;
  arrival?: RoutePlannerOrigin;
}): Promise<{ candidates: RoutePlannerCandidate[]; geometry: RouteGeometry; providerCalls: number; degraded: boolean; warning: string | null; budgetPrefixApplied: boolean }> {
  if (params.fitsBudget(params.candidates, params.geometry)) return { ...params, budgetPrefixApplied: false };
  let candidates = params.candidates;
  let geometry = params.geometry;
  let providerCalls = params.providerCalls;
  let degraded = params.degraded;
  let warning = params.warning;
  if (geometry.mode === "network") {
    const reduction = await reduceNetworkCandidates({ origin: params.origin, candidates, geometry, fitsBudget: params.fitsBudget, topology: params.topology, arrival: params.arrival });
    candidates = reduction.candidates;
    geometry = reduction.geometry;
    providerCalls += reduction.providerCalls;
    if (reduction.failed) {
      degraded = true;
      warning = "La boucle réseau réduite d'un groupe a échoué ; un fallback local fermé est utilisé.";
    }
  }
  if (!params.fitsBudget(candidates, geometry) || candidates.length === 0) {
    degraded = true;
    warning = warning ?? "Le réseau ne permet pas de respecter le budget de ce groupe ; un fallback local fermé est utilisé.";
    ({ candidates, geometry } = findFallbackBudgetPrefix({ origin: params.origin, candidates: params.initialCandidates, fitsBudget: params.fitsBudget, topology: params.topology, arrival: params.arrival }));
  }
  return { candidates, geometry, providerCalls, degraded, warning, budgetPrefixApplied: true };
}

async function loadInitialRouteGeometry(origin: RoutePlannerOrigin, points: readonly RoutePoint[], topology: RouteTopology, arrival?: RoutePlannerOrigin): Promise<{ geometry: RouteGeometry; providerCalls: number; firstProviderMode: RouteGeometry["mode"]; degraded: boolean; warning: string | null }> {
  try {
    const geometry = await routePolylineThroughFossgisFoot(routeCoordinates(origin, points, topology, arrival), { topology });
    return {
      geometry,
      providerCalls: 1,
      firstProviderMode: geometry.mode,
      degraded: geometry.mode !== "network",
      warning: geometry.mode === "fallback"
        ? topology === "loop" ? "Le routage piéton réseau est indisponible ; la boucle est une estimation locale fermée." : "Le routage piéton réseau est indisponible ; le trajet ouvert est une estimation locale."
        : null,
    };
  } catch {
    return { geometry: fallbackGeometry(origin, points, topology, arrival), providerCalls: 1, firstProviderMode: "fallback", degraded: true, warning: topology === "loop" ? "Le routage réseau d'un groupe a échoué ; un fallback local fermé est utilisé." : "Le routage réseau d'un groupe a échoué ; un fallback local ouvert estimé est utilisé." };
  }
}

function buildRouteBudgetPredicate(params: {
  travelBudgetMinutes: number;
  operationalBudget?: RouteOperationalBudgetDependency;
  weatherContext?: PlannerWeatherContext;
  volunteersExpected: number;
  groupCount: number;
}): (candidates: readonly RoutePlannerCandidate[], geometry: RouteGeometry) => boolean {
  return (candidates, geometry) => routeGroupFitsBudget({ candidates, geometry, travelBudgetMinutes: params.travelBudgetMinutes, operationalBudget: params.operationalBudget, weatherContext: params.weatherContext, volunteersExpected: params.volunteersExpected, groupCount: params.groupCount });
}

function resolveGroupCandidates(group: RouteGroupAssignment, candidatesById: Map<string, RoutePlannerCandidate>): RoutePlannerCandidate[] {
  return group.candidateIds.map((id) => candidatesById.get(id)).filter((candidate): candidate is RoutePlannerCandidate => candidate !== undefined);
}

export async function routeGroupWithinBudget(
  origin: RoutePlannerOrigin,
  group: RouteGroupAssignment,
  candidatesById: Map<string, RoutePlannerCandidate>,
  travelBudgetMinutes: number,
  operationalBudget?: RouteOperationalBudgetDependency,
  weatherContext?: PlannerWeatherContext,
  volunteersExpected = 1,
  groupCount = 1,
  topology: RouteTopology = "loop",
  arrival?: RoutePlannerOrigin,
): Promise<RouteGroupRoutingResult> {
  const initialCandidates = resolveGroupCandidates(group, candidatesById);
  const plannedWaypoints = group.plannedWaypoints ?? [];
  const guidedBudget = group.guidedBudget;
  let providerCalls = 0;
  let firstProviderMode: RouteGeometry["mode"] | null = null;
  let degraded = false;
  let warning: string | null = null;
  let budgetPrefixApplied = false;
  const fitsBudget = buildRouteBudgetPredicate({ travelBudgetMinutes, operationalBudget, weatherContext, volunteersExpected, groupCount });
  if (initialCandidates.length === 0 && plannedWaypoints.length === 0 && !arrival) return emptyRouteGroupResult(origin, group, topology, arrival);
  let retainedCandidates = [...initialCandidates];
  const routePoints = plannedWaypoints.length > 0 ? plannedWaypoints : retainedCandidates;
  const initialRoute = await loadInitialRouteGeometry(origin, routePoints, topology, arrival);
  let geometry = initialRoute.geometry;
  providerCalls += initialRoute.providerCalls;
  firstProviderMode = initialRoute.firstProviderMode;
  degraded = initialRoute.degraded;
  warning = initialRoute.warning;
  let guidedSegments: RouteGuidedSegment[] | undefined;
  let guidedRouting: RouteGuidedRoutingAudit | undefined;
  if (plannedWaypoints.length === 0) {
    ({ candidates: retainedCandidates, geometry, providerCalls, degraded, warning, budgetPrefixApplied } = await adjustRouteToBudget({ origin, initialCandidates, candidates: retainedCandidates, geometry, providerCalls, degraded, warning, fitsBudget, topology, arrival }));
  }
  if (plannedWaypoints.length > 0 && guidedBudget) {
    if (!geometryMatchesGuidedPlan(origin, plannedWaypoints, geometry, topology, arrival)) {
      geometry = fallbackGeometry(origin, plannedWaypoints, topology, arrival);
      degraded = true;
      warning = topology === "loop"
        ? "Le fournisseur n'a pas confirmé la boucle guidée, ses points ou leur ordre ; une estimation locale fermée est utilisée."
        : "Le fournisseur n'a pas confirmé le trajet guidé, ses points ou leur ordre ; une estimation locale est utilisée.";
    }
    const guidedResult = buildGuidedRoutingAudit({
      geometry,
      origin,
      waypoints: plannedWaypoints,
      topology,
      arrival,
      sector: group.plannedSector,
      budget: guidedBudget,
      warning,
    });
    guidedSegments = guidedResult.segments;
    guidedRouting = guidedResult.audit;
    if (!guidedRouting.budget.withinBudget) {
      degraded = true;
      warning = guidedRouting.warning;
    }
  }
  return buildRouteGroupRoutingResult({ group, candidates: retainedCandidates, geometry, providerCalls, firstProviderMode, degraded, warning, budgetPrefixApplied, guidedSegments, guidedRouting });
}
