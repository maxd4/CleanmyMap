import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import type { ActionQualityGrade } from "@/lib/actions/quality/quality-rules";
import { awardActionMilestonesForUserWithDependencies } from "./action-milestone-awards";
import { writeActionProgressionEvents } from "./action-progression-events";
import { auditXpAttribution } from "./notifications";
import { loadActionRowsForUser, loadCurrentValidatedActionIdsForUser } from "./progression-action-queries";
import { parseAssociationNameFromActionNotes } from "./progression-action-projections";
import { insertProgressionEvent } from "./progression-event-writer";
import {
  computeActionPendingAward,
  computeActionValidationAward,
  evaluateActionQualityScore,
  inferActionWeight,
  toIsoDate,
} from "./progression-utils";
import type { ActionRow, EventInsertParams } from "./progression-types";
import { syncSensitiveZoneProjection, type SensitiveZoneSyncOptions } from "./sensitive-zone-progression-store";

const CURRENT_ACTION_SYNC_EVENT_TYPES = [
  "action_declare_validation",
  "action_monthly_regularity",
  "action_balance_cycle",
] as const;

export async function awardActionMilestonesForUser(
  supabase: SupabaseClient,
  userId: string,
  actions: ActionRow[],
  options: { validationQualityGrades?: ReadonlyMap<string, ActionQualityGrade> } = {},
): Promise<number> {
  return awardActionMilestonesForUserWithDependencies(
    supabase,
    userId,
    actions,
    {
      loadValidatedActionIds: loadCurrentValidatedActionIdsForUser,
      insertProgressionEvent,
    },
    options,
  );
}

export async function syncUserActionProgression(
  supabase: SupabaseClient,
  userId: string,
  options: SensitiveZoneSyncOptions = {},
): Promise<number> {
  for (const eventType of CURRENT_ACTION_SYNC_EVENT_TYPES) {
    const deleted = await supabase
      .from("progression_events")
      .delete()
      .eq("user_id", userId)
      .eq("source_table", "actions")
      .eq("event_type", eventType);
    if (deleted.error) throw new Error(deleted.error.message);
  }

  const actions = await loadActionRowsForUser(supabase, userId);
  const validatedActionIds = await loadCurrentValidatedActionIdsForUser(supabase, userId, {
    actionRows: actions,
  });
  const validationQualityGrades = new Map<string, ActionQualityGrade>();
  await syncSensitiveZoneProjection({
    supabase,
    userId,
    actions,
    validatedActionIds,
    options,
    writeEvent: (params: EventInsertParams) => insertProgressionEvent(supabase, params),
  });

  let validatedActionCount = 0;
  for (const action of actions) {
    const associationName = parseAssociationNameFromActionNotes(action.notes);
    const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, action.id).catch(() => []);
    const organizerCount = Math.max(1, organizerIds.length);
    const weight = inferActionWeight(action);
    const pendingAward = computeActionPendingAward(weight);
    await insertProgressionEvent(supabase, {
      userId,
      eventType: "action_declare_pending",
      sourceTable: "actions",
      sourceId: action.id,
      statusPhase: "pending",
      weight,
      xpBase: pendingAward.xpBase,
      xpAwarded: pendingAward.xpAwarded,
      occurredOn: toIsoDate(action.action_date || action.created_at),
      metadata: { associationName },
    });

    if (action.status !== "approved" || !validatedActionIds.has(action.id)) continue;
    const quality = evaluateActionQualityScore(action);
    validationQualityGrades.set(action.id, quality.grade);
    const validatedAward = computeActionValidationAward(weight, quality.grade, organizerCount);
    await insertProgressionEvent(supabase, {
      userId,
      eventType: "action_declare_validation",
      sourceTable: "actions",
      sourceId: action.id,
      statusPhase: "validated",
      weight,
      xpBase: validatedAward.xpBase,
      xpAwarded: validatedAward.xpAwarded,
      occurredOn: toIsoDate(action.action_date || action.created_at),
      metadata: {
        qualityGrade: quality.grade,
        qualityScore: quality.score,
        associationName,
        organizerCount,
        organizerShare: validatedAward.xpAwarded,
      },
    });

    await auditXpAttribution(
      supabase,
      userId,
      null,
      "Action validée",
      validatedAward.xpAwarded,
      "actions",
      action.id,
      {
        qualityGrade: quality.grade,
        qualityScore: quality.score,
        sourceEvent: "action_validated_current",
        organizerCount,
        organizerShare: validatedAward.xpAwarded,
      },
    ).catch(() => undefined);
    validatedActionCount += 1;
  }

  await writeActionProgressionEvents({
    userId,
    actions,
    validatedActionIds,
    writeEvent: (params) => insertProgressionEvent(supabase, params),
  });
  await awardActionMilestonesForUser(supabase, userId, actions, { validationQualityGrades });
  return validatedActionCount;
}
