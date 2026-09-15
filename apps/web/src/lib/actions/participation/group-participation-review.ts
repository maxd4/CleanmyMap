import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { runSingleActionQuery } from "@/lib/actions/query";
import type { ActionPhase } from "@/lib/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTION_PARTICIPATION_COLUMNS,
  ADMIN_PARTICIPATION_SOURCE,
  ACTIVE_PARTICIPATION_STATUS,
  countParticipantsForAction,
  escapeSearchPattern,
  insertParticipantRecord,
  loadParticipantProfilesForUserIds,
  PENDING_PARTICIPATION_STATUS,
  POST_ACTION_CLAIM_PARTICIPATION_SOURCE,
  readParticipantRecord,
  readParticipantRecordById,
  resolveJoinedAt,
  updateParticipantRecord,
  type ParticipantSearchRow,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";
import {
  countActiveRegistrationsForAction,
  insertActionRegistrationRecord,
  readActionRegistrationRecord,
  readActionRegistrationRecordById,
  resolveRegisteredAt,
  updateActionRegistrationRecord,
} from "./registration-records";
import {
  runActionParticipationStep,
  type ActionParticipationReviewItem,
  type ParticipationAuditValue,
  type ActionParticipationSearchItem,
} from "./group-participation-contract";

type ParticipationRecord = {
  id: string;
  action_id: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  status: ParticipationStatus;
  source: ParticipationSource;
  joined_at: string;
};

function usesRegistrationStore(actionPhase?: ActionPhase): boolean {
  return actionPhase === "pre_action" || actionPhase === "post_action_draft";
}

function toParticipationAuditValue(record: ParticipationRecord): ParticipationAuditValue {
  return {
    participationStatus: record.status,
    participationSource: record.source,
    joinedAt: record.joined_at,
    updatedAt: record.updated_at ?? record.joined_at,
  };
}

export async function loadActionParticipationReviews(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    limit?: number;
    statuses?: ParticipationStatus[];
    actionPhase?: ActionPhase;
  },
): Promise<ActionParticipationReviewItem[]> {
  const reviewLimit = Math.max(1, Math.min(params.limit ?? 24, 100));
  const statuses = params.statuses ?? [PENDING_PARTICIPATION_STATUS];
  const useRegistrations = usesRegistrationStore(params.actionPhase);
  const result = await supabase
    .from(useRegistrations ? "action_registrations" : "action_participants")
    .select(
      useRegistrations
        ? "id, action_id, created_at, registered_at, updated_at, user_id, registration_status, registration_source"
        : "id, action_id, created_at, joined_at, updated_at, user_id, participation_status, participation_source",
    )
    .eq("action_id", params.actionId)
    .in(useRegistrations ? "registration_status" : "participation_status", statuses)
    .order("created_at", { ascending: true })
    .limit(reviewLimit);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []).map((row) => {
    const value = row as Record<string, unknown>;
    return {
      id: String(value["id"]),
      action_id: String(value["action_id"]),
      created_at: String(value["created_at"]),
      updated_at: typeof value["updated_at"] === "string" ? value["updated_at"] : undefined,
      user_id: String(value["user_id"]),
      status: (useRegistrations ? value["registration_status"] : value["participation_status"]) as ParticipationStatus,
      source: (useRegistrations ? value["registration_source"] : value["participation_source"]) as ParticipationSource,
      joined_at: String(
        useRegistrations
          ? value["registered_at"] ?? value["created_at"]
          : value["joined_at"] ?? value["created_at"],
      ),
    } satisfies ParticipationRecord;
  });
  if (rows.length === 0) {
    return [];
  }

  const claimUserIds = rows
    .filter((row) => row.source === POST_ACTION_CLAIM_PARTICIPATION_SOURCE)
    .map((row) => row.user_id);
  const registeredBeforeAction = new Set<string>();
  if (claimUserIds.length > 0) {
    const registrationsResult = await supabase
      .from("action_registrations")
      .select("user_id")
      .eq("action_id", params.actionId)
      .in("user_id", claimUserIds);

    if (registrationsResult.error) {
      throw new Error(registrationsResult.error.message);
    }

    for (const row of (registrationsResult.data ?? []) as Array<{ user_id?: string }>) {
      if (typeof row.user_id === "string" && row.user_id.trim().length > 0) {
        registeredBeforeAction.add(row.user_id);
      }
    }
  }

  const profileMap = await loadParticipantProfilesForUserIds(
    supabase,
    rows.map((row) => row.user_id),
  );

  return rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      actionId: row.action_id,
      displayName:
        profile?.display_name?.trim() ||
        profile?.handle?.trim() ||
        row.user_id,
      handle: profile?.handle?.trim() || null,
      joinedAt: row.joined_at,
      updatedAt: row.updated_at ?? row.joined_at,
      participationStatus: row.status,
      participationSource: row.source,
      wasRegisteredBeforeAction:
        row.source === POST_ACTION_CLAIM_PARTICIPATION_SOURCE &&
        registeredBeforeAction.has(row.user_id),
    };
  });
}

export async function searchActionParticipationCandidates(
  supabase: SupabaseClient,
  searchTerm: string,
  limit = 8,
): Promise<ActionParticipationSearchItem[]> {
  const term = searchTerm.trim();
  if (term.length === 0) {
    return [];
  }

  const cappedLimit = Math.max(1, Math.min(limit, 20));
  const exactQueries = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, handle")
      .eq("id", term)
      .limit(cappedLimit),
    supabase
      .from("profiles")
      .select("id, display_name, handle")
      .eq("handle", term)
      .limit(cappedLimit),
  ]);

  const exactRows = exactQueries.flatMap((result) =>
    result.error ? [] : ((result.data ?? []) as ParticipantSearchRow[]),
  );
  const exactMatches = exactRows.filter((row, index, rows) =>
    rows.findIndex((candidate) => candidate.id === row.id) === index,
  );
  if (exactMatches.length > 0) {
    return exactMatches.slice(0, cappedLimit).map((row) => ({
      userId: row.id,
      displayName: row.display_name?.trim() || row.handle?.trim() || row.id,
      handle: row.handle?.trim() || null,
    }));
  }

  const pattern = `%${escapeSearchPattern(term)}%`;
  const partial = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .or(`handle.ilike.${pattern},display_name.ilike.${pattern}`)
    .order("display_name", { ascending: true })
    .limit(cappedLimit);

  if (partial.error) {
    return [];
  }

  const partialRows = (partial.data ?? []) as ParticipantSearchRow[];
  return partialRows
    .filter((row, index, rows) =>
      rows.findIndex((candidate) => candidate.id === row.id) === index,
    )
    .map((row) => ({
      userId: row.id,
      displayName: row.display_name?.trim() || row.handle?.trim() || row.id,
      handle: row.handle?.trim() || null,
    }));
}

export async function reviewActionParticipation(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    participantId: string;
    decision: "accept" | "reject";
    actionPhase?: ActionPhase;
  },
): Promise<{
  alreadyReviewed: boolean;
  participantUserId: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
  participantsCount: number;
  previousValue: ParticipationAuditValue;
  newValue: ParticipationAuditValue;
}> {
  const useRegistrations = usesRegistrationStore(params.actionPhase);
  const existing = await runActionParticipationStep<ParticipationRecord | null>({
    stage: "lookup",
    partialMutation: false,
    operation: () =>
      useRegistrations
        ? readActionRegistrationRecordById(supabase, {
            actionId: params.actionId,
            registrationId: params.participantId,
          }).then((row) =>
            row
              ? {
                  id: row.id,
                  action_id: row.action_id,
                  created_at: row.created_at,
                  updated_at: row.updated_at,
                  user_id: row.user_id,
                  status: row.registration_status,
                  source: row.registration_source,
                  joined_at: resolveRegisteredAt(row),
                }
              : null,
          )
        : readParticipantRecordById(supabase, {
            actionId: params.actionId,
            participantId: params.participantId,
          }).then((row) =>
            row
              ? {
                  id: row.id,
                  action_id: row.action_id,
                  created_at: row.created_at,
                  updated_at: row.updated_at,
                  user_id: row.user_id,
                  status: row.participation_status,
                  source: row.participation_source,
                  joined_at: resolveJoinedAt(row),
                }
              : null,
          ),
  });

  if (!existing) {
    const notFoundError = new Error("Participation request not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (existing.status === "cancelled") {
    const validationError = new Error(
      "Cette participation a déjà été traitée.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const joinedAt = existing.joined_at;
  if (
    params.decision === "accept" &&
    existing.status === ACTIVE_PARTICIPATION_STATUS
  ) {
    const participantsCount = await runActionParticipationStep({
      stage: "post_update",
      partialMutation: false,
      targetUserId: existing.user_id,
      operation: () =>
        useRegistrations
          ? countActiveRegistrationsForAction(supabase, params.actionId)
          : countParticipantsForAction(supabase, params.actionId),
    });
    return {
      alreadyReviewed: true,
      participantUserId: existing.user_id,
      participationStatus: existing.status,
      participationSource: existing.source,
      joinedAt: existing.joined_at,
      updatedAt: existing.updated_at ?? existing.joined_at,
      participantsCount,
      previousValue: toParticipationAuditValue(existing),
      newValue: toParticipationAuditValue(existing),
    };
  }

  const nextStatus =
    params.decision === "accept"
      ? ACTIVE_PARTICIPATION_STATUS
      : "cancelled";
  const updatedRecord = await runActionParticipationStep<ParticipationRecord>({
    stage: "participation_update",
    partialMutation: false,
    targetUserId: existing.user_id,
    operation: () =>
      useRegistrations
        ? updateActionRegistrationRecord(supabase, {
            actionId: params.actionId,
            userId: existing.user_id,
            registeredAt: joinedAt,
            registrationStatus: nextStatus,
            registrationSource: existing.source as Parameters<typeof updateActionRegistrationRecord>[1]["registrationSource"],
          }).then((row) => ({
            id: params.participantId,
            action_id: row.action_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            user_id: existing.user_id,
            status: row.registration_status,
            source: row.registration_source,
            joined_at: resolveRegisteredAt(row),
          }))
        : updateParticipantRecord(supabase, {
            actionId: params.actionId,
            userId: existing.user_id,
            joinedAt,
            participationStatus: nextStatus,
            participationSource: existing.source,
          }).then((row) => ({
            id: params.participantId,
            action_id: row.action_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            user_id: existing.user_id,
            status: row.participation_status,
            source: row.participation_source,
            joined_at: resolveJoinedAt(row),
          })),
  });
  const participantsCount = await runActionParticipationStep({
    stage: "post_update",
    partialMutation: true,
    targetUserId: existing.user_id,
    operation: () =>
      useRegistrations
        ? countActiveRegistrationsForAction(supabase, params.actionId)
        : countParticipantsForAction(supabase, params.actionId),
  });

  return {
    alreadyReviewed: false,
    participantUserId: existing.user_id,
    participationStatus: updatedRecord.status,
    participationSource: updatedRecord.source,
    joinedAt: updatedRecord.joined_at,
    updatedAt: updatedRecord.updated_at ?? updatedRecord.joined_at,
    participantsCount,
    previousValue: toParticipationAuditValue(existing),
    newValue: toParticipationAuditValue(updatedRecord),
  };
}

export async function addActionParticipationByAdmin(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    targetUserId: string;
    actionPhase?: ActionPhase;
  },
): Promise<{
  alreadyJoined: boolean;
  participantUserId: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
  participantsCount: number;
  previousValue: ParticipationAuditValue | null;
  newValue: ParticipationAuditValue;
}> {
  const actionResult = await runActionParticipationStep({
    stage: "lookup",
    partialMutation: false,
    operation: () =>
      runSingleActionQuery<{
        status: "pending" | "approved" | "rejected" | "cancelled";
        moderation_visibility?: "visible" | "hidden" | null;
        action_phase: ActionPhase;
        notes: string | null;
      }>(supabase, (query) =>
        query
          .select(ACTION_PARTICIPATION_COLUMNS)
          .eq("id", params.actionId)
          .maybeSingle(),
      ),
  });

  if (!actionResult) {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (actionResult.moderation_visibility === "hidden") {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (actionResult.status === "cancelled") {
    const validationError = new Error(
      "Une action annulée ne peut plus recevoir de participant.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  if (
    actionResult.action_phase !== "pre_action" &&
    actionResult.status !== "approved"
  ) {
    const validationError = new Error(
      "Le formulaire doit être ouvert en pré-action ou validée par un admin pour ajouter un participant.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const actionMetadata = extractActionMetadataFromNotes(actionResult.notes);
  if (actionMetadata.groupJoinEnabled === false) {
    const validationError = new Error(
      "L'organisateur n'a pas ouvert ce formulaire.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const useRegistrations = usesRegistrationStore(
    params.actionPhase ?? actionResult.action_phase,
  );

  const existing = await runActionParticipationStep<ParticipationRecord | null>({
    stage: "lookup",
    partialMutation: false,
    targetUserId: params.targetUserId,
    operation: () =>
      useRegistrations
        ? readActionRegistrationRecord(supabase, {
            actionId: params.actionId,
            userId: params.targetUserId,
          }).then((row) =>
            row
              ? {
                  id: "",
                  action_id: row.action_id,
                  created_at: row.created_at,
                  updated_at: row.updated_at,
                  user_id: params.targetUserId,
                  status: row.registration_status,
                  source: row.registration_source,
                  joined_at: resolveRegisteredAt(row),
                }
              : null,
          )
        : readParticipantRecord(supabase, {
            actionId: params.actionId,
            userId: params.targetUserId,
          }).then((row) =>
            row
              ? {
                  id: "",
                  action_id: row.action_id,
                  created_at: row.created_at,
                  updated_at: row.updated_at,
                  user_id: params.targetUserId,
                  status: row.participation_status,
                  source: row.participation_source,
                  joined_at: resolveJoinedAt(row),
                }
              : null,
          ),
  });

  const joinedAt =
    existing?.joined_at ?? existing?.created_at ?? new Date().toISOString();
  const targetStatus = ACTIVE_PARTICIPATION_STATUS;
  const targetSource = ADMIN_PARTICIPATION_SOURCE;

  if (existing) {
    const alreadyJoined =
      existing.status === targetStatus && existing.source === targetSource;
    const updatedRecord = alreadyJoined
      ? existing
      : await runActionParticipationStep({
          stage: "participation_update",
          partialMutation: false,
          targetUserId: params.targetUserId,
          operation: () =>
            useRegistrations
              ? updateActionRegistrationRecord(supabase, {
                  actionId: params.actionId,
                  userId: params.targetUserId,
                  registeredAt: joinedAt,
                  registrationStatus: targetStatus,
                  registrationSource: targetSource,
                }).then((row) => ({
                  ...existing,
                  created_at: row.created_at,
                  updated_at: row.updated_at,
                  status: row.registration_status,
                  source: row.registration_source,
                  joined_at: resolveRegisteredAt(row),
                }))
              : updateParticipantRecord(supabase, {
                  actionId: params.actionId,
                  userId: params.targetUserId,
                  joinedAt,
                  participationStatus: targetStatus,
                  participationSource: targetSource,
                }).then((row) => ({
                  ...existing,
                  created_at: row.created_at,
                  updated_at: row.updated_at,
                  status: row.participation_status,
                  source: row.participation_source,
                  joined_at: resolveJoinedAt(row),
                })),
        });

    const participantsCount = await runActionParticipationStep({
      stage: "post_update",
      partialMutation: !alreadyJoined,
      targetUserId: params.targetUserId,
      operation: () =>
        useRegistrations
          ? countActiveRegistrationsForAction(supabase, params.actionId)
          : countParticipantsForAction(supabase, params.actionId),
    });

    return {
      alreadyJoined,
      participantUserId: params.targetUserId,
      participationStatus: updatedRecord.status,
      participationSource: updatedRecord.source,
      joinedAt: updatedRecord.joined_at,
      updatedAt: updatedRecord.updated_at ?? updatedRecord.joined_at,
      participantsCount,
      previousValue: toParticipationAuditValue(existing),
      newValue: toParticipationAuditValue(updatedRecord),
    };
  }

  const insertedRecord = await runActionParticipationStep<ParticipationRecord>({
    stage: "participation_update",
    partialMutation: false,
    targetUserId: params.targetUserId,
    operation: () =>
      useRegistrations
        ? insertActionRegistrationRecord(supabase, {
            actionId: params.actionId,
            userId: params.targetUserId,
            registeredAt: joinedAt,
            registrationStatus: targetStatus,
            registrationSource: targetSource,
          }).then((row) => ({
            id: "",
            action_id: row.action_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            user_id: params.targetUserId,
            status: row.registration_status,
            source: row.registration_source,
            joined_at: resolveRegisteredAt(row),
          }))
        : insertParticipantRecord(supabase, {
            actionId: params.actionId,
            userId: params.targetUserId,
            joinedAt,
            participationStatus: targetStatus,
            participationSource: targetSource,
          }).then((row) => ({
            id: "",
            action_id: row.action_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            user_id: params.targetUserId,
            status: row.participation_status,
            source: row.participation_source,
            joined_at: resolveJoinedAt(row),
          })),
  });
  const participantsCount = await runActionParticipationStep({
    stage: "post_update",
    partialMutation: true,
    targetUserId: params.targetUserId,
    operation: () =>
      useRegistrations
        ? countActiveRegistrationsForAction(supabase, params.actionId)
        : countParticipantsForAction(supabase, params.actionId),
  });

  return {
    alreadyJoined: false,
    participantUserId: params.targetUserId,
    participationStatus: insertedRecord.status,
    participationSource: insertedRecord.source,
    joinedAt: insertedRecord.joined_at,
    updatedAt: insertedRecord.updated_at ?? insertedRecord.joined_at,
    participantsCount,
    previousValue: null,
    newValue: toParticipationAuditValue(insertedRecord),
  };
}
