import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionQualityGrade } from "@/lib/actions/quality/quality-rules";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { logFailure } from "@/lib/logging/failure-log";
import {
  actionMilestoneSourceId,
  assessActionMilestones,
} from "./action-milestones";
import type { ActionRow, EventInsertParams } from "./progression-types";

type ActionMilestoneAwardOptions = {
  validationQualityGrades?: ReadonlyMap<string, ActionQualityGrade>;
};

type ActionMilestoneAwardDependencies = {
  loadValidatedActionIds: (
    supabase: SupabaseClient,
    userId: string,
    options: { actionRows: ActionRow[] },
  ) => Promise<Set<string>>;
  insertProgressionEvent: (
    supabase: SupabaseClient,
    params: EventInsertParams,
  ) => Promise<boolean>;
};

async function loadConfirmedParticipantUserIdsByAction(
  supabase: SupabaseClient,
  actionIds: readonly string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (actionIds.length === 0) return result;

  try {
    const query = await supabase
      .from("action_participants")
      .select("action_id, user_id, participation_status")
      .in("action_id", [...new Set(actionIds)])
      .eq("participation_status", "confirmed");

    if (query.error) {
      logFailure("Gamification", "Confirmed action participants load failed", query.error);
      return result;
    }

    for (const row of (query.data ?? []) as Array<{
      action_id?: string | null;
      user_id?: string | null;
    }>) {
      if (!row.action_id || !row.user_id) continue;
      const users = result.get(row.action_id) ?? [];
      if (!users.includes(row.user_id)) users.push(row.user_id);
      result.set(row.action_id, users);
    }
  } catch (error) {
    // A missing participant read cannot prove a mobilizer milestone.
    logFailure("Gamification", "Confirmed action participants query unavailable", error);
  }

  return result;
}

async function loadValidationQualityGradesForUser(
  supabase: SupabaseClient,
  userId: string,
  actionIds: readonly string[],
): Promise<Map<string, ActionQualityGrade>> {
  const result = new Map<string, ActionQualityGrade>();
  if (actionIds.length === 0) return result;

  try {
    const query = await supabase
      .from("progression_events")
      .select("source_id, metadata")
      .eq("user_id", userId)
      .eq("event_type", "action_declare_validation")
      .eq("status_phase", "validated")
      .in("source_id", [...new Set(actionIds)]);

    if (query.error) {
      logFailure("Gamification", "Action validation quality snapshot load failed", query.error, {
        userId,
      });
      return result;
    }

    for (const row of (query.data ?? []) as Array<{
      source_id?: string | null;
      metadata?: { qualityGrade?: unknown } | null;
    }>) {
      const grade = row.metadata?.qualityGrade;
      if (row.source_id && (grade === "A" || grade === "B" || grade === "C")) {
        result.set(row.source_id, grade);
      }
    }
  } catch (error) {
    logFailure("Gamification", "Action validation quality snapshot query unavailable", error, {
      userId,
    });
  }

  return result;
}

export async function awardActionMilestonesForUserWithDependencies(
  supabase: SupabaseClient,
  userId: string,
  actions: ActionRow[],
  dependencies: ActionMilestoneAwardDependencies,
  options: ActionMilestoneAwardOptions = {},
): Promise<number> {
  const validatedActionIds = await dependencies.loadValidatedActionIds(supabase, userId, {
    actionRows: actions,
  });
  const validatedActions = actions.filter((action) => validatedActionIds.has(action.id));
  const validationQualityGrades = options.validationQualityGrades ??
    await loadValidationQualityGradesForUser(
      supabase,
      userId,
      validatedActions.map((action) => action.id),
    );
  const confirmedParticipants = await loadConfirmedParticipantUserIdsByAction(
    supabase,
    validatedActions.map((action) => action.id),
  );
  let inserted = 0;

  const orderedActions = [...validatedActions].sort((left, right) =>
    `${left.action_date}|${left.created_at}`.localeCompare(`${right.action_date}|${right.created_at}`),
  );

  for (const action of orderedActions) {
    const canonicalOrganizerIds = await loadActionOrganizerIdsForAction(
      supabase,
      action.id,
      action.created_by_clerk_id,
    ).catch(() => [action.created_by_clerk_id].filter(Boolean));
    const qualityGrade = validationQualityGrades.get(action.id) ?? null;
    const assessments = assessActionMilestones({
      action,
      userId,
      canonicalOrganizerIds,
      confirmedParticipantUserIds: confirmedParticipants.get(action.id) ?? [],
      validationQualityGrade: qualityGrade,
    });

    for (const assessment of assessments) {
      if (!assessment.qualified) continue;
      inserted += Number(await dependencies.insertProgressionEvent(supabase, {
        userId,
        eventType: assessment.eventType,
        sourceTable: "action_milestones",
        sourceId: actionMilestoneSourceId(assessment.id),
        statusPhase: "validated",
        weight: 1,
        xpBase: assessment.xpAwarded,
        xpAwarded: assessment.xpAwarded,
        occurredOn: toIsoDate(action.action_date || action.created_at),
        metadata: {
          actionId: action.id,
          milestoneId: assessment.id,
          qualityGrade,
          reason: assessment.reason,
        },
      }));
    }
  }

  return inserted;
}

function toIsoDate(value: string): string {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : value;
}
