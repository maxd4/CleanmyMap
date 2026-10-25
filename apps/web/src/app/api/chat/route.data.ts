import { clerkClient } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import { isMaxRole } from "@/lib/auth/role-resolution";
import {
  normalizeChatPollVoteSummaryRows,
  type ChatPollVoteSummary,
} from "@/lib/chat/poll-votes";
import { normalizeChatPollOptionLabels, type ChatPollOption } from "@/lib/chat/polls";
import { type ChatRelatedEvent } from "@/lib/chat/announcements";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { resolveChatAttachmentUrls } from "@/lib/chat/chat-attachment-reading";
import {
  type ChatMessageRow,
  type ChatQueryResult,
  type CurrentProfileRow,
  messageSelect,
  normalizeChatMessageRow,
  resolveChatAccessContext,
} from "./route.shared";
import {
  isChatMessageRuntimeRow,
  isChatRelatedEventRuntimeRow,
  isCurrentChatProfileRuntimeRow,
} from "@/lib/chat/runtime-contracts";
import {
  isChatRecord,
  parseChatRows,
  parseChatSingleRow,
  parseChatSupabaseResult,
} from "@/lib/chat/postgrest";

export async function runMessageQuery(query: ChatQueryResult<ChatMessageRow>): Promise<ChatMessageRow[]> {
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  const rows = parseChatRows(data, isChatMessageRuntimeRow);
  if (!rows) throw new Error("La réponse des messages du Chat est invalide.");
  return rows;
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

async function loadVisiblePollIds(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  candidateIds: string[],
): Promise<string[]> {
  if (candidateIds.length === 0) {
    return [];
  }

  const rawResult: unknown = await supabase
    .from("app_messages")
    .select("id")
    .in("id", candidateIds)
    .eq("message_kind", "poll")
    .in("channel_type", ["community", "admin_elu", "territory", "action", "dm"]);
  const result = parseChatSupabaseResult(rawResult);

  if (result.error) throw result.error;

  const rows = parseChatRows(
    result.data,
    (value): value is { id: string } => isChatRecord(value) && typeof value.id === "string",
  );
  if (!rows) throw new Error("La réponse des sondages visibles est invalide.");
  return rows.map((row) => row.id);
}

export async function enrichPollVoteSummaries(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  serviceSupabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  rows: ChatMessageRow[],
): Promise<ChatMessageRow[]> {
  const normalizedRows = await resolveChatAttachmentUrls(
    serviceSupabase,
    rows.map(normalizeChatMessageRow),
  );
  const rowsWithRelatedEvents = await enrichRelatedCommunityEvents(
    serviceSupabase,
    normalizedRows,
  );
  const pollIds = rowsWithRelatedEvents
    .filter((row) => row.message_kind === "poll")
    .map((row) => row.id);

  if (pollIds.length === 0) {
    return rowsWithRelatedEvents;
  }

  const visiblePollIds = await loadVisiblePollIds(supabase, pollIds);
  if (visiblePollIds.length === 0) {
    return normalizedRows;
  }

  const rawResult: unknown = await serviceSupabase.rpc("get_my_chat_poll_vote_summaries", {
    p_message_ids: visiblePollIds,
    p_user_id: userId,
  });
  const result = parseChatSupabaseResult(rawResult);
  if (result.error) throw result.error;

  const summaries = normalizeChatPollVoteSummaryRows(result.data);
  const summaryByMessageId = new Map<string, ChatPollVoteSummary>(
    summaries.map((summary) => [summary.messageId, summary]),
  );

  return rowsWithRelatedEvents.map((row) => {
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

const COMMUNITY_EVENT_CHAT_SELECT = "id, title, event_date, location_label";

async function enrichRelatedCommunityEvents(
  serviceSupabase: ReturnType<typeof getSupabaseServerClient>,
  rows: ChatMessageRow[],
): Promise<ChatMessageRow[]> {
  const eventIds = Array.from(
    new Set(
      rows
        .map((row) => row.related_event_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  if (eventIds.length === 0) return rows;

  const rawResult: unknown = await serviceSupabase
    .from("community_events")
    .select(COMMUNITY_EVENT_CHAT_SELECT)
    .in("id", eventIds);
  const result = parseChatSupabaseResult(rawResult);
  if (result.error) throw result.error;
  const events = parseChatRows(result.data, isChatRelatedEventRuntimeRow);
  if (!events) throw new Error("La réponse des événements communautaires est invalide.");

  const eventsById = new Map(events.map((event) => [event.id, event]));
  return rows.map((row) => {
    const eventId = row.related_event_id;
    if (typeof eventId !== "string" || eventId.length === 0) return row;
    return { ...row, related_event: eventsById.get(eventId) ?? null };
  });
}

export async function loadCurrentProfile(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
): Promise<CurrentProfileRow | null> {
  const rawResult: unknown = await supabase
    .from("profiles")
    .select("id, display_name, handle, paris_arrondissement, role_label, metadata")
    .eq("id", userId)
    .maybeSingle();

  const result = parseChatSupabaseResult(rawResult);
  if (result.error) throw result.error;

  const profile = parseChatSingleRow(result.data, isCurrentChatProfileRuntimeRow);
  if (result.data !== null && !profile) {
    throw new Error("La réponse du profil Chat est invalide.");
  }
  return profile;
}

export async function loadChatAccessContext(
  serviceSupabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  params: Omit<Parameters<typeof resolveChatAccessContext>[0], "profileMetadata" | "profileArrondissement">,
) {
  const profile = await loadCurrentProfile(serviceSupabase, userId);
  return resolveChatAccessContext({
    ...params,
    profileMetadata: profile?.metadata,
    profileArrondissement: profile?.paris_arrondissement,
  });
}

export async function loadRelatedCommunityEvent(
  serviceSupabase: ReturnType<typeof getSupabaseServerClient>,
  eventId: string,
): Promise<ChatRelatedEvent | null> {
  const rawResult: unknown = await serviceSupabase
    .from("community_events")
    .select(COMMUNITY_EVENT_CHAT_SELECT)
    .eq("id", eventId)
    .maybeSingle();

  const result = parseChatSupabaseResult(rawResult);
  if (result.error) throw result.error;

  const event = parseChatSingleRow(result.data, isChatRelatedEventRuntimeRow);
  if (result.data !== null && !event) {
    throw new Error("La réponse de l'événement communautaire est invalide.");
  }
  return event;
}

export async function loadMessageById(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  serviceSupabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  messageId: string,
): Promise<ChatMessageRow | null> {
  const rawResult: unknown = await supabase
    .from("app_messages")
    .select(messageSelect)
    .eq("id", messageId)
    .maybeSingle();

  const result = parseChatSupabaseResult(rawResult);
  if (result.error) throw result.error;

  const message = parseChatSingleRow(result.data, isChatMessageRuntimeRow);
  if (result.data !== null && !message) {
    throw new Error("La réponse du message Chat est invalide.");
  }
  if (!message) {
    return null;
  }

  const [enrichedMessage] = await enrichPollVoteSummaries(
    supabase,
    serviceSupabase,
    userId,
    [message],
  );
  return enrichedMessage ?? null;
}

export async function resolveBugReportRecipientId(
): Promise<string | null> {
  const ownerId = env.CLERK_IMU_OWNER_USER_ID?.trim();
  if (!ownerId) return null;

  try {
    const client = await clerkClient();
    const owner = await client.users.getUser(ownerId);
    return isMaxRole({ user: owner, imuOwnerUserId: ownerId }) ? ownerId : null;
  } catch {
    // A bug report must never be routed through a stale Supabase projection
    // when Clerk cannot confirm the configured owner.
    return null;
  }
}

export async function hasExistingDmConversation(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  recipientId: string,
): Promise<boolean> {
  const rawResult: unknown = await supabase.rpc("list_my_dm_conversations");
  const result = parseChatSupabaseResult(rawResult);
  if (result.error) throw result.error;

  const rows = parseChatRows(
    result.data,
    (value): value is { peer_id: string } => isChatRecord(value) && typeof value.peer_id === "string",
  );
  if (!rows) throw new Error("La réponse des conversations DM est invalide.");
  return rows.some((row) => row.peer_id === recipientId);
}
