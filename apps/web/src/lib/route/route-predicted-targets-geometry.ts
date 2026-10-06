import type { ParisPressureZone } from "@/lib/geo/paris-pressure-contract";
import { routeDistanceKm } from "./route-planner";
import type { CorridorPoint } from "./route-predicted-targets-types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function predictedZoneRadiusKm(zone: ParisPressureZone): number {
  if (
    typeof zone.areaKm2 === "number" &&
    Number.isFinite(zone.areaKm2) &&
    zone.areaKm2 > 0
  ) {
    return clamp(Math.sqrt(zone.areaKm2 / Math.PI), 0.05, 0.75);
  }
  return 0.2;
}

function pointToSegmentDistanceKm(
  point: CorridorPoint,
  start: CorridorPoint,
  end: CorridorPoint,
): number {
  const latitudeScale = 111;
  const longitudeScale = 73;
  const px = point.longitude * longitudeScale;
  const py = point.latitude * latitudeScale;
  const sx = start.longitude * longitudeScale;
  const sy = start.latitude * latitudeScale;
  const ex = end.longitude * longitudeScale;
  const ey = end.latitude * latitudeScale;
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;
  const projection =
    lengthSquared === 0
      ? 0
      : clamp(((px - sx) * dx + (py - sy) * dy) / lengthSquared);
  return Math.sqrt(
    (px - (sx + projection * dx)) ** 2 +
      (py - (sy + projection * dy)) ** 2,
  );
}

export function distanceToRouteCorridorKm(
  point: CorridorPoint,
  corridor: readonly CorridorPoint[],
): number {
  if (corridor.length === 0) return Number.POSITIVE_INFINITY;
  if (corridor.length === 1) return routeDistanceKm(point, corridor[0]!);
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < corridor.length; index += 1) {
    nearest = Math.min(
      nearest,
      pointToSegmentDistanceKm(point, corridor[index - 1]!, corridor[index]!),
    );
  }
  return nearest;
}
