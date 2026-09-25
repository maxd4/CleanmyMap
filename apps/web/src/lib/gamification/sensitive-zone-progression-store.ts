import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRow, EventInsertParams } from "./progression-types";
import {
  parseStoredSensitiveZoneQualification,
  planSensitiveZoneProjection,
  SENSITIVE_ZONE_PROOF_EVENT_TYPE,
  SENSITIVE_ZONE_PROOF_SOURCE_TABLE,
  type SensitiveZoneProjectionState,
} from "./sensitive-zone-progression";
import { loadCurrentSensitiveZoneAreas } from "./sensitive-zone-qualification";

export type SensitiveZoneSyncOptions = {
  sensitiveAreas?: string[];
  projectionState?: SensitiveZoneProjectionState;
  assessedAt?: string;
};

async function loadSensitiveZoneProjectionState(
  supabase: SupabaseClient,
  userId: string,
): Promise<SensitiveZoneProjectionState> {
  const qualificationsResult = await supabase
    .from("progression_events")
    .select("source_id, metadata")
    .eq("user_id", userId)
    .eq("event_type", SENSITIVE_ZONE_PROOF_EVENT_TYPE)
    .eq("source_table", SENSITIVE_ZONE_PROOF_SOURCE_TABLE)
    .eq("status_phase", "validated")
    .limit(12000);

  if (qualificationsResult.error) {
    throw new Error(qualificationsResult.error.message);
  }

  const qualifications = (qualificationsResult.data ?? [])
    .map((row) => parseStoredSensitiveZoneQualification(row.source_id, row.metadata))
    .filter((row): row is NonNullable<typeof row> => row !== null);
  // Historical sensitive-zone milestone events remain in the ledger, but are
  // deliberately not loaded into the CURRENT projection state: they must not
  // be replayed, revoked, or used to create new XP.
  return { qualifications };
}

export async function syncSensitiveZoneProjection(params: {
  supabase: SupabaseClient;
  userId: string;
  actions: ActionRow[];
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
}
