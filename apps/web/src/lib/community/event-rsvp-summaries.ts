import type { SupabaseClient } from "@supabase/supabase-js";

export type CommunityEventRsvpSummary = {
  eventId: string;
  yesCount: number;
  maybeCount: number;
  noCount: number;
  totalCount: number;
  myRsvpStatus: "yes" | "maybe" | "no" | null;
};

type CommunityEventRsvpSummaryRow = {
  event_id: string;
  yes_count: number | string | null;
  maybe_count: number | string | null;
  no_count: number | string | null;
  total_count: number | string | null;
  my_rsvp_status: "yes" | "maybe" | "no" | null;
};

function toInteger(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function normalizeSummaryRows(
  rows: CommunityEventRsvpSummaryRow[],
): CommunityEventRsvpSummary[] {
  return rows.map((row) => ({
    eventId: row.event_id,
    yesCount: toInteger(row.yes_count),
    maybeCount: toInteger(row.maybe_count),
    noCount: toInteger(row.no_count),
    totalCount: toInteger(row.total_count),
    myRsvpStatus: row.my_rsvp_status,
  }));
}

async function loadCommunityEventRsvpSummariesFromRpc(
  supabase: SupabaseClient,
  params: {
    eventIds: string[];
    userId: string | null;
  },
): Promise<CommunityEventRsvpSummary[]> {
  const result = await supabase.rpc("load_community_event_rsvp_summaries", {
    p_event_ids: params.eventIds,
    p_user_id: params.userId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return normalizeSummaryRows((result.data ?? []) as CommunityEventRsvpSummaryRow[]);
}

async function loadCommunityEventRsvpSummariesFallback(
  supabase: SupabaseClient,
  params: {
    eventIds: string[];
    userId: string | null;
  },
): Promise<CommunityEventRsvpSummary[]> {
  const result = await supabase
    .from("event_rsvps")
    .select("event_id, participant_clerk_id, status")
    .in("event_id", params.eventIds);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const summaries = new Map<string, CommunityEventRsvpSummary>();
  for (const eventId of params.eventIds) {
    summaries.set(eventId, {
      eventId,
      yesCount: 0,
      maybeCount: 0,
      noCount: 0,
      totalCount: 0,
      myRsvpStatus: null,
    });
  }

  for (const row of (result.data ?? []) as Array<{
    event_id: string;
    participant_clerk_id: string;
    status: "yes" | "maybe" | "no";
  }>) {
    const summary = summaries.get(row.event_id);
    if (!summary) {
      continue;
    }

    summary.totalCount += 1;
    if (row.status === "yes") {
      summary.yesCount += 1;
    } else if (row.status === "maybe") {
      summary.maybeCount += 1;
    } else {
      summary.noCount += 1;
    }

    if (params.userId && row.participant_clerk_id === params.userId) {
      summary.myRsvpStatus = row.status;
    }
  }

  return [...summaries.values()];
}

export async function loadCommunityEventRsvpSummaries(
  supabase: SupabaseClient,
  params: {
    eventIds: string[];
    userId: string | null;
  },
): Promise<CommunityEventRsvpSummary[]> {
  if (params.eventIds.length === 0) {
    return [];
  }

  try {
    return await loadCommunityEventRsvpSummariesFromRpc(supabase, params);
  } catch {
    return loadCommunityEventRsvpSummariesFallback(supabase, params);
  }
}
