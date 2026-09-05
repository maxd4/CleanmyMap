import type {
  ParisPressurePoint,
  ParisPressureSnapshot,
  ParisPressureZone,
} from "./paris-pressure-contract";
import {
  parisPressureDistanceKm,
  parisPressureGeometryAreaKm2,
  isValidParisPressureGeometry,
  pointInParisPressureGeometry,
} from "./paris-pressure-geometry";

export const PARIS_PRESSURE_LOOKUP_RADIUS_KM = 1.5;

export type ParisPressureAtPoint = {
  zoneId: string;
  zoneLabel: string;
  geographicLevel: ParisPressureZone["geographicLevel"];
  matchMethod: "point-in-polygon" | "nearest-centroid-fallback";
  distanceToCentroidKm: number;
  approximationWarning: string | null;
  /** Kept for the existing route trace contract; this is centroid distance. */
  distanceToZoneKm: number;
  humanPressure: number | null;
  cleanlinessPrior: ParisPressureZone["signals"]["cleanlinessPrior"];
  signals: ParisPressureZone["signals"];
};

export function findNearestParisPressureZone(
  point: ParisPressurePoint,
  snapshot: ParisPressureSnapshot,
): ParisPressureAtPoint | null {
  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    snapshot.zones.length === 0
  ) return null;

  const usableGeometry = (zone: ParisPressureZone) =>
    isValidParisPressureGeometry(zone.geometry) &&
    parisPressureGeometryAreaKm2(zone.geometry) !== null;
  const usableGeometryCount = snapshot.zones.filter(usableGeometry).length;
  const geometryComplete = snapshot.coverage.geometryComplete === true ||
    (snapshot.coverage.geometryComplete === undefined &&
      snapshot.coverage.complete &&
      snapshot.coverage.zoneCount === snapshot.zones.length &&
      usableGeometryCount === snapshot.zones.length);

  const containing = snapshot.zones
    .filter((zone) => pointInParisPressureGeometry(point, zone.geometry))
    .sort((left, right) => left.id.localeCompare(right.id));
  const containingZone = containing[0];
  if (containingZone) {
    const distanceToCentroidKm = parisPressureDistanceKm(point, containingZone.centroid);
    return {
      zoneId: containingZone.id,
      zoneLabel: containingZone.label,
      geographicLevel: containingZone.geographicLevel,
      matchMethod: "point-in-polygon",
      distanceToCentroidKm,
      approximationWarning: null,
      distanceToZoneKm: distanceToCentroidKm,
      humanPressure: containingZone.humanPressure,
      cleanlinessPrior: containingZone.signals.cleanlinessPrior,
      signals: containingZone.signals,
    };
  }

  if (geometryComplete) return null;

  let nearest: { zone: ParisPressureZone; distanceKm: number } | null = null;
  for (const zone of snapshot.zones.filter((candidate) => !usableGeometry(candidate))) {
    const distanceKm = parisPressureDistanceKm(point, zone.centroid);
    if (
      nearest === null ||
      distanceKm < nearest.distanceKm ||
      (distanceKm === nearest.distanceKm && zone.id < nearest.zone.id)
    ) {
      nearest = { zone, distanceKm };
    }
  }
  if (nearest === null || nearest.distanceKm > PARIS_PRESSURE_LOOKUP_RADIUS_KM) {
    return null;
  }

  return {
    zoneId: nearest.zone.id,
    zoneLabel: nearest.zone.label,
    geographicLevel: nearest.zone.geographicLevel,
    matchMethod: "nearest-centroid-fallback",
    distanceToCentroidKm: nearest.distanceKm,
    approximationWarning:
      "Approximation : aucune géométrie IRIS exploitable ne contient ce point ; rattachement au centroïde dans le rayon borné.",
    distanceToZoneKm: nearest.distanceKm,
    humanPressure: nearest.zone.humanPressure,
    cleanlinessPrior: nearest.zone.signals.cleanlinessPrior,
    signals: nearest.zone.signals,
  };
}
