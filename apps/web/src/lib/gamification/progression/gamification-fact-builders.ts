import type { ActionRow } from "./progression-types";
import type { GamificationSourceFact } from "./gamification-reconstruction";
import { occurredOnFrom } from "./gamification-fact-timestamps";

export function dateOf(row: Pick<ActionRow, "action_date" | "created_at">): string {
  return occurredOnFrom(row.action_date || row.created_at);
}

export function sourceFact(
  input: Omit<GamificationSourceFact, "statusPhase">,
): GamificationSourceFact {
  return { ...input, statusPhase: "validated" };
}
