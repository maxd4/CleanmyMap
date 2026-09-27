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
  metadata?: Record<string, unknown> | null;
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

function proofSourceId(event: MilestoneEvent | null): string | null {
  const actionId = event?.metadata?.actionId;
  return typeof actionId === "string" && actionId.trim().length > 0
    ? actionId
    : event?.source_id ?? null;
}

export function buildCurrentMilestones(input: {
  completeActionsCount: number;
  events?: readonly MilestoneEvent[];
}): GamificationMilestoneState[] {
  const events = input.events ?? [];
  const firstTraceEvent = recordedEvent(events, "first_trace_utile");
  const loopEvent = recordedEvent(events, "action_loop_completed");
  const mobilizerEvent = recordedEvent(events, "action_mobilizer");
  const participationRecoveredEvent = recordedEvent(events, "action_participation_recovered");
  const exemplaryDataEvent = recordedEvent(events, "action_exemplary_data");
  const documentedRouteEvent = recordedEvent(events, "action_documented_route");
  const traceableMeasurementEvent = recordedEvent(events, "action_traceable_measurement");
  const documentedSortingEvent = recordedEvent(events, "action_documented_sorting");
  const formalitiesPreparedEvent = recordedEvent(events, "action_formalities_prepared");
  const referralEvent = recordedEvent(events, "community_referral_invite");
  const firstModerationEvent = recordedEvent(events, "moderation_first_case");
  const firstParticipationModerationEvent = recordedEvent(
    events,
    "moderation_first_participation",
  );
  const firstImpactCorrectionEvent = recordedEvent(
    events,
    "moderation_first_impact_correction",
  );
  const versatileModeratorEvent = recordedEvent(events, "moderation_multi_family");

  const eventsByMilestone: Record<string, MilestoneEvent | null> = {
    premiere_trace_utile: firstTraceEvent,
    trace_fondatrice: loopEvent ?? firstTraceEvent,
    boucle_bouclee: loopEvent,
    mobilisateur: mobilizerEvent,
    participation_retrouvee: participationRecoveredEvent,
    donnee_exemplaire: exemplaryDataEvent,
    parcours_documente: documentedRouteEvent,
    mesure_tracable: traceableMeasurementEvent,
    tri_documente: documentedSortingEvent,
    formalites_preparees: formalitiesPreparedEvent,
    parrainage_utile: referralEvent,
    premiere_moderation: firstModerationEvent,
    premiere_validation_participation: firstParticipationModerationEvent,
    premiere_correction_impact_justifiee: firstImpactCorrectionEvent,
    moderateur_polyvalent: versatileModeratorEvent,
  };

  return CURRENT_MILESTONES.map((milestone) => {
    const event = eventsByMilestone[milestone.id] ?? null;

    return {
      ...milestone,
      unlocked: event !== null,
      recordedXp:
        event && milestone.xpAwarded > 0
          ? Math.max(0, Number(event.xp_awarded) || 0)
          : 0,
      proofSourceId: proofSourceId(event),
    };
  });
}
