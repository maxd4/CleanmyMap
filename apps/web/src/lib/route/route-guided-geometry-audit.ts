import { routeDistanceKm, type RoutePlannerOrigin } from "./route-planner";
import type { RouteGeometry, RouteTopology } from "./route-contract";
import type { RoutePlannedWaypoint } from "./route-planning-mode";

type Coordinate = [number, number];
const GUIDED_WAYPOINT_COORDINATE_EPSILON = 1e-6;
const GUIDED_STEP_ENDPOINT_TOLERANCE_KM = 0.01;
const GUIDED_STEP_CONTINUITY_TOLERANCE_KM = 0.001;
const GUIDED_GEOMETRY_COHERENCE_TOLERANCE_KM = 0.02;

function coordinatesMatchWaypoint(
  coordinate: Coordinate,
  waypoint: RoutePlannedWaypoint,
): boolean {
  return Math.abs(coordinate[0] - waypoint.latitude) <= GUIDED_WAYPOINT_COORDINATE_EPSILON &&
    Math.abs(coordinate[1] - waypoint.longitude) <= GUIDED_WAYPOINT_COORDINATE_EPSILON;
}

function exactWaypointCoordinateIndexes(
  geometry: RouteGeometry,
  waypoints: readonly RoutePlannedWaypoint[],
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): number[] | null {
  if (
    waypoints.length === 0 ||
    geometry.coordinates.length < waypoints.length + 2 ||
    geometry.legs.length !== (topology === "loop" || arrival ? waypoints.length + 1 : waypoints.length) ||
    geometry.legs.some((leg, index) =>
      leg.fromStopIndex !== index || leg.toStopIndex !== index + 1,
    )
  ) {
    return null;
  }

  const lastCoordinateIndex = geometry.coordinates.length - 1;
  let coordinateIndex = 1;
  const indexes: number[] = [];
  for (const waypoint of waypoints) {
    const matchingIndexes = geometry.coordinates.flatMap((coordinate, index) =>
      index >= coordinateIndex &&
      index < lastCoordinateIndex &&
      coordinatesMatchWaypoint(coordinate, waypoint)
        ? [index]
        : [],
    );
    if (matchingIndexes.length !== 1) return null;
    const matchIndex = matchingIndexes[0];
    if (matchIndex === undefined) return null;
    indexes.push(matchIndex);
    coordinateIndex = matchIndex + 1;
  }
  return indexes;
}

function validStepCoordinates(
  steps: RouteGeometry["legs"][number]["steps"],
): Coordinate[] | null {
  if (!steps || steps.length === 0) return null;
  const coordinates: Coordinate[] = [];
  for (const step of steps) {
    if (!step.geometry || step.geometry.length < 2 || step.geometry.some(([latitude, longitude]) =>
      !Number.isFinite(latitude) || !Number.isFinite(longitude),
    )) {
      return null;
    }
    const first = step.geometry[0];
    const previous = coordinates.at(-1);
    if (previous && first && (
      Math.abs(previous[0] - first[0]) > GUIDED_WAYPOINT_COORDINATE_EPSILON ||
      Math.abs(previous[1] - first[1]) > GUIDED_WAYPOINT_COORDINATE_EPSILON
    )) {
      return null;
    }
    for (const coordinate of step.geometry) {
      const last = coordinates.at(-1);
      if (!last || last[0] !== coordinate[0] || last[1] !== coordinate[1]) {
        coordinates.push(coordinate);
      }
    }
  }
  return coordinates.length >= 2 ? coordinates : null;
}

function coordinateDistanceKm(left: Coordinate, right: Coordinate): number {
  return routeDistanceKm(
    { latitude: left[0], longitude: left[1] },
    { latitude: right[0], longitude: right[1] },
  );
}

function localCoordinateKm(
  coordinate: Coordinate,
  referenceLatitude: number,
): Coordinate {
  const latitudeKm = 110.574;
  const longitudeKm = 111.32 * Math.cos((referenceLatitude * Math.PI) / 180);
  return [coordinate[1] * longitudeKm, coordinate[0] * latitudeKm];
}

function projectedPointOnSegment(
  point: Coordinate,
  start: Coordinate,
  end: Coordinate,
): { distanceKm: number; fraction: number } {
  const referenceLatitude = (point[0] + start[0] + end[0]) / 3;
  const localPoint = localCoordinateKm(point, referenceLatitude);
  const localStart = localCoordinateKm(start, referenceLatitude);
  const localEnd = localCoordinateKm(end, referenceLatitude);
  const deltaX = localEnd[0] - localStart[0];
  const deltaY = localEnd[1] - localStart[1];
  const segmentLengthSquared = deltaX ** 2 + deltaY ** 2;
  const fraction = segmentLengthSquared === 0
    ? 0
    : Math.min(1, Math.max(0, (
      (localPoint[0] - localStart[0]) * deltaX +
      (localPoint[1] - localStart[1]) * deltaY
    ) / segmentLengthSquared));
  const projectedX = localStart[0] + fraction * deltaX;
  const projectedY = localStart[1] + fraction * deltaY;
  return {
    distanceKm: Math.hypot(localPoint[0] - projectedX, localPoint[1] - projectedY),
    fraction,
  };
}

function closestPolylineProjection(
  point: Coordinate,
  polyline: readonly Coordinate[],
): { distanceKm: number; progressKm: number } {
  let progressKm = 0;
  let closest = { distanceKm: Number.POSITIVE_INFINITY, progressKm: 0 };
  for (let index = 0; index < polyline.length - 1; index += 1) {
    const start = polyline[index]!;
    const end = polyline[index + 1]!;
    const segmentLengthKm = coordinateDistanceKm(start, end);
    const projection = projectedPointOnSegment(point, start, end);
    if (projection.distanceKm < closest.distanceKm) {
      closest = {
        distanceKm: projection.distanceKm,
        progressKm: progressKm + projection.fraction * segmentLengthKm,
      };
    }
    progressKm += segmentLengthKm;
  }
  return closest;
}

function polylineFollowsTargetOrder(
  source: readonly Coordinate[],
  target: readonly Coordinate[],
): boolean {
  let previousProgressKm = Number.NEGATIVE_INFINITY;
  for (const coordinate of source) {
    const projection = closestPolylineProjection(coordinate, target);
    if (projection.progressKm + GUIDED_GEOMETRY_COHERENCE_TOLERANCE_KM < previousProgressKm) {
      return false;
    }
    previousProgressKm = projection.progressKm;
  }
  return true;
}

function polylinesAreCoherent(
  left: readonly Coordinate[],
  right: readonly Coordinate[],
): boolean {
  if (left.length < 2 || right.length < 2) return false;
  const leftDeviation = Math.max(
    ...left.map((coordinate) => closestPolylineProjection(coordinate, right).distanceKm),
  );
  const rightDeviation = Math.max(
    ...right.map((coordinate) => closestPolylineProjection(coordinate, left).distanceKm),
  );
  return leftDeviation <= GUIDED_GEOMETRY_COHERENCE_TOLERANCE_KM &&
    rightDeviation <= GUIDED_GEOMETRY_COHERENCE_TOLERANCE_KM &&
    polylineFollowsTargetOrder(left, right) &&
    polylineFollowsTargetOrder(right, left);
}

function collectionLegsForGuidedPlan(
  geometry: RouteGeometry,
  waypoints: readonly RoutePlannedWaypoint[],
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): RouteGeometry["legs"] | null {
  const collectionLegs = geometry.legs.slice(1, topology === "loop" || arrival ? -1 : undefined);
  return collectionLegs.length === waypoints.length - 1 ? collectionLegs : null;
}

function collectionCoordinatesFromLegSteps(
  geometry: RouteGeometry,
  waypoints: readonly RoutePlannedWaypoint[],
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): Coordinate[] | null {
  if (waypoints.length < 2) return null;
  const collectionLegs = collectionLegsForGuidedPlan(geometry, waypoints, topology, arrival);
  if (!collectionLegs) return null;
  const collectionCoordinates: Coordinate[] = [];
  for (const [index, leg] of collectionLegs.entries()) {
    const legCoordinates = validStepCoordinates(leg.steps);
    if (!legCoordinates) return null;
    const first = legCoordinates[0];
    const last = legCoordinates.at(-1);
    const fromWaypoint = waypoints[index];
    const toWaypoint = waypoints[index + 1];
    if (!first || !last || !fromWaypoint || !toWaypoint ||
      coordinateDistanceKm(first, [fromWaypoint.latitude, fromWaypoint.longitude]) > GUIDED_STEP_ENDPOINT_TOLERANCE_KM ||
      coordinateDistanceKm(last, [toWaypoint.latitude, toWaypoint.longitude]) > GUIDED_STEP_ENDPOINT_TOLERANCE_KM) {
      return null;
    }
    const previous = collectionCoordinates.at(-1);
    if (previous && coordinateDistanceKm(previous, first) > GUIDED_STEP_CONTINUITY_TOLERANCE_KM) {
      return null;
    }
    for (const coordinate of legCoordinates) {
      const last = collectionCoordinates.at(-1);
      if (!last || last[0] !== coordinate[0] || last[1] !== coordinate[1]) {
        collectionCoordinates.push(coordinate);
      }
    }
  }
  return collectionCoordinates.length >= 2 ? collectionCoordinates : null;
}

function collectionCoordinatesFromFinalGeometry(
  geometry: RouteGeometry,
  waypoints: readonly RoutePlannedWaypoint[],
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): Coordinate[] | null {
  if (waypoints.length < 2) return null;
  const waypointIndexes = exactWaypointCoordinateIndexes(geometry, waypoints, topology, arrival);
  if (!waypointIndexes) return null;
  const collectionCoordinates: Coordinate[] = [];
  for (let waypointIndex = 1; waypointIndex < waypointIndexes.length; waypointIndex += 1) {
    const fromCoordinateIndex = waypointIndexes[waypointIndex - 1]!;
    const toCoordinateIndex = waypointIndexes[waypointIndex]!;
    const collectionLegCoordinates = geometry.coordinates.slice(
      fromCoordinateIndex,
      toCoordinateIndex + 1,
    );
    if (collectionLegCoordinates.length < 2) return null;
    collectionCoordinates.push(...collectionLegCoordinates);
  }
  return collectionCoordinates.length >= 2 ? collectionCoordinates : null;
}

function collectionCoordinatesFromVerifiedSteps(
  geometry: RouteGeometry,
  waypoints: readonly RoutePlannedWaypoint[],
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): Coordinate[] | null {
  const collectionLegs = collectionLegsForGuidedPlan(geometry, waypoints, topology, arrival);
  if (!collectionLegs) return null;
  const hasStepPayload = collectionLegs.some((leg) => leg.steps !== undefined);
  if (!hasStepPayload) return null;
  const stepCoordinates = collectionCoordinatesFromLegSteps(geometry, waypoints, topology, arrival);
  const finalCoordinates = collectionCoordinatesFromFinalGeometry(geometry, waypoints, topology, arrival);
  return stepCoordinates && finalCoordinates && polylinesAreCoherent(stepCoordinates, finalCoordinates)
    ? stepCoordinates
    : null;
}

export function collectionCoordinatesForSectorAudit(
  geometry: RouteGeometry,
  waypoints: readonly RoutePlannedWaypoint[],
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): Coordinate[] | null {
  if (
    waypoints.length < 2 ||
    geometry.coordinates.length < waypoints.length + 2 ||
    geometry.legs.length !== (topology === "loop" || arrival ? waypoints.length + 1 : waypoints.length) ||
    geometry.legs.some((leg, index) =>
      leg.fromStopIndex !== index || leg.toStopIndex !== index + 1,
    )
  ) {
    return null;
  }

  const collectionCoordinatesFromSteps = collectionCoordinatesFromVerifiedSteps(
    geometry,
    waypoints,
    topology,
    arrival,
  );
  const collectionLegs = collectionLegsForGuidedPlan(geometry, waypoints, topology, arrival);
  if (collectionLegs?.some((leg) => leg.steps !== undefined)) {
    return collectionCoordinatesFromSteps;
  }
  return collectionCoordinatesFromFinalGeometry(geometry, waypoints, topology, arrival);
}
