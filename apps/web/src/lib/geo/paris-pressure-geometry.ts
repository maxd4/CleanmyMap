import type { ParisPressurePoint } from "./paris-pressure-contract";

export type ParisPressureCoordinate = readonly [number, number];

export type ParisPressureGeometry =
  | {
      type: "Polygon";
      coordinates: readonly (readonly ParisPressureCoordinate[])[];
    }
  | {
      type: "MultiPolygon";
      coordinates: readonly (readonly (readonly ParisPressureCoordinate[])[])[];
    };

const LONGITUDE_KM = 73;
const LATITUDE_KM = 111;
const EPSILON = 1e-10;

function finiteCoordinate(
  coordinate: ParisPressureCoordinate | undefined,
): coordinate is ParisPressureCoordinate {
  return Boolean(
    coordinate &&
      Number.isFinite(coordinate[0]) &&
      Number.isFinite(coordinate[1]),
  );
}

function pointOnSegment(
  point: ParisPressurePoint,
  start: ParisPressureCoordinate,
  end: ParisPressureCoordinate,
): boolean {
  const px = point.longitude;
  const py = point.latitude;
  const cross = (px - start[0]) * (end[1] - start[1]) -
    (py - start[1]) * (end[0] - start[0]);
  if (Math.abs(cross) > EPSILON) return false;
  return (
    px >= Math.min(start[0], end[0]) - EPSILON &&
    px <= Math.max(start[0], end[0]) + EPSILON &&
    py >= Math.min(start[1], end[1]) - EPSILON &&
    py <= Math.max(start[1], end[1]) + EPSILON
  );
}

function ringContains(
  point: ParisPressurePoint,
  ring: readonly ParisPressureCoordinate[],
): "inside" | "outside" | "boundary" {
  const coordinates = ring.filter(finiteCoordinate);
  if (coordinates.length < 3) return "outside";

  let inside = false;
  for (let index = 0; index < coordinates.length; index += 1) {
    const start = coordinates[index];
    const end = coordinates[(index + 1) % coordinates.length];
    if (pointOnSegment(point, start, end)) return "boundary";
    const crosses =
      (start[1] > point.latitude) !== (end[1] > point.latitude) &&
      point.longitude <
        ((end[0] - start[0]) * (point.latitude - start[1])) /
          (end[1] - start[1]) +
          start[0];
    if (crosses) inside = !inside;
  }
  return inside ? "inside" : "outside";
}

function polygonContains(
  point: ParisPressurePoint,
  rings: readonly (readonly ParisPressureCoordinate[])[],
): boolean {
  const [outer, ...holes] = rings;
  const outerRelation = outer ? ringContains(point, outer) : "outside";
  if (outerRelation === "outside") return false;
  // A boundary belongs to the polygon for deterministic spatial joining. A
  // hole boundary follows the same rule, while its interior is excluded.
  return !holes.some((hole) => ringContains(point, hole) === "inside");
}

export function pointInParisPressureGeometry(
  point: ParisPressurePoint,
  geometry: ParisPressureGeometry | null | undefined,
): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return polygonContains(point, geometry.coordinates);
  return geometry.coordinates.some((polygon) => polygonContains(point, polygon));
}

function ringAreaKm2(ring: readonly ParisPressureCoordinate[]): number {
  if (ring.length < 3) return 0;
  const origin = ring[0];
  if (!finiteCoordinate(origin)) return 0;
  let area = 0;
  for (let index = 1; index < ring.length - 1; index += 1) {
    const first = ring[index];
    const second = ring[index + 1];
    if (!finiteCoordinate(first) || !finiteCoordinate(second)) continue;
    const ax = (first[0] - origin[0]) * LONGITUDE_KM;
    const ay = (first[1] - origin[1]) * LATITUDE_KM;
    const bx = (second[0] - origin[0]) * LONGITUDE_KM;
    const by = (second[1] - origin[1]) * LATITUDE_KM;
    area += (ax * by - bx * ay) / 2;
  }
  return Math.abs(area);
}

function polygonAreaKm2(
  rings: readonly (readonly ParisPressureCoordinate[])[],
): number {
  const [outer, ...holes] = rings;
  if (!outer) return 0;
  return Math.max(
    0,
    ringAreaKm2(outer) - holes.reduce((sum, hole) => sum + ringAreaKm2(hole), 0),
  );
}

export function parisPressureGeometryAreaKm2(
  geometry: ParisPressureGeometry | null | undefined,
): number | null {
  if (!geometry) return null;
  const area =
    geometry.type === "Polygon"
      ? polygonAreaKm2(geometry.coordinates)
      : geometry.coordinates.reduce(
          (sum, polygon) => sum + polygonAreaKm2(polygon),
          0,
        );
  return area > 0 && Number.isFinite(area) ? area : null;
}

export function parisPressureDistanceKm(
  left: ParisPressurePoint,
  right: ParisPressurePoint,
): number {
  const latitudeKm = (left.latitude - right.latitude) * LATITUDE_KM;
  const longitudeKm = (left.longitude - right.longitude) * LONGITUDE_KM;
  return Math.sqrt(latitudeKm ** 2 + longitudeKm ** 2);
}
