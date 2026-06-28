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

async function countEventRsvpRows(
  supabase: SupabaseClient,
  eventId: string,
  status?: "yes" | "maybe" | "no",
): Promise<number> {
  let query = supabase
    .from("event_rsvps")
    .select("event_id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (status) {
    query = query.eq("status", status);
  }

  const result = await query;
  if (result.error) {
    throw new Error(result.error.message);
  }

  return Number(result.count ?? 0);
}

async function loadMyRsvpStatusForEvent(
  supabase: SupabaseClient,
  eventId: string,
  userId: string | null,
): Promise<"yes" | "maybe" | "no" | null> {
  if (!userId) {
    return null;
  }

  const result = await supabase
    .from("event_rsvps")
    .select("status")
    .eq("event_id", eventId)
    .eq("participant_clerk_id", userId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data as { status: "yes" | "maybe" | "no" } | null)?.status ?? null;
}

async function loadEventRsvpSummaryFallback(
  supabase: SupabaseClient,
  eventId: string,
  userId: string | null,
): Promise<CommunityEventRsvpSummary> {
  const [yesCount, maybeCount, noCount, totalCount, myRsvpStatus] = await Promise.all([
    countEventRsvpRows(supabase, eventId, "yes"),
    countEventRsvpRows(supabase, eventId, "maybe"),
    countEventRsvpRows(supabase, eventId, "no"),
    countEventRsvpRows(supabase, eventId),
    loadMyRsvpStatusForEvent(supabase, eventId, userId),
  ]);

  return {
    eventId,
    yesCount,
    maybeCount,
    noCount,
    totalCount,
    myRsvpStatus,
  };
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
  const summaries = await Promise.all(
    params.eventIds.map((eventId) =>
      loadEventRsvpSummaryFallback(supabase, eventId, params.userId),
    ),
  );

  return summaries;
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
