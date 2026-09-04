import type { TrashSpotterActionableCandidate } from "@/lib/actions/trash-spotter-actionable-candidates";
import { isVolunteerRouteEligible } from "@/lib/actions/trash-spotter-actionable-candidates";
import { formatScorePercent } from "@/lib/formatters/score";
import type { RouteEventCandidatePressure } from "./route-event-pressure";
import type { RouteObservedEvidence } from "./route-predicted-targets";

export type TrashSpotterRouteCandidate =
  TrashSpotterActionableCandidate & {
    score: number;
    reason: string;
    baseScore: number;
  eventPressure: RouteEventCandidatePressure | null;
  eventScoreContribution: number;
  family?: "observed";
  evidence?: RouteObservedEvidence;
  };

export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const latitudeKm = (a.latitude - b.latitude) * 111;
  const longitudeKm = (a.longitude - b.longitude) * 73;
  return Math.sqrt(latitudeKm * latitudeKm + longitudeKm * longitudeKm);
}

export function freshnessScore(
  observedAt: string,
  now = new Date(),
): number {
  const observedTime = new Date(observedAt).getTime();
  if (!Number.isFinite(observedTime)) {
    return 0;
  }

  const ageDays = Math.max(0, (now.getTime() - observedTime) / 86_400_000);
  return Math.max(0, Math.min(100, 100 - (ageDays / 120) * 100));
}

export function buildTrashSpotterRouteCandidates(
  candidates: TrashSpotterActionableCandidate[],
  now = new Date(),
  eventPressureByCandidateId: ReadonlyMap<
    string,
    RouteEventCandidatePressure
  > = new Map(),
): TrashSpotterRouteCandidate[] {
  return candidates
    .filter(isVolunteerRouteEligible)
    .map((candidate) => {
      const freshness = freshnessScore(candidate.observedAt, now);
      const ageDays = Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(candidate.observedAt).getTime()) /
            86_400_000,
        ),
      );
      const categories =
        candidate.wasteCategories.length > 0
          ? candidate.wasteCategories.join(", ")
          : "catégories non renseignées";
      const eventPressure = eventPressureByCandidateId.get(candidate.id) ?? null;
      const score = Math.min(100, freshness + (eventPressure?.scoreBoost ?? 0));
      const eventReason = eventPressure
        ? ` pression post-événement=${eventPressure.combinedPressure.toFixed(3)} (${eventPressure.contributions.length} événement(s), contribution=${eventPressure.scoreBoost.toFixed(2)}).`
        : "";

      return {
        ...candidate,
        score,
        baseScore: freshness,
        eventPressure,
        eventScoreContribution: score - freshness,
        family: "observed" as const,
        evidence: {
          family: "observed" as const,
          source: "trash_spotter_spots" as const,
          proof: "validated" as const,
          observedAt: candidate.observedAt,
        },
        reason: `Signalement validé il y a ${ageDays} jour(s), catégories=${categories}; fraîcheur=${formatScorePercent(freshness, 0)}.${eventReason}`,
      };
    })
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

export function selectNextTrashSpotterStop(
  current: TrashSpotterRouteCandidate,
  candidates: TrashSpotterRouteCandidate[],
  priorityWeight: number,
  distanceWeight: number,
): TrashSpotterRouteCandidate | undefined {
  let bestCandidate: TrashSpotterRouteCandidate | undefined;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = distanceKm(current, candidate);
    const value = candidate.score * priorityWeight - distance * 8 * distanceWeight;
    if (value > bestValue) {
      bestValue = value;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}
