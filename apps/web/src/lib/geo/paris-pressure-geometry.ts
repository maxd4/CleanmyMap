import {
  isValidParisPressureGeometry as isValidCoreGeometry,
  parisPressureGeometryAreaKm2 as coreGeometryAreaKm2,
  pointInParisPressureGeometry as corePointInGeometry,
} from "./paris-pressure-geometry-core.mjs";
import type {
  ParisPressureGeometry,
  ParisPressurePoint,
} from "./paris-pressure-spatial-types";

export type {
  ParisPressureCoordinate,
  ParisPressureGeometry,
} from "./paris-pressure-spatial-types";

export function isValidParisPressureGeometry(
  geometry: ParisPressureGeometry | null | undefined,
): geometry is ParisPressureGeometry {
  return isValidCoreGeometry(geometry);
}

export function pointInParisPressureGeometry(
  point: ParisPressurePoint,
  geometry: ParisPressureGeometry | null | undefined,
): boolean {
  return corePointInGeometry(point, geometry);
}

export function parisPressureGeometryAreaKm2(
  geometry: ParisPressureGeometry | null | undefined,
): number | null {
  return coreGeometryAreaKm2(geometry);
}

export function parisPressureDistanceKm(
  left: ParisPressurePoint,
  right: ParisPressurePoint,
): number {
  const latitudeKm = (left.latitude - right.latitude) * 111;
  const longitudeKm = (left.longitude - right.longitude) * 73;
  return Math.sqrt(latitudeKm ** 2 + longitudeKm ** 2);
}
