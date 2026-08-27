import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionParticipantRow } from "@/types/database";

export type ActionParticipantSummary = {
  actionId: string;
  activeCount: number;
  totalCount: number;
  myParticipationStatus: ActionParticipantRow["participation_status"] | null;
  myParticipationSource: ActionParticipantRow["participation_source"] | null;
  myJoinedAt: string | null;
  myUpdatedAt: string | null;
};

type ActionParticipantSummaryRow = {
  action_id: string;
  active_count: number | string | null;
  total_count: number | string | null;
  my_participation_status: ActionParticipantRow["participation_status"] | null;
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

async function countActionParticipantRows(
  supabase: SupabaseClient,
  actionId: string,
  participationStatus?: ActionParticipantRow["participation_status"],
): Promise<number> {
  let query = supabase
    .from("action_participants")
    .select("action_id", { count: "exact", head: true })
    .eq("action_id", actionId);

  if (participationStatus) {
    query = query.eq("participation_status", participationStatus);
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

  const result = await supabase
    .from("action_participants")
    .select("participation_status, participation_source, joined_at, updated_at")
    .eq("action_id", params.actionId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = result.data as
    | {
        participation_status: ActionParticipantRow["participation_status"] | null;
        participation_source: ActionParticipantRow["participation_source"] | null;
        joined_at: string | null;
        updated_at: string | null;
      }
    | null;

  return {
    myParticipationStatus: row?.participation_status ?? null,
    myParticipationSource: row?.participation_source ?? null,
    myJoinedAt: row?.joined_at ?? null,
    myUpdatedAt: row?.updated_at ?? null,
  };
}

async function loadActionParticipantSummaryFallback(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string | null;
  },
): Promise<ActionParticipantSummary> {
  const [activeCount, totalCount, details] = await Promise.all([
    countActionParticipantRows(supabase, params.actionId, "confirmed"),
    countActionParticipantRows(supabase, params.actionId),
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

  const summaries = await Promise.all(
    uniqueActionIds.map((actionId) =>
      loadActionParticipantSummaryFallback(supabase, {
        actionId,
        userId: params.userId,
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
