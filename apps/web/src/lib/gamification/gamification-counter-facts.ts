import { EXPLORER_TIERS, PARTICIPANT_TIERS } from "./badges/families";
import { occurredOnAtThreshold, occurredOnFrom } from "./gamification-fact-timestamps";
import type { GamificationSourceFact } from "./gamification-reconstruction";

function sourceFact(input: Omit<GamificationSourceFact, "statusPhase">): GamificationSourceFact {
  return { ...input, statusPhase: "validated" };
}

export function appendCounterFacts(
  facts: GamificationSourceFact[],
  userId: string,
  counters: { participationCount: number; visitedPlacesCount: number },
  visitedRows: unknown[],
  participantRows: unknown[],
): void {
  const participationFactRows = participantRows as Array<{ joined_at?: string; updated_at?: string }>;
  const visitedFactRows = visitedRows as Array<{ place_label?: string; created_at?: string }>;
  for (const tier of PARTICIPANT_TIERS) {
    if (tier.threshold > 0 && counters.participationCount >= tier.threshold) {
      facts.push(sourceFact({
        mechanicId: "participation",
        eventType: "participant_tier_unlock",
        sourceTable: "action_participants",
        sourceId: `participant:${tier.id}`,
        occurredOn: occurredOnAtThreshold(participationFactRows, tier.threshold, (row) => row.joined_at ?? row.updated_at),
        xpAwarded: tier.xp,
        threshold: tier.threshold,
        badgeId: tier.id,
        metadata: { tier: tier.id },
      }));
    }
  }
  for (const tier of EXPLORER_TIERS) {
    if (tier.min > 0 && counters.visitedPlacesCount >= tier.min) {
      facts.push(sourceFact({
        mechanicId: "exploration",
        eventType: "explorer_tier_unlock",
        sourceTable: "user_visited_places",
        sourceId: `tier:${tier.id}`,
        occurredOn: occurredOnAtThreshold(visitedFactRows, tier.min, (row) => row.created_at),
        xpAwarded: 1,
        threshold: tier.min,
        badgeId: tier.id,
        metadata: { tier: tier.id },
      }));
    }
  }

  for (const row of visitedFactRows) {
    const placeLabel = row.place_label?.trim().toLowerCase();
    if (!placeLabel) continue;
    facts.push(sourceFact({
      mechanicId: "exploration",
      eventType: "new_place_discovered",
      sourceTable: "user_visited_places",
      sourceId: `${userId}:${placeLabel}`,
      occurredOn: occurredOnFrom(row.created_at),
      xpAwarded: 1,
      metadata: { locationLabel: placeLabel },
    }));
  }
  for (const milestone of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].filter((value) => counters.visitedPlacesCount >= value)) {
    facts.push(sourceFact({
      mechanicId: "exploration",
      eventType: "new_place_milestone",
      sourceTable: "user_visited_places",
      sourceId: `${userId}:milestone:${milestone}`,
      occurredOn: occurredOnAtThreshold(visitedFactRows, milestone, (row) => row.created_at),
      xpAwarded: 1,
      threshold: milestone,
      metadata: { milestone },
    }));
  }
}
