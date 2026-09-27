import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { useUser } from "@clerk/nextjs";
import { isAppError, toAppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import type { ChatMessage, ChatUser } from "../chat-types";
import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatMessageKind, ChatRelatedEvent } from "@/lib/chat/announcements";
import type { ChatPollOption } from "@/lib/chat/polls";
import type { SendChatMessageParams } from "./use-chat-data";
import {
  ChatAttachmentUploadError,
  getChatSubmitPreconditionError,
  reportChatAttachmentError,
  sendChatMessageWithAttachmentLifecycle,
  uploadChatAttachmentIfNeeded,
  removeChatAttachment,
} from "./use-chat-submit.helpers";

type UseChatSubmitParams = {
  submitLockRef: React.MutableRefObject<boolean>;
  userId?: string;
  user: ReturnType<typeof useUser>["user"];
  senderDisplayName: string;
  senderHandle: string;
  message: string;
  file: File | null;
  isSending: boolean;
  isUploading: boolean;
  activeChannelType: ChatChannelType;
  activeActionId?: string | null;
  activeTopicId: ChatTopicId | null;
  messageKind: ChatMessageKind;
  pollOptions: string[];
  relatedEvent: ChatRelatedEvent | null;
  selectedRecipient: ChatUser | null;
  effectiveZone: string;
  territoryFocus: number | null;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
  setSendError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  supabase: SupabaseClient | null | undefined;
  sendChatMessage: (params: SendChatMessageParams) => Promise<ChatMessage>;
  feedbackId?: string | null;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  setShowMentions: React.Dispatch<React.SetStateAction<boolean>>;
  setPollOptions: React.Dispatch<React.SetStateAction<string[]>>;
};

function createFeedbackOperationId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function buildOptimisticChatMessage({
  id,
  senderId,
  content,
  channelType,
  topicId,
  messageKind,
  pollOptions,
  relatedEvent,
  attachmentUrl,
  createdAt,
  sender,
}: {
  id: string;
  senderId: string;
  content: string;
  channelType: ChatChannelType;
  topicId: ChatTopicId | null;
  messageKind: ChatMessageKind;
  pollOptions: string[];
  relatedEvent: ChatRelatedEvent | null;
  attachmentUrl?: string;
  createdAt: string;
  sender: ChatMessage["sender"];
}): ChatMessage {
  return {
    id,
    sender_id: senderId,
    content,
    channel_type: channelType,
    topic_id: topicId,
    message_kind: messageKind,
    related_event_id: relatedEvent?.id ?? null,
    action_id: null,
    related_event: relatedEvent,
    poll_options: pollOptions.map((label, index) => ({
      id: `opt-${id}-${index + 1}`,
      position: index + 1,
      label,
    })) as ChatPollOption[],
    attachment_url: attachmentUrl,
    created_at: createdAt,
    sender,
  };
}

async function sendPreparedChatMessage(params: {
  userId: string;
  currentMessage: string;
  activeChannelType: ChatChannelType;
  activeActionId?: string | null;
  activeTopicId: ChatTopicId | null;
  messageKind: ChatMessageKind;
  pollOptions: string[];
  relatedEvent: ChatRelatedEvent | null;
  selectedRecipient: ChatUser | null;
  effectiveZone: string;
  territoryFocus: number | null;
  senderDisplayName: string;
  senderHandle: string;
  user: ReturnType<typeof useUser>["user"];
  attachmentUrl?: string;
  attachmentPath?: string;
  attachmentType?: string;
  attachmentSize?: number;
  feedbackId?: string | null;
  feedbackOperationIdRef: React.MutableRefObject<string | null>;
  sendChatMessage: (params: SendChatMessageParams) => Promise<ChatMessage>;
}): Promise<void> {
  const optimisticMessage = buildOptimisticChatMessage({
    id: `opt-${Date.now()}`,
    senderId: params.userId,
    content: params.currentMessage,
    channelType: params.activeChannelType,
    topicId: params.activeTopicId,
    messageKind: params.messageKind,
    pollOptions: params.pollOptions,
    relatedEvent: params.relatedEvent,
    attachmentUrl: params.attachmentUrl,
    createdAt: new Date().toISOString(),
    sender: {
      display_name: params.senderDisplayName,
      handle: params.senderHandle,
      avatar_url: params.user?.imageUrl || "",
    },
  });
  const feedbackOperationId =
    params.activeChannelType === "dm" && params.feedbackId
      ? (params.feedbackOperationIdRef.current ??= createFeedbackOperationId())
      : undefined;

  await params.sendChatMessage({
    optimisticMessage,
    body: {
      channelType: params.activeChannelType,
      actionId: params.activeChannelType === "action" ? params.activeActionId ?? undefined : undefined,
      messageKind: params.messageKind,
      pollOptions: params.messageKind === "poll" ? params.pollOptions : undefined,
      relatedEventId: params.relatedEvent?.id,
      topicId: params.activeTopicId ?? undefined,
      content: params.currentMessage,
      recipientId: params.activeChannelType === "dm" ? params.selectedRecipient?.id : undefined,
      arrondissementId:
        params.activeChannelType === "territory" && !params.effectiveZone
          ? params.territoryFocus ?? undefined
          : undefined,
      zoneName:
        params.activeChannelType === "territory" && params.effectiveZone
          ? params.effectiveZone
          : undefined,
      attachmentUrl: params.attachmentUrl,
      attachmentPath: params.attachmentPath,
      attachmentType: params.attachmentType,
      attachmentSize: params.attachmentSize,
      feedbackId: params.activeChannelType === "dm" ? params.feedbackId ?? undefined : undefined,
      operationId: feedbackOperationId,
    },
  });
}

export function useChatSubmit({
  submitLockRef,
  userId,
  user,
  senderDisplayName,
  senderHandle,
  message,
  file,
  isSending,
  isUploading,
  activeChannelType,
  activeActionId,
  activeTopicId,
  messageKind,
  pollOptions,
  relatedEvent,
  selectedRecipient,
  effectiveZone,
  territoryFocus,
  setIsSending,
  setSendError,
  setIsUploading,
  supabase,
  sendChatMessage,
  feedbackId,
  setMessage,
  setFile,
  setShowMentions,
  setPollOptions,
}: UseChatSubmitParams) {
  const submitChatMessageRef = useRef<(() => Promise<void>) | null>(null);
  const feedbackOperationIdRef = useRef<string | null>(null);
  const retrySubmitChatMessage = useCallback(() => {
    void submitChatMessageRef.current?.();
  }, []);

  const submitChatMessage = useCallback(async () => {
    const currentMessage = message.trim();
    const preconditionError = getChatSubmitPreconditionError({
      submitLocked: submitLockRef.current,
      userId,
      currentMessage,
      file,
      isSending,
      isUploading,
      activeChannelType,
      selectedRecipient,
      activeActionId,
      effectiveZone,
      territoryFocus,
    });
    if (preconditionError !== null) {
      if (preconditionError) setSendError(preconditionError);
      return;
    }
    if (!userId) return;

    submitLockRef.current = true;
    setIsSending(true);
    setSendError(null);

    try {
      try {
        await sendChatMessageWithAttachmentLifecycle({
          uploadAttachment: () =>
            uploadChatAttachmentIfNeeded({
              file,
              supabase,
              userId,
              activeChannelType,
              setIsUploading,
            }),
          sendMessage: (uploadedAttachment) =>
            sendPreparedChatMessage({
              userId,
              currentMessage,
              activeChannelType,
              activeActionId,
              activeTopicId,
              messageKind,
              pollOptions,
              relatedEvent,
              selectedRecipient,
              effectiveZone,
              territoryFocus,
              senderDisplayName,
              senderHandle,
              user,
              attachmentUrl: uploadedAttachment?.url,
              attachmentPath: uploadedAttachment?.objectPath,
              attachmentType: uploadedAttachment?.type,
              attachmentSize: uploadedAttachment?.size,
              feedbackId,
              feedbackOperationIdRef,
              sendChatMessage,
            }),
          removeAttachment: (attachment) =>
            removeChatAttachment({
              supabase: supabase as SupabaseClient,
              attachment,
            }),
        });
      } catch (uploadError) {
        if (uploadError instanceof ChatAttachmentUploadError) {
          reportChatAttachmentError(uploadError.cause, {
            setSendError,
            retrySubmitChatMessage,
          });
          return;
        }
        throw uploadError;
      }

      if (feedbackId) {
        feedbackOperationIdRef.current = null;
      }

      setMessage("");
      setFile(null);
      if (messageKind === "poll") {
        setPollOptions(["", ""]);
      }
      setShowMentions(false);
      setSendError(null);
    } catch (err) {
      const appError = isAppError(err)
        ? err
        : toAppError(err, {
            kind: "server",
            message:
              "Une erreur est survenue lors de l'envoi de votre message. Réessaye dans un instant.",
          });

      setSendError(appError.message);

      if (appError.kind === "network") {
        notifyNetworkToast({
          title: "Connexion perdue",
          message: appError.message,
          retryLabel: "Réessayer maintenant",
          onRetry: retrySubmitChatMessage,
          refreshLabel: "Rafraîchir",
          onRefresh: () => window.location.reload(),
        });
      }
    } finally {
      setIsSending(false);
      submitLockRef.current = false;
    }
  }, [
    activeChannelType,
    feedbackId,
    activeActionId,
    activeTopicId,
    messageKind,
    pollOptions,
    relatedEvent,
    effectiveZone,
    file,
    isSending,
    isUploading,
    message,
    selectedRecipient,
    sendChatMessage,
    setFile,
    setIsSending,
    setIsUploading,
    setMessage,
    setPollOptions,
    setSendError,
    setShowMentions,
    submitLockRef,
    supabase,
    territoryFocus,
    senderDisplayName,
    senderHandle,
    user,
    userId,
    retrySubmitChatMessage,
  ]);

  useEffect(() => {
    if (!feedbackId) {
      feedbackOperationIdRef.current = null;
    }
  }, [feedbackId]);

  useEffect(() => {
    submitChatMessageRef.current = submitChatMessage;

    return () => {
      if (submitChatMessageRef.current === submitChatMessage) {
        submitChatMessageRef.current = null;
      }
    };
  }, [submitChatMessage]);

  const handleSend = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void submitChatMessage();
  }, [submitChatMessage]);

  return useMemo(() => ({ submitChatMessage, handleSend }), [submitChatMessage, handleSend]);
}
