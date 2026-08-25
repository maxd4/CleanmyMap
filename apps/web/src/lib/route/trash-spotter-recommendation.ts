import type { TrashSpotterActionableCandidate } from "@/lib/actions/trash-spotter-actionable-candidates";
import { isVolunteerRouteEligible } from "@/lib/actions/trash-spotter-actionable-candidates";
import { formatScorePercent } from "@/lib/formatters/score";

export type TrashSpotterRouteConstraints = {
  accessibility: "standard" | "accessible" | "strict";
  security: "standard" | "renforced";
  weather: "ok" | "rain" | "wind" | "heat" | "cold";
};

export type TrashSpotterRouteCandidate =
  TrashSpotterActionableCandidate & {
    score: number;
    reason: string;
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

function constraintPenalty(constraints: TrashSpotterRouteConstraints): number {
  const weatherPenalty =
    constraints.weather === "ok"
      ? 0
      : constraints.weather === "rain" || constraints.weather === "wind"
        ? 6
        : 4;
  const accessibilityPenalty =
    constraints.accessibility === "strict"
      ? 6
      : constraints.accessibility === "accessible"
        ? 2
        : 0;
  const securityPenalty = constraints.security === "renforced" ? 4 : 0;
  return weatherPenalty + accessibilityPenalty + securityPenalty;
}

export function buildTrashSpotterRouteCandidates(
  candidates: TrashSpotterActionableCandidate[],
  constraints: TrashSpotterRouteConstraints,
  now = new Date(),
): TrashSpotterRouteCandidate[] {
  const penalty = constraintPenalty(constraints);

  return candidates
    .filter(isVolunteerRouteEligible)
    .map((candidate) => {
      const freshness = freshnessScore(candidate.observedAt, now);
      const score = Math.max(0, freshness - penalty);
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

      return {
        ...candidate,
        score,
        reason: `Signalement validé il y a ${ageDays} jour(s), catégories=${categories}; fraîcheur=${formatScorePercent(freshness, 0)}, contraintes météo=${constraints.weather}, sécurité=${constraints.security}.`,
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
