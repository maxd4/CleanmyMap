import { handleApiError } from "@/lib/http/api-errors";
import { createChatNotificationsForMessage } from "@/lib/chat/chat-notifications";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { type ChatRelatedEvent } from "@/lib/chat/announcements";
import {
  buildChatAttachmentPersistence,
  messageSelect,
  normalizeChatMessageRow,
  type ChatMessageRow,
} from "./route.shared";
import {
  loadMessageById,
  pollCtx,
  pollOpts,
} from "./route.data";
import type { ValidatedChatPost } from "./route.post-validation";
import { isChatRecord, parseChatSingleRow, parseChatSupabaseResult } from "@/lib/chat/postgrest";
import { isChatMessageRuntimeRow } from "@/lib/chat/runtime-contracts";

type ChatSupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>;
type ServiceSupabaseClient = ReturnType<typeof getSupabaseServerClient>;

export type FeedbackReplyContext = {
  feedbackId: string;
  targetUserId: string;
};

export type ChatPostPersistenceContext = {
  supabase: ChatSupabaseClient;
  serviceSupabase: ServiceSupabaseClient;
  userId: string;
  validated: ValidatedChatPost;
  feedbackReplyContext: FeedbackReplyContext | null;
  recipientId: string | null;
  actionConversationId: string | null;
  targetArrondissementId: number | null;
  targetZoneName: string | null;
  relatedEvent: ChatRelatedEvent | null;
};

async function persistPollMessage(context: ChatPostPersistenceContext): Promise<ChatMessageRow | Response> {
  const { serviceSupabase, userId, validated, recipientId, actionConversationId, targetArrondissementId, targetZoneName } = context;
  const { data, topicId } = validated;
  const pollOptions = pollOpts(data.pollOptions);
  const rawPollResult: unknown = await serviceSupabase.rpc("create_chat_poll_with_options_for_server", {
    p_actor_user_id: userId,
    p_channel_type: data.channelType,
    p_content: data.content,
    p_topic_id: topicId,
    ...pollOptions,
    ...pollCtx(recipientId, actionConversationId, targetArrondissementId, targetZoneName),
  });
  const pollResult = parseChatSupabaseResult(rawPollResult);
  if (pollResult.error) return handleApiError(pollResult.error, "POST /api/chat (poll insert)");
  if (typeof pollResult.data !== "string") return handleApiError(new Error("La création du sondage n'a pas renvoyé son message."), "POST /api/chat (poll result)");
  const message = await loadMessageById(serviceSupabase, serviceSupabase, userId, pollResult.data);
  return message ?? handleApiError(new Error("Le sondage créé est introuvable."), "POST /api/chat (poll readback)");
}

async function persistFeedbackReply(context: ChatPostPersistenceContext): Promise<ChatMessageRow | Response> {
  const { serviceSupabase, userId, validated, feedbackReplyContext } = context;
  const rawResult: unknown = await serviceSupabase.rpc("send_feedback_private_reply", {
    p_operation_id: validated.data.operationId!,
    p_actor_user_id: userId,
    p_feedback_id: feedbackReplyContext!.feedbackId,
    p_recipient_id: feedbackReplyContext!.targetUserId,
    p_content: validated.data.content,
  });
  const result = parseChatSupabaseResult(rawResult);
  if (result.error) return handleApiError(result.error, "POST /api/chat (feedback private reply)");
  const feedbackReplyMessage = isChatRecord(result.data) ? result.data.message : null;
  const message = parseChatSingleRow(feedbackReplyMessage, isChatMessageRuntimeRow);
  if (!message) return handleApiError(new Error("La réponse feedback n'a pas renvoyé son message."), "POST /api/chat (feedback private reply result)");
  return normalizeChatMessageRow(message);
}

async function persistRegularMessage(context: ChatPostPersistenceContext): Promise<ChatMessageRow | Response> {
  const { serviceSupabase, userId, validated, recipientId, actionConversationId, targetArrondissementId, targetZoneName, relatedEvent } = context;
  const { data, messageKind, topicId, isExternalActionShare } = validated;
  const rawInsertResult: unknown = await serviceSupabase.from("app_messages").insert({
    sender_id: userId, recipient_id: recipientId, channel_type: data.channelType, conversation_id: actionConversationId,
    topic_id: topicId, message_kind: messageKind, related_event_id: relatedEvent?.id ?? null,
    arrondissement_id: targetArrondissementId, zone_name: targetZoneName, content: data.content,
    ...buildChatAttachmentPersistence(data), action_id: data.actionId && isExternalActionShare ? data.actionId : null,
  }).select(messageSelect).single();
  const insertResult = parseChatSupabaseResult(rawInsertResult);
  if (insertResult.error) return handleApiError(insertResult.error, "POST /api/chat (insert)");
  const insertedMessage = parseChatSingleRow(insertResult.data, isChatMessageRuntimeRow);
  if (!insertedMessage) return handleApiError(new Error("La création du message n'a pas renvoyé un message valide."), "POST /api/chat (insert result)");
  return normalizeChatMessageRow(insertedMessage);
}

async function persistChatPostMessage(context: ChatPostPersistenceContext): Promise<ChatMessageRow | Response> {
  if (context.validated.messageKind === "poll") return persistPollMessage(context);
  if (context.feedbackReplyContext) return persistFeedbackReply(context);
  return persistRegularMessage(context);
}

export async function persistChatPostAndNotify(
  context: ChatPostPersistenceContext,
): Promise<ChatMessageRow | Response> {
  const message = await persistChatPostMessage(context);
  if (message instanceof Response) return message;
  try {
    await createChatNotificationsForMessage(
      context.serviceSupabase,
      message.id,
      context.userId,
    );
  } catch (error) {
    console.warn("[POST /api/chat] Notification fan-out failed:", error);
  }
  return message;
}
