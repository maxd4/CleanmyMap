import type { SupabaseClient } from "@supabase/supabase-js";
import { insertProgressionEvent } from "./progression-data";
import {
  buildModerationProgressionState,
  deriveResolvedModerationCases,
  DERIVED_MODERATION_EVENT_TYPES,
  RESOLVED_MODERATION_CASE_SOURCE,
  type ModerationAuditRow,
  type ResolvedModerationCase,
} from "./moderation-progression.model";
import { toIsoDate } from "./progression-utils";
import type { EventInsertParams, ProgressionEventType } from "./progression-types";

export {
  buildModerationProgressionState,
  canViewModerationProgression,
  deriveResolvedModerationCases,
  resolveModerationCaseFromAudit,
} from "./moderation-progression.model";
export type {
  ModerationAuditRow,
  ModerationCaseFamily,
  ResolvedModerationCase,
} from "./moderation-progression.model";

export async function loadResolvedModerationCasesForUser(
  supabase: SupabaseClient,
  actorUserId: string,
): Promise<ResolvedModerationCase[]> {
  const result = await supabase
    .from("admin_operations_audit")
    .select("operation_id, at, actor_user_id, operation_type, outcome, target_id, details")
    .eq("actor_user_id", actorUserId)
    .eq("operation_type", "moderation")
    .eq("outcome", "success")
    .order("at", { ascending: true })
    .limit(5000);

  if (result.error) throw new Error(result.error.message);
  return deriveResolvedModerationCases(
    (result.data ?? []) as ModerationAuditRow[],
    actorUserId,
  );
}

function moderationEvent(
  input: Omit<EventInsertParams, "eventType" | "sourceTable" | "statusPhase" | "weight"> & {
    eventType: ProgressionEventType;
    metadata?: Record<string, unknown>;
  },
): EventInsertParams {
  return {
    ...input,
    sourceTable: RESOLVED_MODERATION_CASE_SOURCE,
    statusPhase: "validated",
    weight: 1,
  };
}

type ModerationDerivedEvent = {
  eventType: Extract<ProgressionEventType, `moderation_${string}`>;
  sourceId: string;
  xp: number;
  occurredOn: string;
  metadata: Record<string, unknown>;
};

async function writeModerationEvent(
  supabase: SupabaseClient,
  userId: string,
  event: ModerationDerivedEvent,
): Promise<void> {
  await insertProgressionEvent(supabase, moderationEvent({
    userId,
    eventType: event.eventType,
    sourceId: event.sourceId,
    xpBase: event.xp,
    xpAwarded: event.xp,
    occurredOn: event.occurredOn,
    metadata: event.metadata,
  }));
}

async function writeResolvedCaseEvents(
  supabase: SupabaseClient,
  userId: string,
  cases: readonly ResolvedModerationCase[],
): Promise<void> {
  await Promise.all(cases.map((resolvedCase) => writeModerationEvent(supabase, userId, {
    eventType: "moderation_case_resolved",
    sourceId: resolvedCase.caseId,
    xp: 0,
    occurredOn: resolvedCase.occurredOn,
    metadata: {
      family: resolvedCase.family,
      operation: resolvedCase.operation,
      auditOperationId: resolvedCase.auditOperationId,
    },
  })));
}

async function writeTierEvents(
  supabase: SupabaseClient,
  userId: string,
  cases: readonly ResolvedModerationCase[],
): Promise<void> {
  const thresholds = [1, 3, 5, 8, 10, 15, 20].filter(
    (threshold) => cases.length >= threshold,
  );
  const infiniteThresholds = cases.length >= 25
    ? Array.from({ length: Math.floor((cases.length - 25) / 5) + 1 }, (_, index) => 25 + index * 5)
    : [];
  const occurredOn = cases[0]?.occurredOn ?? toIsoDate(null);
  const currentValue = buildModerationProgressionState(cases.length).currentValue;
  await Promise.all([...thresholds, ...infiniteThresholds].map((threshold) =>
    writeModerationEvent(supabase, userId, {
      eventType: "moderation_tier_unlock",
      sourceId: `${userId}:moderation-tier:${threshold}`,
      xp: 1,
      occurredOn,
      metadata: { threshold, resolvedModerationCases: currentValue },
    }),
  ));
}

function buildModerationOneShotEvents(
  userId: string,
  cases: readonly ResolvedModerationCase[],
): ModerationDerivedEvent[] {
  const firstCase = cases[0];
  const events: ModerationDerivedEvent[] = firstCase
    ? [{
        eventType: "moderation_first_case",
        sourceId: `${userId}:moderation-first-case`,
        xp: 0,
        occurredOn: firstCase.occurredOn,
        metadata: { caseId: firstCase.caseId },
      }]
    : [];
  const firstParticipation = cases.find((item) => item.family === "participation");
  if (firstParticipation) {
    events.push({
      eventType: "moderation_first_participation",
      sourceId: `${userId}:moderation-first-participation`,
      xp: 0,
      occurredOn: firstParticipation.occurredOn,
      metadata: { caseId: firstParticipation.caseId },
    });
  }
  const firstImpactCorrection = cases.find((item) => item.operation === "correct_impact");
  if (firstImpactCorrection) {
    events.push({
      eventType: "moderation_first_impact_correction",
      sourceId: `${userId}:moderation-first-impact-correction`,
      xp: 0,
      occurredOn: firstImpactCorrection.occurredOn,
      metadata: { caseId: firstImpactCorrection.caseId },
    });
  }
  const families = new Set(cases.map((item) => item.family));
  if (families.size === 3 && ["action", "participation", "clean_place"].every((family) => families.has(family as never))) {
    events.push({
      eventType: "moderation_multi_family",
      sourceId: `${userId}:moderation-multi-family`,
      xp: 1,
      occurredOn: firstCase?.occurredOn ?? toIsoDate(null),
      metadata: { families: [...families], resolvedModerationCases: cases.length },
    });
  }
  return events;
}

export async function reconcileModerationProgressionForUser(
  supabase: SupabaseClient,
  actorUserId: string,
): Promise<ResolvedModerationCase[]> {
  const cases = await loadResolvedModerationCasesForUser(supabase, actorUserId);
  const removal = await supabase
    .from("progression_events")
    .delete()
    .eq("user_id", actorUserId)
    .eq("source_table", RESOLVED_MODERATION_CASE_SOURCE)
    .in("event_type", [...DERIVED_MODERATION_EVENT_TYPES]);
  if (removal.error) throw new Error(removal.error.message);

  await writeResolvedCaseEvents(supabase, actorUserId, cases);
  await writeTierEvents(supabase, actorUserId, cases);
  await Promise.all(
    buildModerationOneShotEvents(actorUserId, cases).map((event) =>
      writeModerationEvent(supabase, actorUserId, event),
    ),
  );

  return cases;
}
