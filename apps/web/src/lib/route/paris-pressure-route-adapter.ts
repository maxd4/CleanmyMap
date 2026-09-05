import type {
  ParisPressurePoint,
  ParisPressureSnapshot,
} from "@/lib/geo/paris-pressure-contract";
import { findNearestParisPressureZone } from "@/lib/geo/paris-pressure-lookup";

/** Route-only policy: the spatial lookup itself remains owned by lib/geo. */
export const PARIS_PRESSURE_MAX_ROUTE_SCORE_BOOST = 8;

export type ParisPressureRouteCandidate = ParisPressurePoint & {
  id: string;
  score: number;
  reason: string;
};

export function applyParisPressureToCandidates<
  T extends ParisPressureRouteCandidate,
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
