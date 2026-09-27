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
  const exemplaryDataEvent = recordedEvent(events, "action_exemplary_data");
  const documentedRouteEvent = recordedEvent(events, "action_documented_route");
  const traceableMeasurementEvent = recordedEvent(events, "action_traceable_measurement");
  const documentedSortingEvent = recordedEvent(events, "action_documented_sorting");
  const formalitiesPreparedEvent = recordedEvent(events, "action_formalities_prepared");
  const referralEvent = recordedEvent(events, "community_referral_invite");

  return CURRENT_MILESTONES.map((milestone) => {
    const event = (() => {
      switch (milestone.id) {
        case "premiere_trace_utile": return firstTraceEvent;
        case "trace_fondatrice": return loopEvent ?? firstTraceEvent;
        case "boucle_bouclee": return loopEvent;
        case "mobilisateur": return mobilizerEvent;
        case "donnee_exemplaire": return exemplaryDataEvent;
        case "parcours_documente": return documentedRouteEvent;
        case "mesure_tracable": return traceableMeasurementEvent;
        case "tri_documente": return documentedSortingEvent;
        case "formalites_preparees": return formalitiesPreparedEvent;
        case "parrainage_utile": return referralEvent;
      }
    })();

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
