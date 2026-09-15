import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionParticipantRow, ActionRegistrationRow } from "@/types/database";

export type ActionParticipantSummary = {
  actionId: string;
  activeCount: number;
  totalCount: number;
  myParticipationStatus: ActionRegistrationRow["registration_status"] | null;
  myParticipationSource: ActionParticipantRow["participation_source"] | null;
  myJoinedAt: string | null;
  myUpdatedAt: string | null;
};

type ActionParticipantSummaryRow = {
  action_id: string;
  active_count: number | string | null;
  total_count: number | string | null;
  my_participation_status: ActionRegistrationRow["registration_status"] | null;
  my_participation_source: ActionParticipantRow["participation_source"] | null;
  my_joined_at: string | null;
  my_updated_at: string | null;
};

function toInteger(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function normalizeSummaryRows(
  rows: ActionParticipantSummaryRow[],
): ActionParticipantSummary[] {
  return rows.map((row) => ({
    actionId: row.action_id,
    activeCount: toInteger(row.active_count),
    totalCount: toInteger(row.total_count),
    myParticipationStatus: row.my_participation_status,
    myParticipationSource: row.my_participation_source,
    myJoinedAt: row.my_joined_at,
    myUpdatedAt: row.my_updated_at,
  }));
}

async function countActionRegistrationRows(
  supabase: SupabaseClient,
  actionId: string,
  registrationStatus?: ActionRegistrationRow["registration_status"],
  source: "registrations" | "participants" = "registrations",
): Promise<number> {
  const table = source === "registrations" ? "action_registrations" : "action_participants";
  const statusField = source === "registrations" ? "registration_status" : "participation_status";
  let query = supabase
    .from(table)
    .select("action_id", { count: "exact", head: true })
    .eq("action_id", actionId);

  if (registrationStatus) {
    query = query.eq(statusField, registrationStatus);
  }

  const result = await query;
  if (result.error) {
    throw new Error(result.error.message);
  }

  return Number(result.count ?? 0);
}

async function loadActionParticipantDetailsForUser(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string | null;
    source: "registrations" | "participants";
  },
): Promise<Pick<
  ActionParticipantSummary,
  "myParticipationStatus" | "myParticipationSource" | "myJoinedAt" | "myUpdatedAt"
>> {
  if (!params.userId) {
    return {
      myParticipationStatus: null,
      myParticipationSource: null,
      myJoinedAt: null,
      myUpdatedAt: null,
    };
  }

  const useRegistrations = params.source === "registrations";
  const result = await supabase
    .from(useRegistrations ? "action_registrations" : "action_participants")
    .select(
      useRegistrations
        ? "registration_status, registration_source, registered_at, updated_at"
        : "participation_status, participation_source, joined_at, updated_at",
    )
    .eq("action_id", params.actionId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  const value = result.data as Record<string, unknown> | null;

  return {
    myParticipationStatus: (useRegistrations
      ? value?.["registration_status"]
      : value?.["participation_status"]) as ActionRegistrationRow["registration_status"] | null,
    myParticipationSource: (useRegistrations
      ? value?.["registration_source"]
      : value?.["participation_source"]) as ActionParticipantRow["participation_source"] | null,
    myJoinedAt: (useRegistrations ? value?.["registered_at"] : value?.["joined_at"]) as string | null,
    myUpdatedAt: (value?.["updated_at"] ?? null) as string | null,
  };
}

async function loadActionParticipantSummaryFallback(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string | null;
    source: "registrations" | "participants";
  },
): Promise<ActionParticipantSummary> {
  const [activeCount, totalCount, details] = await Promise.all([
    countActionRegistrationRows(supabase, params.actionId, "confirmed", params.source),
    countActionRegistrationRows(supabase, params.actionId, undefined, params.source),
    loadActionParticipantDetailsForUser(supabase, params),
  ]);

  return {
    actionId: params.actionId,
    activeCount,
    totalCount,
    myParticipationStatus: details.myParticipationStatus,
    myParticipationSource: details.myParticipationSource,
    myJoinedAt: details.myJoinedAt,
    myUpdatedAt: details.myUpdatedAt,
  };
}

async function loadActionParticipantSummariesFromRpc(
  supabase: SupabaseClient,
  params: {
    actionIds: string[];
    userId: string | null;
  },
): Promise<ActionParticipantSummary[]> {
  const result = await supabase.rpc("load_action_participant_summaries", {
    p_action_ids: params.actionIds,
    p_user_id: params.userId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return normalizeSummaryRows((result.data ?? []) as ActionParticipantSummaryRow[]);
}

async function loadActionParticipantSummariesFallback(
  supabase: SupabaseClient,
  params: {
    actionIds: string[];
    userId: string | null;
  },
): Promise<ActionParticipantSummary[]> {
  const uniqueActionIds = Array.from(
    new Set(params.actionIds.map((value) => value.trim()).filter((value) => value.length > 0)),
  );

  const actionResult = await supabase
    .from("actions")
    .select("id, action_phase")
    .in("id", uniqueActionIds);
  if (actionResult.error) {
    throw new Error(actionResult.error.message);
  }
  const actionPhaseById = new Map(
    ((actionResult.data ?? []) as Array<{ id: string; action_phase?: string | null }>).map((row) => [
      row.id,
      row.action_phase,
    ]),
  );

  const summaries = await Promise.all(
    uniqueActionIds.map((actionId) =>
      loadActionParticipantSummaryFallback(supabase, {
        actionId,
        userId: params.userId,
        source:
          actionPhaseById.get(actionId) === "pre_action" ||
          actionPhaseById.get(actionId) === "post_action_draft"
            ? "registrations"
            : "participants",
      }),
    ),
  );

  return normalizeSummaryRows(
    summaries.map((summary) => ({
      action_id: summary.actionId,
      active_count: summary.activeCount,
      total_count: summary.totalCount,
      my_participation_status: summary.myParticipationStatus,
      my_participation_source: summary.myParticipationSource,
      my_joined_at: summary.myJoinedAt,
      my_updated_at: summary.myUpdatedAt,
    })),
  );
}

export async function loadActionParticipantSummaries(
  supabase: SupabaseClient,
  params: {
    actionIds: string[];
    userId: string | null;
  },
): Promise<ActionParticipantSummary[]> {
  if (params.actionIds.length === 0) {
    return [];
  }

  try {
    return await loadActionParticipantSummariesFromRpc(supabase, params);
  } catch (error) {
    try {
      return await loadActionParticipantSummariesFallback(supabase, params);
    } catch (fallbackError) {
      console.warn("[group-participation] unable to load participation summaries", {
        actionIds: params.actionIds.length,
        rpcError: error instanceof Error ? error.message : String(error),
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      return [];
    }
  }
}
