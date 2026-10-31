import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { useUser } from "@clerk/nextjs";
import { isAppError, toAppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { createClientIdentifier } from "@/lib/client-identifier";
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
  buddyRequestId?: string | null;
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
  return createClientIdentifier();
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
  buddyRequestId?: string | null;
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
    body: buildPreparedChatBody(params, feedbackOperationId),
  });
}

type PreparedChatMessageParams = Parameters<typeof sendPreparedChatMessage>[0];

function buildPreparedChatBody(
  params: PreparedChatMessageParams,
  feedbackOperationId?: string,
) {
  return {
    channelType: params.activeChannelType,
    actionId: params.activeChannelType === "action" ? params.activeActionId ?? undefined : undefined,
    buddyRequestId: params.activeChannelType === "dm" ? params.buddyRequestId ?? undefined : undefined,
    messageKind: params.messageKind,
    pollOptions: params.messageKind === "poll" ? params.pollOptions : undefined,
    relatedEventId: params.relatedEvent?.id,
    topicId: params.activeTopicId ?? undefined,
    content: params.currentMessage,
    recipientId: params.activeChannelType === "dm" ? params.selectedRecipient?.id : undefined,
    arrondissementId: params.activeChannelType === "territory" && !params.effectiveZone ? params.territoryFocus ?? undefined : undefined,
    zoneName: params.activeChannelType === "territory" && params.effectiveZone ? params.effectiveZone : undefined,
    attachmentUrl: params.attachmentUrl,
    attachmentPath: params.attachmentPath,
    attachmentType: params.attachmentType,
    attachmentSize: params.attachmentSize,
    feedbackId: params.activeChannelType === "dm" ? params.feedbackId ?? undefined : undefined,
    operationId: feedbackOperationId,
  };
}

type ChatSubmitExecutionParams = UseChatSubmitParams & {
  currentMessage: string;
  feedbackOperationIdRef: React.MutableRefObject<string | null>;
  retrySubmitChatMessage: () => void;
};

async function sendChatSubmission(params: ChatSubmitExecutionParams): Promise<void> {
  await sendChatMessageWithAttachmentLifecycle({
        uploadAttachment: () =>
          uploadChatAttachmentIfNeeded({
            file: params.file,
            supabase: params.supabase,
            userId: params.userId as string,
            activeChannelType: params.activeChannelType,
            setIsUploading: params.setIsUploading,
          }),
        sendMessage: (uploadedAttachment) =>
          sendPreparedChatMessage({
            userId: params.userId as string,
            currentMessage: params.currentMessage,
            activeChannelType: params.activeChannelType,
            activeActionId: params.activeActionId,
            buddyRequestId: params.buddyRequestId,
            activeTopicId: params.activeTopicId,
            messageKind: params.messageKind,
            pollOptions: params.pollOptions,
            relatedEvent: params.relatedEvent,
            selectedRecipient: params.selectedRecipient,
            effectiveZone: params.effectiveZone,
            territoryFocus: params.territoryFocus,
            senderDisplayName: params.senderDisplayName,
            senderHandle: params.senderHandle,
            user: params.user,
            attachmentUrl: uploadedAttachment?.url,
            attachmentPath: uploadedAttachment?.objectPath,
            attachmentType: uploadedAttachment?.type,
            attachmentSize: uploadedAttachment?.size,
            feedbackId: params.feedbackId,
            feedbackOperationIdRef: params.feedbackOperationIdRef,
            sendChatMessage: params.sendChatMessage,
          }),
        removeAttachment: (attachment) =>
          removeChatAttachment({
            supabase: params.supabase as SupabaseClient,
            attachment,
          }),
  });
}

async function executeChatSubmit(params: ChatSubmitExecutionParams): Promise<void> {
  const retrySubmitChatMessage = params.retrySubmitChatMessage;
  try {
    try {
      await sendChatSubmission(params);
    } catch (uploadError) {
      if (uploadError instanceof ChatAttachmentUploadError) {
        reportChatAttachmentError(uploadError.cause, {
          setSendError: params.setSendError,
          retrySubmitChatMessage,
        });
        return;
      }
      throw uploadError;
    }
    if (params.feedbackId) params.feedbackOperationIdRef.current = null;
    params.setMessage("");
    params.setFile(null);
    if (params.messageKind === "poll") params.setPollOptions(["", ""]);
    params.setShowMentions(false);
    params.setSendError(null);
  } catch (err) {
    const appError = isAppError(err)
      ? err
      : toAppError(err, {
          kind: "server",
          message: "Une erreur est survenue lors de l'envoi de votre message. Réessaye dans un instant.",
        });
    params.setSendError(appError.message);
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
  }
}

function useStableChatSubmitParams(
  params: Omit<ChatSubmitExecutionParams, "currentMessage">,
) {
  const {
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
    buddyRequestId,
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
    feedbackOperationIdRef,
    retrySubmitChatMessage,
  } = params;

  return useMemo(
    () => ({
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
      buddyRequestId,
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
      feedbackOperationIdRef,
      retrySubmitChatMessage,
    }),
    [
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
      buddyRequestId,
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
      feedbackOperationIdRef,
      retrySubmitChatMessage,
    ],
  );
}

function useChatSubmitAction(
  params: Omit<ChatSubmitExecutionParams, "currentMessage">,
) {
  const executionParams = useStableChatSubmitParams(params);
  const submitLockRef = executionParams.submitLockRef;

  return useCallback(async () => {
    const currentMessage = executionParams.message.trim();
    const preconditionError = getChatSubmitPreconditionError({
      submitLocked: submitLockRef.current,
      userId: executionParams.userId,
      currentMessage,
      file: executionParams.file,
      isSending: executionParams.isSending,
      isUploading: executionParams.isUploading,
      activeChannelType: executionParams.activeChannelType,
      selectedRecipient: executionParams.selectedRecipient,
      activeActionId: executionParams.activeActionId,
      effectiveZone: executionParams.effectiveZone,
      territoryFocus: executionParams.territoryFocus,
    });
    if (preconditionError !== null) {
      if (preconditionError) executionParams.setSendError(preconditionError);
      return;
    }
    if (!executionParams.userId) return;

    submitLockRef.current = true;
    executionParams.setIsSending(true);
    executionParams.setSendError(null);
    try {
      await executeChatSubmit({ ...executionParams, currentMessage });
    } finally {
      executionParams.setIsSending(false);
      submitLockRef.current = false;
    }
  }, [executionParams, submitLockRef]);
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
  buddyRequestId,
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
    void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ submitChatMessageRef.current?.();
  }, []);

  const submitChatMessage = useChatSubmitAction({
    feedbackOperationIdRef,
    retrySubmitChatMessage,
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
    buddyRequestId,
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
  });

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
    void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ submitChatMessage();
  }, [submitChatMessage]);

  return useMemo(() => ({ submitChatMessage, handleSend }), [submitChatMessage, handleSend]);
}
