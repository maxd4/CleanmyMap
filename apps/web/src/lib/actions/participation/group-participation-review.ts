import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { runSingleActionQuery } from "@/lib/actions/query";
import type { ActionPhase } from "@/lib/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usesRegistrationStore } from "./action-phase";
import {
  ACTION_PARTICIPATION_COLUMNS,
  ADMIN_PARTICIPATION_SOURCE,
  ACTIVE_PARTICIPATION_STATUS,
  countParticipantsForAction,
  escapeSearchPattern,
  loadParticipantProfilesForUserIds,
  PENDING_PARTICIPATION_STATUS,
  POST_ACTION_CLAIM_PARTICIPATION_SOURCE,
  type ParticipantSearchRow,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";
import {
  countActiveRegistrationsForAction,
} from "./registration-records";
import {
  runActionParticipationStep,
  type ActionParticipationReviewItem,
  type ParticipationAuditValue,
  type ActionParticipationSearchItem,
} from "./group-participation-contract";
import {
  insertParticipationRecordForPhase,
  readParticipationRecordByIdForPhase,
  readParticipationRecordForPhase,
  updateParticipationRecordForPhase,
  type ParticipationRecord,
} from "./group-participation-persistence";
import { REVIEW_SELECT, toIndividualImpactMeasurement } from "./individual-impact";

function toParticipationSearchItem(row: ParticipantSearchRow): ActionParticipationSearchItem {
  return {
    userId: row.id,
    displayName: row.display_name?.trim() || row.handle?.trim() || row.id,
    handle: row.handle?.trim() || null,
  };
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
  const useRegs = usesRegistrationStore(params.actionPhase);
  const result = await supabase
    .from(useRegs ? "action_registrations" : "action_participants")
    .select(useRegs ? "id, action_id, created_at, registered_at, updated_at, user_id, registration_status, registration_source" : REVIEW_SELECT)
    .eq("action_id", params.actionId)
    .in(useRegs ? "registration_status" : "participation_status", statuses)
    .order("created_at", { ascending: true })
    .limit(reviewLimit);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []).map((row) => {
    const value = row as unknown as Record<string, unknown>;
    return {
      id: String(value["id"]),
      action_id: String(value["action_id"]),
      created_at: String(value["created_at"]),
      updated_at: typeof value["updated_at"] === "string" ? value["updated_at"] : undefined,
      user_id: String(value["user_id"]),
      status: (useRegs ? value["registration_status"] : value["participation_status"]) as ParticipationStatus,
      source: (useRegs ? value["registration_source"] : value["participation_source"]) as ParticipationSource,
      joined_at: String(useRegs ? value["registered_at"] ?? value["created_at"] : value["joined_at"] ?? value["created_at"]),
      individualImpact: useRegs ? null : toIndividualImpactMeasurement(value),
    };
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
      individualImpact: row.individualImpact ?? null,
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
    return exactMatches.slice(0, cappedLimit).map(toParticipationSearchItem);
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
    .map(toParticipationSearchItem);
}

type ReviewActionParticipationParams = {
  actionId: string;
  participantId: string;
  decision: "accept" | "reject";
  actionPhase?: ActionPhase;
};

type ReviewActionParticipationResult = {
  alreadyReviewed: boolean;
  participantUserId: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
  participantsCount: number;
  previousValue: ParticipationAuditValue;
  newValue: ParticipationAuditValue;
};

async function countReviewedParticipants(
  supabase: SupabaseClient,
  actionId: string,
  useRegistrations: boolean,
  partialMutation: boolean,
  targetUserId: string,
): Promise<number> {
  return runActionParticipationStep({
    stage: "post_update",
    partialMutation,
    targetUserId,
    operation: () =>
      useRegistrations
        ? countActiveRegistrationsForAction(supabase, actionId)
        : countParticipantsForAction(supabase, actionId),
  });
}

async function buildAlreadyReviewedResult(
  supabase: SupabaseClient,
  actionId: string,
  useRegistrations: boolean,
  existing: ParticipationRecord,
): Promise<ReviewActionParticipationResult> {
  const participantsCount = await countReviewedParticipants(
    supabase,
    actionId,
    useRegistrations,
    false,
    existing.user_id,
  );
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

async function loadReviewParticipation(
  supabase: SupabaseClient,
  params: ReviewActionParticipationParams,
  useRegistrations: boolean,
): Promise<ParticipationRecord> {
  const existing = await runActionParticipationStep<ParticipationRecord | null>({
    stage: "lookup",
    partialMutation: false,
    operation: () =>
      readParticipationRecordByIdForPhase({
        supabase,
        useRegistrations,
        actionId: params.actionId,
        participantId: params.participantId,
      }),
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
  return existing;
}

async function applyParticipationReview(
  supabase: SupabaseClient,
  params: ReviewActionParticipationParams,
  useRegistrations: boolean,
  existing: ParticipationRecord,
): Promise<ReviewActionParticipationResult> {
  const nextStatus =
    params.decision === "accept" ? ACTIVE_PARTICIPATION_STATUS : "cancelled";
  const updatedRecord = await runActionParticipationStep<ParticipationRecord>({
    stage: "participation_update",
    partialMutation: false,
    targetUserId: existing.user_id,
    operation: () =>
      updateParticipationRecordForPhase({
        supabase,
        useRegistrations,
        actionId: params.actionId,
        userId: existing.user_id,
        joinedAt: existing.joined_at,
        status: nextStatus,
        source: existing.source,
        recordId: params.participantId,
      }),
  });
  const participantsCount = await countReviewedParticipants(
    supabase,
    params.actionId,
    useRegistrations,
    true,
    existing.user_id,
  );
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

export async function reviewActionParticipation(
  supabase: SupabaseClient,
  params: ReviewActionParticipationParams,
): Promise<ReviewActionParticipationResult> {
  const useRegistrations = usesRegistrationStore(params.actionPhase);
  const existing = await loadReviewParticipation(
    supabase,
    params,
    useRegistrations,
  );
  if (
    params.decision === "accept" &&
    existing.status === ACTIVE_PARTICIPATION_STATUS
  ) {
    return buildAlreadyReviewedResult(
      supabase,
      params.actionId,
      useRegistrations,
      existing,
    );
  }
  return applyParticipationReview(supabase, params, useRegistrations, existing);
}

type AddActionParticipationParams = {
  actionId: string;
  targetUserId: string;
  actionPhase?: ActionPhase;
};

type AddActionParticipationResult = {
  alreadyJoined: boolean;
  participantUserId: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
  participantsCount: number;
  previousValue: ParticipationAuditValue | null;
  newValue: ParticipationAuditValue;
};

async function validateAdminParticipationAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<{ action_phase: ActionPhase }> {
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
          .eq("id", actionId)
          .maybeSingle(),
      ),
  });
  if (!actionResult || actionResult.moderation_visibility === "hidden") {
    const error = new Error("Action not found.");
    error.name = "NotFoundError";
    throw error;
  }
  if (actionResult.status === "cancelled") {
    const error = new Error("Une action annulée ne peut plus recevoir de participant.");
    error.name = "ValidationError";
    throw error;
  }
  if (actionResult.action_phase !== "pre_action" && actionResult.status !== "approved") {
    const error = new Error("Le formulaire doit être ouvert en pré-action ou validée par un admin pour ajouter un participant.");
    error.name = "ValidationError";
    throw error;
  }
  if (extractActionMetadataFromNotes(actionResult.notes).groupJoinEnabled === false) {
    const error = new Error("L'organisateur n'a pas ouvert ce formulaire.");
    error.name = "ValidationError";
    throw error;
  }
  return actionResult;
}

async function countAdminParticipation(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
  useRegistrations: boolean,
  partialMutation: boolean,
): Promise<number> {
  return countReviewedParticipants(
    supabase,
    actionId,
    useRegistrations,
    partialMutation,
    userId,
  );
}

async function addExistingParticipationByAdmin(
  supabase: SupabaseClient,
  params: AddActionParticipationParams,
  useRegistrations: boolean,
  existing: ParticipationRecord,
): Promise<AddActionParticipationResult> {
  const joinedAt = existing.joined_at;
  const alreadyJoined =
    existing.status === ACTIVE_PARTICIPATION_STATUS &&
    existing.source === ADMIN_PARTICIPATION_SOURCE;
  const updatedRecord = alreadyJoined
    ? existing
    : await runActionParticipationStep({
        stage: "participation_update",
        partialMutation: false,
        targetUserId: params.targetUserId,
        operation: () =>
          updateParticipationRecordForPhase({
            supabase,
            useRegistrations,
            actionId: params.actionId,
            userId: params.targetUserId,
            joinedAt,
            status: ACTIVE_PARTICIPATION_STATUS,
            source: ADMIN_PARTICIPATION_SOURCE,
            recordId: existing.id,
          }),
      });
  const participantsCount = await countAdminParticipation(
    supabase,
    params.actionId,
    params.targetUserId,
    useRegistrations,
    !alreadyJoined,
  );
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

async function addNewParticipationByAdmin(
  supabase: SupabaseClient,
  params: AddActionParticipationParams,
  useRegistrations: boolean,
): Promise<AddActionParticipationResult> {
  const joinedAt = new Date().toISOString();
  const insertedRecord = await runActionParticipationStep<ParticipationRecord>({
    stage: "participation_update",
    partialMutation: false,
    targetUserId: params.targetUserId,
    operation: () =>
      insertParticipationRecordForPhase({
        supabase,
        useRegistrations,
        actionId: params.actionId,
        userId: params.targetUserId,
        joinedAt,
        status: ACTIVE_PARTICIPATION_STATUS,
        source: ADMIN_PARTICIPATION_SOURCE,
      }),
  });
  const participantsCount = await countAdminParticipation(
    supabase,
    params.actionId,
    params.targetUserId,
    useRegistrations,
    true,
  );
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

export async function addActionParticipationByAdmin(
  supabase: SupabaseClient,
  params: AddActionParticipationParams,
): Promise<AddActionParticipationResult> {
  const actionResult = await validateAdminParticipationAction(
    supabase,
    params.actionId,
  );
  const useRegistrations = usesRegistrationStore(
    params.actionPhase ?? actionResult.action_phase,
  );
  const existing = await runActionParticipationStep<ParticipationRecord | null>({
    stage: "lookup",
    partialMutation: false,
    targetUserId: params.targetUserId,
    operation: () =>
      readParticipationRecordForPhase({
        supabase,
        useRegistrations,
        actionId: params.actionId,
        userId: params.targetUserId,
      }),
  });
  return existing
    ? addExistingParticipationByAdmin(supabase, params, useRegistrations, existing)
    : addNewParticipationByAdmin(supabase, params, useRegistrations);
}
