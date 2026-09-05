import { MAX_ROLE_STORAGE_VALUES } from "@/lib/profiles";
import {
  normalizeChatPollVoteSummaryRows,
  type ChatPollVoteSummary,
} from "@/lib/chat/poll-votes";
import { type ChatPollOption } from "@/lib/chat/polls";
import { type ChatRelatedEvent } from "@/lib/chat/announcements";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import {
  type ChatMessageRow,
  type ChatQueryResult,
  type CurrentProfileRow,
  messageSelect,
  normalizeChatMessageRow,
} from "./route.shared";

export async function runMessageQuery(query: ChatQueryResult<ChatMessageRow>): Promise<ChatMessageRow[]> {
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data ?? []) as ChatMessageRow[];
}

export async function loadVisiblePollIds(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  candidateIds: string[],
): Promise<string[]> {
  if (candidateIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("app_messages")
    .select("id")
    .in("id", candidateIds)
    .eq("message_kind", "poll")
    .eq("channel_type", "community");

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");
}

export async function enrichPollVoteSummaries(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  serviceSupabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  rows: ChatMessageRow[],
): Promise<ChatMessageRow[]> {
  const normalizedRows = rows.map(normalizeChatMessageRow);
  const pollIds = normalizedRows
    .filter((row) => row.message_kind === "poll")
    .map((row) => row.id);

  if (pollIds.length === 0) {
    return normalizedRows;
  }

  const visiblePollIds = await loadVisiblePollIds(supabase, pollIds);
  if (visiblePollIds.length === 0) {
    return normalizedRows;
  }

  const { data, error } = await serviceSupabase.rpc("get_my_chat_poll_vote_summaries", {
    p_message_ids: visiblePollIds,
    p_user_id: userId,
  });
  if (error) {
    throw error;
  }

  const summaries = normalizeChatPollVoteSummaryRows(data);
  const summaryByMessageId = new Map<string, ChatPollVoteSummary>(
    summaries.map((summary) => [summary.messageId, summary]),
  );

  return normalizedRows.map((row) => {
    const summary = summaryByMessageId.get(row.id);
    if (row.message_kind !== "poll" || !summary) {
      return row;
    }

    const counts = new Map(summary.options.map((option) => [option.optionId, option.voteCount]));
    return {
      ...row,
      poll_options: (row.poll_options as ChatPollOption[]).map((option) => ({
        ...option,
        voteCount: counts.get(option.id) ?? 0,
      })),
      totalVotes: summary.totalVotes,
      selectedOptionId: summary.selectedOptionId,
    };
  });
}

export async function loadCurrentProfile(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  userId: string,
): Promise<CurrentProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, handle, paris_arrondissement, role_label, metadata")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as CurrentProfileRow | null;
}

export async function loadRelatedCommunityEvent(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  eventId: string,
): Promise<ChatRelatedEvent | null> {
  const { data, error } = await supabase
    .from("community_events")
    .select("id, title, event_date, location_label")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as ChatRelatedEvent | null;
}

export async function loadMessageById(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  serviceSupabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  messageId: string,
): Promise<ChatMessageRow | null> {
  const { data, error } = await supabase
    .from("app_messages")
    .select(messageSelect)
    .eq("id", messageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [message] = await enrichPollVoteSummaries(
    supabase,
    serviceSupabase,
    userId,
    [data as ChatMessageRow],
  );
  return message ?? null;
}

export async function resolveBugReportRecipientId(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  senderId: string,
  senderRole: string,
): Promise<string | null> {
  const { data: maxData, error: maxError } = await supabase
    .from("profiles")
    .select("id")
    .in("role_label", MAX_ROLE_STORAGE_VALUES)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (maxError) {
    throw maxError;
  }

  if (maxData?.id) {
    return maxData.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role_label", "admin")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  if (data?.id) {
    return data.id;
  }

  if (senderRole === "admin" || senderRole === "max") {
    return senderId;
  }

  return null;
}
