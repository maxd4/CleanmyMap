import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionPhase } from "@/lib/actions/types";
import { usesRegistrationStore } from "./action-phase";
import {
  escapeSearchPattern,
  loadParticipantProfilesForUserIds,
  PENDING_PARTICIPATION_STATUS,
  POST_ACTION_CLAIM_PARTICIPATION_SOURCE,
  type ParticipantSearchRow,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";
import {
  type ActionParticipationReviewItem,
  type ActionParticipationSearchItem,
} from "./group-participation-contract";
import { REVIEW_SELECT, toIndividualImpactMeasurement } from "./individual-impact";

function toParticipationSearchItem(row: ParticipantSearchRow): ActionParticipationSearchItem {
  return {
    userId: row.id,
    displayName: row.display_name?.trim() || row.handle?.trim() || row.id,
    handle: row.handle?.trim() || null,
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
  const rows = await loadParticipationReviewRows(supabase, params.actionId, reviewLimit, statuses, params.actionPhase);
  if (rows.length === 0) {
    return [];
  }

  const registeredBeforeAction = await loadRegisteredBeforeActionUserIds(
    supabase,
    params.actionId,
    rows,
  );
  const profileMap = await loadParticipantProfilesForUserIds(
    supabase,
    rows.map((row) => row.user_id),
  );

  return buildParticipationReviewItems(rows, profileMap, registeredBeforeAction);
}

type ParticipationReviewRow = {
  id: string;
  action_id: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  status: ParticipationStatus;
  source: ParticipationSource;
  joined_at: string;
  individualImpact: ReturnType<typeof toIndividualImpactMeasurement>;
};

async function loadParticipationReviewRows(
  supabase: SupabaseClient,
  actionId: string,
  reviewLimit: number,
  statuses: ParticipationStatus[],
  actionPhase?: ActionPhase,
): Promise<ParticipationReviewRow[]> {
  const useRegs = usesRegistrationStore(actionPhase);
  const result = await supabase
    .from(useRegs ? "action_registrations" : "action_participants")
    .select(useRegs ? "id, action_id, created_at, registered_at, updated_at, user_id, registration_status, registration_source" : REVIEW_SELECT)
    .eq("action_id", actionId)
    .in(useRegs ? "registration_status" : "participation_status", statuses)
    .order("created_at", { ascending: true })
    .limit(reviewLimit);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []).map((row) => {
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
}

async function loadRegisteredBeforeActionUserIds(
  supabase: SupabaseClient,
  actionId: string,
  rows: ParticipationReviewRow[],
): Promise<Set<string>> {
  const claimUserIds = rows
    .filter((row) => row.source === POST_ACTION_CLAIM_PARTICIPATION_SOURCE)
    .map((row) => row.user_id);
  if (claimUserIds.length === 0) {
    return new Set();
  }

  const registrationsResult = await supabase
    .from("action_registrations")
    .select("user_id")
    .eq("action_id", actionId)
    .in("user_id", claimUserIds);
  if (registrationsResult.error) {
    throw new Error(registrationsResult.error.message);
  }

  return new Set(
    ((registrationsResult.data ?? []) as Array<{ user_id?: string }>)
      .map((row) => row.user_id?.trim())
      .filter((userId): userId is string => Boolean(userId)),
  );
}

function buildParticipationReviewItems(
  rows: ParticipationReviewRow[],
  profileMap: Map<string, ParticipantSearchRow>,
  registeredBeforeAction: Set<string>,
): ActionParticipationReviewItem[] {
  return rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      actionId: row.action_id,
      displayName: profile?.display_name?.trim() || profile?.handle?.trim() || row.user_id,
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
