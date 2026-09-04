import type {
  ParisPressurePoint,
  ParisPressureSnapshot,
  ParisPressureZone,
} from "./paris-pressure-contract";
import { routeDistanceKm } from "@/lib/route/route-planner";

export const PARIS_PRESSURE_LOOKUP_RADIUS_KM = 1.5;
export const PARIS_PRESSURE_MAX_ROUTE_SCORE_BOOST = 8;

export type ParisPressureAtPoint = {
  zoneId: string;
  zoneLabel: string;
  distanceToZoneKm: number;
  humanPressure: number | null;
  cleanlinessPrior: ParisPressureZone["signals"]["cleanlinessPrior"];
  signals: ParisPressureZone["signals"];
};

function isPointInParis(point: ParisPressurePoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    point.latitude >= 48.80 &&
    point.latitude <= 48.91 &&
    Number.isFinite(point.longitude) &&
    point.longitude >= 2.20 &&
    point.longitude <= 2.48
  );
}
export function findNearestParisPressureZone(
  point: ParisPressurePoint,
  snapshot: ParisPressureSnapshot,
): ParisPressureAtPoint | null {
  if (!isPointInParis(point) || snapshot.zones.length === 0) return null;

  let nearest: { zone: ParisPressureZone; distanceKm: number } | null = null;
  for (const zone of snapshot.zones) {
    const distanceKm = routeDistanceKm(point, zone.centroid);
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
    distanceToZoneKm: nearest.distanceKm,
    humanPressure: nearest.zone.humanPressure,
    cleanlinessPrior: nearest.zone.signals.cleanlinessPrior,
    signals: nearest.zone.signals,
  };
}

export type ParisPressureCandidate = ParisPressurePoint & {
  id: string;
  score: number;
  reason: string;
};

export function applyParisPressureToCandidates<
  T extends ParisPressureCandidate,
>(candidates: T[], snapshot: ParisPressureSnapshot): T[] {
  return candidates
    .map((candidate) => {
      const pressure = findNearestParisPressureZone(candidate, snapshot);
      if (pressure?.humanPressure === null || pressure?.humanPressure === undefined) {
        return candidate;
      }
      const scoreContribution =
        pressure.humanPressure * PARIS_PRESSURE_MAX_ROUTE_SCORE_BOOST;
      return {
        ...candidate,
        score: Math.min(100, candidate.score + scoreContribution),
        reason:
          `${candidate.reason} Pression humaine structurelle=${pressure.humanPressure.toFixed(3)}` +
          ` (zone ${pressure.zoneId}, contribution=${scoreContribution.toFixed(2)}).`,
        parisPressure: pressure,
      } as T;
    })
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
