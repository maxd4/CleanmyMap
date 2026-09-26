import { env } from "@/lib/env";
import {
  normalizeChatPollVoteSummaryRows,
  type ChatPollVoteSummary,
} from "@/lib/chat/poll-votes";
import { normalizeChatPollOptionLabels, type ChatPollOption } from "@/lib/chat/polls";
import { type ChatRelatedEvent } from "@/lib/chat/announcements";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import {
  type ChatMessageRow,
  type ChatQueryResult,
  type CurrentProfileRow,
  messageSelect,
  normalizeChatMessageRow,
  resolveChatAccessContext,
} from "./route.shared";

export async function runMessageQuery(query: ChatQueryResult<ChatMessageRow>): Promise<ChatMessageRow[]> {
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data ?? []) as ChatMessageRow[];
}

export function pollOpts(options: readonly string[] | undefined) {
  return { p_option_labels: normalizeChatPollOptionLabels(options ?? []) };
}

export function pollCtx(
  recipientId: string | null,
  conversationId: string | null,
  arrondissementId: number | null,
  zoneName: string | null,
) {
  return {
    p_recipient_id: recipientId,
    p_conversation_id: conversationId,
    p_arrondissement_id: arrondissementId,
    p_zone_name: zoneName,
  };
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
    .in("channel_type", ["community", "admin_elu", "territory", "action", "dm"]);

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

export async function loadChatAccessContext(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  userId: string,
  params: Omit<Parameters<typeof resolveChatAccessContext>[0], "profileMetadata" | "profileArrondissement">,
) {
  const profile = await loadCurrentProfile(supabase, userId);
  return resolveChatAccessContext({
    ...params,
    profileMetadata: profile?.metadata,
    profileArrondissement: profile?.paris_arrondissement,
  });
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
  const ownerId = env.CLERK_IMU_OWNER_USER_ID?.trim();
  if (ownerId) {
    return ownerId;
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

export async function hasExistingDmConversation(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  recipientId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("list_my_dm_conversations");
  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{ peer_id?: unknown }>).some(
    (row) => row.peer_id === recipientId,
  );
}
