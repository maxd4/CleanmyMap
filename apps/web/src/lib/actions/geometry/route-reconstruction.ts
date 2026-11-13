import "server-only";

import { ActionRouteReconstructionError } from "./route-reconstruction-error";

import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionLocationCoordinates,
  ActionRecordType,
  ActionRouteTopology,
  ActionSimulatedRouteCoverage,
  LegacyActionRecordType,
} from "@/lib/actions/types";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import {
  buildTerritoryNominatimSearchUrl,
  isWithinTerritoryBounds,
  parseTerritoryCoordinates,
} from "@/lib/geo/territory";
import { findMatchingGeometry } from "@/lib/geo/geometry-reference";
import { areCoordinatesClose } from "@/lib/geo/coordinate-comparison";
import { haversineDistanceKm } from "@/lib/geo/geodesic-distance";
import { routePolylineThroughFossgisFoot } from "@/lib/route/fossgis-foot-routing";
import type { RouteGeometry } from "@/lib/route/route-contract";
import { resolvePersistedRouteGeometrySource } from "@/lib/route/route-provenance";
import {
  deriveRouteTargetDistanceKm,
  HYPOTHETICAL_WALKING_SPEED_KM_PER_HOUR,
  resolveRouteTargetDistance,
} from "../route-target-distance";
import { resolveHypotheticalGroupPlan } from "@/lib/route/route-group-partition";

type GeoPoint = {
  latitude: number;
  longitude: number;
};

const GEOCODING_TIMEOUT_MS = 4_000;
const GEOCODING_CACHE_TTL_MS = 5 * 60_000;
/** Four rotated, bounded hypotheses keep loop reconstruction deterministic without inventing a route. */
const LOOP_HYPOTHESIS_ROTATIONS_DEGREES = [0, 45, 90, 135] as const;
/** The minimum side keeps a zero/very short target routable while remaining visibly bounded. */
const LOOP_MIN_SIDE_METERS = 25;
/** A provider detour this large is treated as geographically incoherent for candidate ranking. */
const LOOP_MAX_TARGET_DISTANCE_FACTOR = 4;
const LOOP_MAX_EXCESS_DISTANCE_KM = 5;
const geocodingCache = new Map<string, { expiresAt: number; value: GeoPoint | null }>();
const geocodingInFlight = new Map<string, Promise<GeoPoint | null>>();

export type ReconstructedActionRoute = {
  drawing: ActionDrawing;
  geometrySource: Extract<ActionGeometrySource, "reference" | "routed" | "estimated_route">;
  routeGeometry: RouteGeometry | null;
  origin: [number, number];
  simulatedRouteCoverage?: ActionSimulatedRouteCoverage;
  simulationUnavailableReason?: string;
};

function isCoordinatePair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === "number" && Number.isFinite(value[0]) &&
    typeof value[1] === "number" && Number.isFinite(value[1]);
}

function toOrigin(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): [number, number] | null {
  if (
    typeof latitude !== "number" || !Number.isFinite(latitude) ||
    typeof longitude !== "number" || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
  ) {
    return null;
  }
  return [latitude, longitude];
}

function toGeoPoint(value: ActionLocationCoordinates | null | undefined): GeoPoint | null {
  const origin = toOrigin(value?.latitude, value?.longitude);
  return origin ? { latitude: origin[0], longitude: origin[1] } : null;
}

function metersToLatitudeDelta(meters: number): number {
  return meters / 111_320;
}

function metersToLongitudeDelta(meters: number, latitude: number): number {
  return meters / (111_320 * Math.max(0.1, Math.cos((latitude * Math.PI) / 180)));
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

function buildClosedLoopWaypointsForRotation(
  origin: [number, number],
  targetDistanceKm: number,
  rotationDegrees: number,
): [number, number][] {
  const [latitude, longitude] = origin;
  const sideMeters = Math.max(
    LOOP_MIN_SIDE_METERS,
    (Math.max(0, targetDistanceKm) * 1000) / 4,
  );
  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  const offsets: [number, number][] = [
    [0, 0],
    [sideMeters, 0],
    [sideMeters, sideMeters],
    [0, sideMeters],
    [0, 0],
  ];

  return offsets.map(([northMeters, eastMeters]) => {
    const rotatedNorth =
      northMeters * Math.cos(rotationRadians) - eastMeters * Math.sin(rotationRadians);
    const rotatedEast =
      northMeters * Math.sin(rotationRadians) + eastMeters * Math.cos(rotationRadians);
    return [
      roundCoordinate(latitude + metersToLatitudeDelta(rotatedNorth)),
      roundCoordinate(longitude + metersToLongitudeDelta(rotatedEast, latitude)),
    ];
  });
}

/**
 * Keeps the legacy one-hypothesis helper available for callers and tests. The
 * reconstruction engine routes a bounded set of rotated hypotheses instead of
 * using this synthetic shape as its final geometry.
 */
export function buildClosedLoopWaypoints(
  origin: [number, number],
  targetDistanceKm: number,
): [number, number][] {
  return buildClosedLoopWaypointsForRotation(origin, targetDistanceKm, 0);
}

function buildLoopHypotheses(
  origin: [number, number],
  targetDistanceKm: number,
  rotationOffsetDegrees = 0,
): [number, number][][] {
  return LOOP_HYPOTHESIS_ROTATIONS_DEGREES.map((rotation) =>
    buildClosedLoopWaypointsForRotation(origin, targetDistanceKm, rotation + rotationOffsetDegrees),
  );
}

function isValidNetworkLoop(routeGeometry: RouteGeometry): boolean {
  return (
    routeGeometry.mode === "network" &&
    routeGeometry.provider !== "none" &&
    routeGeometry.isLoop &&
    routeGeometry.coordinates.length >= 2 &&
    areCoordinatesClose(routeGeometry.coordinates[0], routeGeometry.coordinates.at(-1), 1e-5) &&
    routeGeometry.coordinates.every(isCoordinatePair) &&
    Number.isFinite(routeGeometry.distanceKm) &&
    routeGeometry.distanceKm >= 0
  );
}

function isGeographicallyCoherentLoop(
  routeGeometry: RouteGeometry,
  targetDistanceKm: number,
): boolean {
  const maximumDistanceKm = Math.max(
    targetDistanceKm * LOOP_MAX_TARGET_DISTANCE_FACTOR,
    targetDistanceKm + LOOP_MAX_EXCESS_DISTANCE_KM,
  );
  return routeGeometry.distanceKm <= maximumDistanceKm;
}

function routeCoherencePenalty(routeGeometry: RouteGeometry): number {
  if (routeGeometry.legs.length === 0 || routeGeometry.distanceKm <= 0) {
    return 0;
  }

  const longestLeg = Math.max(...routeGeometry.legs.map((leg) => leg.distanceKm));
  return longestLeg / routeGeometry.distanceKm;
}

function routeAxisContinuityPenalty(routeGeometry: RouteGeometry): number {
  const steps = routeGeometry.legs.flatMap((leg) => leg.steps ?? []);
  if (steps.length === 0) return 0;

  const namedSteps = steps.filter((step) => step.name);
  if (namedSteps.length === 0) return 0;

  const nameChanges = namedSteps.reduce((changes, step, index) => {
    const previous = namedSteps[index - 1];
    return previous && previous.name !== step.name ? changes + 1 : changes;
  }, 0);
  return nameChanges / namedSteps.length;
}

function compareLoopCandidates(
  left: { routeGeometry: RouteGeometry; index: number },
  right: { routeGeometry: RouteGeometry; index: number },
  targetDistanceKm: number,
): number {
  const distanceScale = Math.max(targetDistanceKm, LOOP_MIN_SIDE_METERS / 1000);
  const leftDistanceError = Math.abs(left.routeGeometry.distanceKm - targetDistanceKm) / distanceScale;
  const rightDistanceError = Math.abs(right.routeGeometry.distanceKm - targetDistanceKm) / distanceScale;
  if (leftDistanceError !== rightDistanceError) {
    return leftDistanceError - rightDistanceError;
  }

  const coherenceDifference =
    routeCoherencePenalty(left.routeGeometry) - routeCoherencePenalty(right.routeGeometry);
  if (coherenceDifference !== 0) return coherenceDifference;

  const continuityDifference =
    routeAxisContinuityPenalty(left.routeGeometry) - routeAxisContinuityPenalty(right.routeGeometry);
  if (continuityDifference !== 0) return continuityDifference;

  return left.index - right.index;
}

async function routeLoopHypotheses(
  origin: [number, number],
  targetDistanceKm: number,
  midpoint: [number, number] | null,
  rotationOffsetDegrees = 0,
): Promise<RouteGeometry> {
  const hypotheses = midpoint
    ? [[origin, midpoint, origin]]
    : buildLoopHypotheses(origin, targetDistanceKm, rotationOffsetDegrees);
  let fallbackRoute: RouteGeometry | null = null;
  const networkCandidates: Array<{ routeGeometry: RouteGeometry; index: number }> = [];

  for (const [index, waypoints] of hypotheses.entries()) {
    const routeGeometry = await routePolylineThroughFossgisFoot(waypoints);
    if (routeGeometry.mode === "fallback") {
      fallbackRoute ??= routeGeometry;
      break;
    }
    if (
      isValidNetworkLoop(routeGeometry) &&
      isGeographicallyCoherentLoop(routeGeometry, targetDistanceKm)
    ) {
      networkCandidates.push({ routeGeometry, index });
    }
  }

  if (networkCandidates.length > 0) {
    const [firstCandidate, ...remainingCandidates] = networkCandidates;
    return remainingCandidates.reduce(
      (best, candidate) =>
        compareLoopCandidates(candidate, best, targetDistanceKm) < 0 ? candidate : best,
      firstCandidate!,
    ).routeGeometry;
  }

  return fallbackRoute ?? routePolylineThroughFossgisFoot(hypotheses[0]!);
}

function routeOverlapRatio(route: RouteGeometry, selected: RouteGeometry[]): number {
  if (selected.length === 0 || route.coordinates.length < 2) return 0;
  const nearPoints = route.coordinates.filter((point) => selected.some((other) =>
    other.coordinates.some((otherPoint) => haversineDistanceKm(point, otherPoint) <= 0.035),
  ));
  return nearPoints.length / route.coordinates.length;
}

async function reconstructHypotheticalCoverage(params: {
  origin: [number, number];
  durationMinutes: number | null | undefined;
  participantsCount?: number | null;
  midpointPair: [number, number] | null;
}): Promise<{ coverage?: ActionSimulatedRouteCoverage; reason?: string }> {
  const participants = params.participantsCount;
  if (participants === null || participants === undefined) return {};
  if (!Number.isFinite(params.durationMinutes) || (params.durationMinutes ?? 0) <= 0) {
    return { reason: "durée d'action insuffisante pour une reconstruction hypothétique." };
  }
  const plan = resolveHypotheticalGroupPlan(participants);
  if (plan.kind === "incompatible") return { reason: plan.reason };
  const targetDistanceKm = deriveRouteTargetDistanceKm(params.durationMinutes);
  const routes: RouteGeometry[] = [];
  for (const [index] of plan.counts.entries()) {
    const route = await routeLoopHypotheses(
      params.origin,
      targetDistanceKm,
      params.midpointPair,
      index * 45,
    );
    if (!isValidNetworkLoop(route) || route.mode !== "network" || route.provider === "none") {
      return { reason: "routage piéton indisponible pour toutes les équipes hypothétiques." };
    }
    if (routeOverlapRatio(route, routes) > 0.75) {
      return { reason: "les alternatives de routage disponibles se recouvrent trop pour être distinguées." };
    }
    routes.push(route);
  }
  return {
    coverage: {
      type: "MultiLineString",
      coordinates: routes.map((route) => route.coordinates),
      groupCount: plan.counts.length,
      groupSizePolicy: plan.kind === "exception" ? "explicit_exception" : "preferred_5_to_8",
      groupParticipantCounts: plan.counts,
      durationMinutes: Number(params.durationMinutes),
      targetDistanceKm,
      individualSimulatedDistancesKm: routes.map((route) => Number(route.distanceKm.toFixed(3))),
      totalSimulatedDistanceKm: Number(routes.reduce((total, route) => total + route.distanceKm, 0).toFixed(3)),
      uniqueNetworkDistanceKm: null,
      observedDistanceKm: null,
      speedKmPerHour: HYPOTHETICAL_WALKING_SPEED_KM_PER_HOUR,
      geometrySource: "estimated_route",
      provenance: "estimated",
      status: "hypothetical",
      coverageVersion: "simulated-routes-v2",
    },
  };
}

async function geocodeLabel(label: string): Promise<GeoPoint | null> {
  const normalizedLabel = label.trim().toLowerCase();
  if (!normalizedLabel) return null;
  const cached = geocodingCache.get(normalizedLabel);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const inFlight = geocodingInFlight.get(normalizedLabel);
  if (inFlight) return inFlight;

  const url = buildTerritoryNominatimSearchUrl(normalizedLabel);
  if (!url) return null;
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const data = await response.json() as Array<{ lat?: string; lon?: string }>;
      const coordinates = parseTerritoryCoordinates(data[0]);
      if (!coordinates || !isWithinTerritoryBounds(coordinates.latitude, coordinates.longitude)) {
        return null;
      }
      return coordinates;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })();
  geocodingInFlight.set(normalizedLabel, request);
  const value = await request;
  geocodingInFlight.delete(normalizedLabel);
  geocodingCache.set(normalizedLabel, {
    expiresAt: Date.now() + GEOCODING_CACHE_TTL_MS,
    value,
  });
  return value;
}

function referenceOrigin(
  locationLabel: string,
  departureLocationLabel: string,
): [number, number] | null {
  const referenceDrawing = findMatchingGeometry(
    departureLocationLabel || locationLabel,
  );
  if (!referenceDrawing || !referenceDrawing.coordinates[0]) return null;
  return referenceDrawing.coordinates[0];
}

type ReconstructActionRouteParams = {
  latitude?: number | null;
  longitude?: number | null;
  locationLabel: string;
  departureLocationLabel?: string | null;
  midpointLocationLabel?: string | null;
  midpointCoordinates?: ActionLocationCoordinates | null;
  arrivalLocationLabel?: string | null;
  arrivalCoordinates?: ActionLocationCoordinates | null;
  topology?: ActionRouteTopology | null;
  recordType?: ActionRecordType | LegacyActionRecordType | null;
  durationMinutes: number | null | undefined;
  durationMinutesDeclared?: boolean;
  routeTargetDistanceKm?: number | null;
  routeTargetDistanceSource?: "derived" | "manual" | null;
  participantsCount?: number | null;
};

type OriginResolution =
  | { originPair: [number, number] }
  | ReconstructedActionRoute
  | null;

function resolveTopology(params: ReconstructActionRouteParams): ActionRouteTopology {
  return resolveActionRouteTopology({
    topology: params.topology,
    arrivalLocationLabel: params.arrivalLocationLabel,
    recordType: params.recordType,
  });
}

function requirePointToPointArrival(
  params: ReconstructActionRouteParams,
  topology: ActionRouteTopology,
): void {
  if (topology === "point_to_point" && !params.arrivalLocationLabel?.trim()) {
    throw new ActionRouteReconstructionError({
      arrivalLocationLabel: [
        "Une arrivée est obligatoire pour un parcours départ → arrivée.",
      ],
    });
  }
}

async function resolveReconstructionOrigin(
  params: ReconstructActionRouteParams,
  topology: ActionRouteTopology,
): Promise<OriginResolution> {
  const departureLabel = params.departureLocationLabel?.trim() || params.locationLabel.trim();
  const existingOrigin = toOrigin(params.latitude, params.longitude);
  const geocodedOrigin = existingOrigin ? null : await geocodeLabel(departureLabel);

  requirePointToPointArrival(params, topology);

  const midpointIsDeclared = Boolean(
    params.midpointLocationLabel?.trim() || params.midpointCoordinates,
  );
  if (topology === "loop" && !midpointIsDeclared) {
    const reference = referenceOrigin(params.locationLabel, departureLabel);
    if (reference) return { originPair: reference };
  }

  if (existingOrigin) return { originPair: existingOrigin };
  if (geocodedOrigin) {
    return { originPair: [geocodedOrigin.latitude, geocodedOrigin.longitude] };
  }

  if (topology === "point_to_point") {
    throw new ActionRouteReconstructionError({
      departureLocationLabel: [
        "Le départ ne peut pas être localisé. Vérifiez l’adresse indiquée.",
      ],
    });
  }

  // A reference can provide an approximate origin for preparation, but never
  // becomes the public action coverage geometry.
  const reference = referenceOrigin(params.locationLabel, departureLabel);
  return reference ? { originPair: reference } : null;
}

async function resolveRouteStopPairs(
  params: ReconstructActionRouteParams,
  topology: ActionRouteTopology,
): Promise<{ midpointPair: [number, number] | null; arrivalPair: [number, number] | null }> {
  const midpointLabel = params.midpointLocationLabel?.trim();
  const knownMidpoint = toGeoPoint(params.midpointCoordinates);
  const geocodedMidpoint = knownMidpoint ?? (midpointLabel ? await geocodeLabel(midpointLabel) : null);
  if (midpointLabel && !geocodedMidpoint) {
    throw new ActionRouteReconstructionError({
      midRouteLocationLabel: [
        "Le mi-parcours ne peut pas être localisé. Vérifiez l’adresse indiquée.",
      ],
    });
  }

  const knownArrival = toGeoPoint(params.arrivalCoordinates);
  const geocodedArrival = topology === "point_to_point"
    ? knownArrival ?? await geocodeLabel(params.arrivalLocationLabel!.trim())
    : null;
  if (topology === "point_to_point" && !geocodedArrival) {
    throw new ActionRouteReconstructionError({
      arrivalLocationLabel: [
        "L’arrivée ne peut pas être localisée. Vérifiez l’adresse indiquée.",
      ],
    });
  }

  return {
    midpointPair: geocodedMidpoint
      ? [geocodedMidpoint.latitude, geocodedMidpoint.longitude]
      : null,
    arrivalPair: geocodedArrival
      ? [geocodedArrival.latitude, geocodedArrival.longitude]
      : null,
  };
}

export async function reconstructActionRoute(
  params: ReconstructActionRouteParams,
): Promise<ReconstructedActionRoute | null> {
  const topology = resolveTopology(params);
  const originResolution = await resolveReconstructionOrigin(params, topology);
  if (!originResolution || "drawing" in originResolution) return originResolution;

  const originPair = originResolution.originPair;
  const targetDistanceKm = resolveRouteTargetDistance({
    durationMinutes: params.durationMinutes,
    durationMinutesDeclared: params.durationMinutesDeclared,
    routeTargetDistanceKm: params.routeTargetDistanceKm,
    routeTargetDistanceSource: params.routeTargetDistanceSource,
  }).distanceKm;
  const { midpointPair, arrivalPair } = await resolveRouteStopPairs(params, topology);
  const hypothetical = topology === "loop"
    ? await reconstructHypotheticalCoverage({
        origin: originPair,
        durationMinutes: params.durationMinutes,
        participantsCount: params.participantsCount,
        midpointPair,
      })
    : { reason: "la reconstruction multi-groupes est réservée aux boucles d'action." };
  const routeGeometry = topology === "point_to_point"
    ? await routePolylineThroughFossgisFoot([
        originPair,
        ...(midpointPair ? [midpointPair] : []),
        arrivalPair!,
      ])
    : await routeLoopHypotheses(originPair, targetDistanceKm, midpointPair);
  if (!routeGeometry.coordinates.every(isCoordinatePair) || routeGeometry.coordinates.length < 2) {
    return null;
  }

  return {
    drawing: { kind: "polyline", coordinates: routeGeometry.coordinates },
    geometrySource: resolvePersistedRouteGeometrySource(routeGeometry),
    routeGeometry,
    origin: originPair,
    ...(hypothetical.coverage ? { simulatedRouteCoverage: hypothetical.coverage } : {}),
    ...(hypothetical.reason ? { simulationUnavailableReason: hypothetical.reason } : {}),
  };
}
