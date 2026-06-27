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
  const result = await supabase
    .from("action_participants")
    .select("action_id, user_id, participation_status, participation_source, joined_at, updated_at")
    .in("action_id", params.actionIds);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const summaries = new Map<string, ActionParticipantSummary>();
  for (const actionId of params.actionIds) {
    summaries.set(actionId, {
      actionId,
      activeCount: 0,
      totalCount: 0,
      myParticipationStatus: null,
      myParticipationSource: null,
      myJoinedAt: null,
      myUpdatedAt: null,
    });
  }

  for (const row of (result.data ?? []) as Array<{
    action_id: string;
    user_id: string;
    participation_status: ActionParticipantRow["participation_status"] | null;
    participation_source: ActionParticipantRow["participation_source"] | null;
    joined_at: string | null;
    updated_at: string | null;
  }>) {
    const summary = summaries.get(row.action_id);
    if (!summary) {
      continue;
    }

    summary.totalCount += 1;
    if (row.participation_status === "confirmed") {
      summary.activeCount += 1;
    }

    if (params.userId && row.user_id === params.userId) {
      summary.myParticipationStatus = row.participation_status;
      summary.myParticipationSource = row.participation_source;
      summary.myJoinedAt = row.joined_at;
      summary.myUpdatedAt = row.updated_at;
    }
  }

  return [...summaries.values()];
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
  } catch {
    return loadActionParticipantSummariesFallback(supabase, params);
  }
}
