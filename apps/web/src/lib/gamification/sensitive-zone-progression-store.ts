import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRow, EventInsertParams } from "./progression-types";
import {
  parseStoredSensitiveZoneQualification,
  planSensitiveZoneProjection,
  SENSITIVE_ZONE_MILESTONE_EVENT_TYPE,
  SENSITIVE_ZONE_MILESTONE_SOURCE_TABLE,
  SENSITIVE_ZONE_PROOF_EVENT_TYPE,
  SENSITIVE_ZONE_PROOF_SOURCE_TABLE,
  type SensitiveZoneProjectionState,
} from "./sensitive-zone-progression";
import {
  loadCurrentSensitiveZoneAreas,
  SENSITIVE_ZONE_RULE_VERSION,
} from "./sensitive-zone-qualification";

export type SensitiveZoneSyncOptions = {
  sensitiveAreas?: string[];
  projectionState?: SensitiveZoneProjectionState;
  assessedAt?: string;
};

async function loadSensitiveZoneProjectionState(
  supabase: SupabaseClient,
  userId: string,
): Promise<SensitiveZoneProjectionState> {
  const [qualificationsResult, milestonesResult] = await Promise.all([
    supabase
      .from("progression_events")
      .select("source_id, metadata")
      .eq("user_id", userId)
      .eq("event_type", SENSITIVE_ZONE_PROOF_EVENT_TYPE)
      .eq("source_table", SENSITIVE_ZONE_PROOF_SOURCE_TABLE)
      .eq("status_phase", "validated")
      .limit(12000),
    supabase
      .from("progression_events")
      .select("source_id")
      .eq("user_id", userId)
      .eq("event_type", SENSITIVE_ZONE_MILESTONE_EVENT_TYPE)
      .eq("source_table", SENSITIVE_ZONE_MILESTONE_SOURCE_TABLE)
      .eq("status_phase", "validated")
      .limit(12000),
  ]);

  if (qualificationsResult.error) {
    throw new Error(qualificationsResult.error.message);
  }
  if (milestonesResult.error) {
    throw new Error(milestonesResult.error.message);
  }

  const qualifications = (qualificationsResult.data ?? [])
    .map((row) => parseStoredSensitiveZoneQualification(row.source_id, row.metadata))
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const milestoneThresholds = (milestonesResult.data ?? [])
    .map((row) => String(row.source_id ?? ""))
    .map((sourceId) => sourceId.match(/^sensitive-zone:threshold:(\d+)$/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  return { qualifications, milestoneThresholds };
}

export async function syncSensitiveZoneProjection(params: {
  supabase: SupabaseClient;
  userId: string;
  actions: Pick<
    ActionRow,
    "id" | "location_label" | "action_date" | "created_at" | "status"
  >[];
  validatedActionIds: Set<string>;
  options: SensitiveZoneSyncOptions;
  writeEvent: (params: EventInsertParams) => Promise<boolean>;
}): Promise<void> {
  const existing =
    params.options.projectionState ??
    (await loadSensitiveZoneProjectionState(params.supabase, params.userId));
  const existingActionIds = new Set(
    existing.qualifications.map((qualification) => qualification.snapshot.actionId),
  );
  const needsQualification = params.actions.some(
    (action) =>
      action.status === "approved" &&
      params.validatedActionIds.has(action.id) &&
      !existingActionIds.has(action.id),
  );
  const sensitiveAreas =
    params.options.sensitiveAreas ??
    (needsQualification ? await loadCurrentSensitiveZoneAreas(params.supabase) : []);
  const assessedAt = params.options.assessedAt ?? new Date().toISOString();
  const plan = planSensitiveZoneProjection({
    actions: params.actions,
    validatedActionIds: params.validatedActionIds,
    existing,
    sensitiveAreas,
    assessedAt,
  });

  if (plan.qualificationSourceIdsToRemove.length > 0) {
    const deleted = await params.supabase
      .from("progression_events")
      .delete()
      .eq("user_id", params.userId)
      .eq("event_type", SENSITIVE_ZONE_PROOF_EVENT_TYPE)
      .eq("source_table", SENSITIVE_ZONE_PROOF_SOURCE_TABLE)
      .eq("status_phase", "validated")
      .in("source_id", plan.qualificationSourceIdsToRemove);
    if (deleted.error) {
      throw new Error(deleted.error.message);
    }
  }

  if (plan.milestoneThresholdsToRemove.length > 0) {
    const deleted = await params.supabase
      .from("progression_events")
      .delete()
      .eq("user_id", params.userId)
      .eq("event_type", SENSITIVE_ZONE_MILESTONE_EVENT_TYPE)
      .eq("source_table", SENSITIVE_ZONE_MILESTONE_SOURCE_TABLE)
      .eq("status_phase", "validated")
      .in(
        "source_id",
        plan.milestoneThresholdsToRemove.map(
          (threshold) => `sensitive-zone:threshold:${threshold}`,
        ),
      );
    if (deleted.error) {
      throw new Error(deleted.error.message);
    }
  }

  for (const snapshot of plan.qualificationsToInsert) {
    await params.writeEvent({
      userId: params.userId,
      eventType: SENSITIVE_ZONE_PROOF_EVENT_TYPE,
      sourceTable: SENSITIVE_ZONE_PROOF_SOURCE_TABLE,
      sourceId: snapshot.actionId,
      statusPhase: "validated",
      weight: 1,
      xpBase: 0,
      xpAwarded: 0,
      occurredOn: snapshot.actionDate.slice(0, 10),
      metadata: { sensitiveZone: snapshot },
    });
  }

  for (const threshold of plan.milestoneThresholdsToInsert) {
    await params.writeEvent({
      userId: params.userId,
      eventType: SENSITIVE_ZONE_MILESTONE_EVENT_TYPE,
      sourceTable: SENSITIVE_ZONE_MILESTONE_SOURCE_TABLE,
      sourceId: `sensitive-zone:threshold:${threshold}`,
      statusPhase: "validated",
      weight: 1,
      xpBase: 1,
      xpAwarded: 1,
      occurredOn: assessedAt.slice(0, 10),
      metadata: {
        ruleVersion: SENSITIVE_ZONE_RULE_VERSION,
        threshold,
        qualifiedActionCount: plan.qualifiedActionCount,
      },
    });
  }
}
