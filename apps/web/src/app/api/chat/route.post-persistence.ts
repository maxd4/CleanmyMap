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

async function persistChatPostMessage({
  supabase,
  serviceSupabase,
  userId,
  validated,
  feedbackReplyContext,
  recipientId,
  actionConversationId,
  targetArrondissementId,
  targetZoneName,
  relatedEvent,
}: ChatPostPersistenceContext): Promise<ChatMessageRow | Response> {
  const { data, messageKind, topicId, isExternalActionShare } = validated;
  if (messageKind === "poll") {
    const { data: pollMessageId, error: pollError } = await supabase.rpc(
      "create_chat_poll_with_options",
      {
        p_channel_type: data.channelType,
        p_content: data.content,
        p_topic_id: topicId,
        ...pollOpts(data.pollOptions),
        ...pollCtx(
          recipientId,
          actionConversationId,
          targetArrondissementId,
          targetZoneName,
        ),
      },
    );
    if (pollError) return handleApiError(pollError, "POST /api/chat (poll insert)");
    if (typeof pollMessageId !== "string") {
      return handleApiError(
        new Error("La création du sondage n'a pas renvoyé son message."),
        "POST /api/chat (poll result)",
      );
    }

    const message = await loadMessageById(
      supabase,
      serviceSupabase,
      userId,
      pollMessageId,
    );
    return message ?? handleApiError(
      new Error("Le sondage créé est introuvable."),
      "POST /api/chat (poll readback)",
    );
  }

  if (feedbackReplyContext) {
    const { data: feedbackReplyResult, error: feedbackReplyError } =
      await serviceSupabase.rpc("send_feedback_private_reply", {
        p_operation_id: data.operationId!,
        p_actor_user_id: userId,
        p_feedback_id: feedbackReplyContext.feedbackId,
        p_recipient_id: feedbackReplyContext.targetUserId,
        p_content: data.content,
      });
    if (feedbackReplyError) {
      return handleApiError(
        feedbackReplyError,
        "POST /api/chat (feedback private reply)",
      );
    }

    const feedbackReplyMessage =
      feedbackReplyResult &&
      typeof feedbackReplyResult === "object" &&
      "message" in feedbackReplyResult
        ? (feedbackReplyResult as { message?: unknown }).message
        : null;
    if (!feedbackReplyMessage || typeof feedbackReplyMessage !== "object") {
      return handleApiError(
        new Error("La réponse feedback n'a pas renvoyé son message."),
        "POST /api/chat (feedback private reply result)",
      );
    }
    return normalizeChatMessageRow(feedbackReplyMessage as ChatMessageRow);
  }

  const { data: insertedMessage, error } = await supabase
    .from("app_messages")
    .insert({
      sender_id: userId,
      recipient_id: recipientId,
      channel_type: data.channelType,
      conversation_id: actionConversationId,
      topic_id: topicId,
      message_kind: messageKind,
      related_event_id: relatedEvent?.id ?? null,
      arrondissement_id: targetArrondissementId,
      zone_name: targetZoneName,
      content: data.content,
      ...buildChatAttachmentPersistence(data),
      action_id: data.actionId && isExternalActionShare ? data.actionId : null,
    })
    .select(messageSelect)
    .single();
  if (error) return handleApiError(error, "POST /api/chat (insert)");
  return normalizeChatMessageRow(insertedMessage as ChatMessageRow);
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
