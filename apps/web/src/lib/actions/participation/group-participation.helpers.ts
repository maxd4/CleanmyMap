import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionParticipantRow, ActionRow } from "@/types/database";
import type { ActionParticipantSummary } from "./participant-summaries";
import type { ActionPhase, ActionPreparationData } from "@/lib/actions/types";

export const PENDING_PARTICIPATION_STATUS = "pending" as const;
export const ACTIVE_PARTICIPATION_STATUS = "confirmed" as const;
export const GROUP_PARTICIPATION_SOURCE = "group_form" as const;
export const ADMIN_PARTICIPATION_SOURCE = "admin_override" as const;
export const POST_ACTION_CLAIM_PARTICIPATION_SOURCE = "post_action_claim" as const;

export type ParticipationStatus = ActionParticipantRow["participation_status"];
export type ParticipationSource = ActionParticipantRow["participation_source"];

export type ProfileLookupRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
};

export type ParticipantSearchRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
};

export type ActionPreviewRow = Pick<
  ActionRow,
  | "id"
  | "created_at"
  | "action_date"
  | "location_label"
  | "volunteers_count"
  | "duration_minutes"
  | "status"
  | "moderation_visibility"
  | "notes"
  | "action_phase"
  | "published_at"
  | "event_start_time"
  | "cancelled_at"
  | "cancelled_by_clerk_id"
  | "cancellation_reason"
  | "cancelled_from_status"
> & {
  preparation_data?: ActionRow["preparation_data"];
  waste_kg?: number | null;
  cigarette_butts?: number | null;
};

export type ActionParticipantRecordRow = Pick<
  ActionParticipantRow,
  | "action_id"
  | "user_id"
  | "created_at"
  | "joined_at"
  | "updated_at"
  | "participation_status"
  | "participation_source"
> & {
  individual_waste_kg?: number | null;
  individual_waste_condition?: "sec" | "humide" | "mouille" | null;
  individual_waste_measurement_method?: string | null;
  individual_waste_normalization_version?: string | null;
  individual_cigarette_butts_count?: number | null;
  individual_cigarette_butts_mass_kg?: number | null;
  individual_cigarette_butts_condition?: "propre" | "humide" | "mouille" | null;
  individual_cigarette_butts_provenance?: "counted" | "measured" | "derived" | null;
  individual_cigarette_butts_conversion_version?: string | null;
  individual_impact_measured_by?: string | null;
  individual_impact_measured_at?: string | null;
};

export type ActionParticipantStatusRow = Pick<
  ActionParticipantRow,
  | "action_id"
  | "created_at"
  | "joined_at"
  | "updated_at"
  | "participation_status"
  | "participation_source"
>;

export type ActionParticipantReviewRow = Pick<
  ActionParticipantRow,
  | "id"
  | "action_id"
  | "created_at"
  | "joined_at"
  | "updated_at"
  | "user_id"
  | "participation_status"
  | "participation_source"
> & {
  display_name: string | null;
  handle: string | null;
};

const ACTION_PREVIEW_COLUMNS =
  "id, created_at, action_date, event_start_time, location_label, volunteers_count, duration_minutes, waste_kg, cigarette_butts, status, moderation_visibility, notes, action_phase, published_at, cancelled_at, cancelled_by_clerk_id, cancellation_reason, cancelled_from_status, preparation_data";
const ACTION_PARTICIPATION_COLUMNS =
  "status, moderation_visibility, notes, published_at, action_phase, action_date, event_start_time, cancelled_at";

export type JoinableActionMetadata = {
  groupJoinEnabled: boolean;
};

export function resolveJoinedAt(
  row: Pick<
    ActionParticipantRow,
    "created_at" | "joined_at" | "updated_at" | "participation_status" | "participation_source"
  >,
): string {
  return row.joined_at ?? row.created_at;
}

export function resolveParticipationUpdatedAt(
  row: Pick<ActionParticipantRow, "created_at" | "joined_at" | "updated_at">,
): string | null {
  return row.updated_at ?? row.joined_at ?? row.created_at;
}

function isJoinedParticipant(
  participantSummary: ActionParticipantSummary | null,
): boolean {
  return participantSummary?.myParticipationStatus === ACTIVE_PARTICIPATION_STATUS;
}

function isAwaitingApprovalParticipant(
  participantSummary: ActionParticipantSummary | null,
): boolean {
  return participantSummary?.myParticipationStatus === PENDING_PARTICIPATION_STATUS;
}

function resolvePendingRequestsCount(
  participantSummary: ActionParticipantSummary | null,
  participantsCount: number,
): number {
  return Math.max(0, (participantSummary?.totalCount ?? participantsCount) - participantsCount);
}

export function getActionTitle(action: Pick<ActionPreviewRow, "preparation_data">): string | null {
  const preparationData = action.preparation_data as ActionPreparationData | null | undefined;
  return preparationData?.actionTitle?.trim() || null;
}

export function buildJoinableItem(
  action: ActionPreviewRow,
  metadata: JoinableActionMetadata,
  participantsCount: number,
  participantSummary: ActionParticipantSummary | null,
): {
  id: string;
  created_at: string;
  action_date: string;
  location_label: string;
  actionTitle?: string | null;
  volunteers_count: number;
  duration_minutes: number;
  status: ActionRow["status"];
  actionPhase: ActionPhase;
  participantsCount: number;
  joined: boolean;
  awaitingApproval: boolean;
  joinedAt: string | null;
  participationStatus: ParticipationStatus | null;
  participationSource: ParticipationSource | null;
  participationUpdatedAt: string | null;
  groupJoinEnabled: boolean;
  pendingRequestsCount: number;
} {
  const publicAction = { ...action };
  delete publicAction.preparation_data;
  return {
    ...publicAction,
    actionTitle: getActionTitle(action),
    actionPhase: action.action_phase ?? "post_action_complete",
    participantsCount,
    joined: isJoinedParticipant(participantSummary),
    awaitingApproval: isAwaitingApprovalParticipant(participantSummary),
    joinedAt: participantSummary?.myJoinedAt ?? null,
    participationStatus: participantSummary?.myParticipationStatus ?? null,
    participationSource: participantSummary?.myParticipationSource ?? null,
    participationUpdatedAt:
      participantSummary?.myUpdatedAt ?? participantSummary?.myJoinedAt ?? null,
    groupJoinEnabled: metadata.groupJoinEnabled,
    pendingRequestsCount: resolvePendingRequestsCount(participantSummary, participantsCount),
  };
}

export async function countActiveParticipants(
  supabase: SupabaseClient,
  actionId: string,
): Promise<number> {
  const result = await supabase
    .from("action_participants")
    .select("id", { count: "exact", head: true })
    .eq("action_id", actionId)
    .eq("participation_status", ACTIVE_PARTICIPATION_STATUS);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return Number(result.count ?? 0);
}

export async function countParticipantsForAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<number> {
  return countActiveParticipants(supabase, actionId);
}

export async function loadParticipantProfilesForUserIds(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, ProfileLookupRow>> {
  const uniqueUserIds = Array.from(
    new Set(userIds.map((value) => value.trim()).filter((value) => value.length > 0)),
  );

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const result = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .in("id", uniqueUserIds)
    .limit(uniqueUserIds.length);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []) as ProfileLookupRow[];
  return new Map(rows.map((row) => [row.id, row] as const));
}

export async function readParticipantRecord(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
): Promise<ActionParticipantStatusRow | null> {
  const result = await supabase
    .from("action_participants")
    .select(
      "action_id, created_at, joined_at, updated_at, participation_status, participation_source",
    )
    .eq("action_id", params.actionId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ActionParticipantStatusRow | null;
}

export async function readParticipantRecordById(
  supabase: SupabaseClient,
  params: { actionId: string; participantId: string },
): Promise<ActionParticipantReviewRow | null> {
  const result = await supabase
    .from("action_participants")
    .select(
      "id, action_id, created_at, joined_at, updated_at, user_id, participation_status, participation_source",
    )
    .eq("action_id", params.actionId)
    .eq("id", params.participantId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ActionParticipantReviewRow | null;
}

export async function updateParticipantRecord(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
    joinedAt: string;
    participationStatus: ParticipationStatus;
    participationSource: ParticipationSource;
  },
): Promise<ActionParticipantStatusRow> {
  const result = await supabase
    .from("action_participants")
    .update({
      joined_at: params.joinedAt,
      participation_status: params.participationStatus,
      participation_source: params.participationSource,
    })
    .eq("action_id", params.actionId)
    .eq("user_id", params.userId)
    .select(
      "action_id, created_at, joined_at, updated_at, participation_status, participation_source",
    )
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ActionParticipantStatusRow;
}

export async function insertParticipantRecord(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
    joinedAt: string;
    participationStatus: ParticipationStatus;
    participationSource: ParticipationSource;
  },
): Promise<ActionParticipantStatusRow> {
  const result = await supabase
    .from("action_participants")
    .insert({
      action_id: params.actionId,
      user_id: params.userId,
      joined_at: params.joinedAt,
      participation_status: params.participationStatus,
      participation_source: params.participationSource,
    })
    .select(
      "action_id, created_at, joined_at, updated_at, participation_status, participation_source",
    )
    .single();

  if (result.error) {
    const error = new Error(result.error.message);
    if ("code" in result.error && typeof result.error.code === "string") {
      Object.assign(error, { code: result.error.code });
    }
    throw error;
  }

  return result.data as ActionParticipantStatusRow;
}

export function escapeSearchPattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export { ACTION_PARTICIPATION_COLUMNS, ACTION_PREVIEW_COLUMNS };
