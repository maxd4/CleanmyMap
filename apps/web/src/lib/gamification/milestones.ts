import type {
  GamificationMilestoneState,
  ProgressionEventType,
  ProgressionStatusPhase,
} from "./progression-types";
import { CURRENT_MILESTONES } from "./progression-utils";

export type MilestoneEvent = {
  event_type: ProgressionEventType;
  status_phase: ProgressionStatusPhase;
  source_id: string;
  xp_awarded: number;
};

function recordedEvent(
  events: readonly MilestoneEvent[],
  eventType: ProgressionEventType,
): MilestoneEvent | null {
  return (
    events.find(
      (event) => event.event_type === eventType && event.status_phase === "validated",
    ) ?? null
  );
}

function isCompleteActionAvailable(
  completeActionsCount: number,
  firstTraceEvent: MilestoneEvent | null,
): boolean {
  return completeActionsCount > 0 || firstTraceEvent !== null;
}

export function buildCurrentMilestones(input: {
  completeActionsCount: number;
  events?: readonly MilestoneEvent[];
}): GamificationMilestoneState[] {
  const events = input.events ?? [];
  const firstTraceEvent = recordedEvent(events, "first_trace_utile");
  const referralEvent = recordedEvent(events, "community_referral_invite");
  const firstCompleteAction = isCompleteActionAvailable(
    Math.max(0, Math.trunc(input.completeActionsCount)),
    firstTraceEvent,
  );

  return CURRENT_MILESTONES.map((milestone) => {
    const event =
      milestone.id === "parrainage_utile" ? referralEvent : firstTraceEvent;
    const unlocked =
      milestone.id === "parrainage_utile" ? referralEvent !== null : firstCompleteAction;

    return {
      ...milestone,
      unlocked,
      recordedXp: event ? Math.max(0, Number(event.xp_awarded) || 0) : 0,
      proofSourceId: event?.source_id ?? null,
    };
  });
}
