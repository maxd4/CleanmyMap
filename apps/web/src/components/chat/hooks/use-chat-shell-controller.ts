"use client";

import type { ChatRelatedEvent, CommunityAnnouncementTemplateKey } from "@/lib/chat/announcements";
import { useChatShellComposer } from "./use-chat-shell-composer";
import { useChatShellPollVoting } from "./use-chat-shell-poll-voting";
import { useChatSubmit } from "./use-chat-submit";
import type { useChatShellContext } from "./use-chat-shell-context";

type ChatShellContext = ReturnType<typeof useChatShellContext>;

type UseChatShellControllerParams = {
  context: ChatShellContext;
  initialComposerMode: "message" | "announcement" | "poll";
  initialAnnouncementTemplate: CommunityAnnouncementTemplateKey | null;
  initialRelatedEvent: ChatRelatedEvent | null;
  announcementEventRequested: boolean;
  announcementEventLoading: boolean;
  announcementEventError: Error | null;
};

export function useChatShellController({
  context,
  initialComposerMode,
  initialAnnouncementTemplate,
  initialRelatedEvent,
  announcementEventRequested,
  announcementEventLoading,
  announcementEventError,
}: UseChatShellControllerParams) {
  const {
    activeChannelType,
    selectedActionId,
    message,
    setMessage,
    isSending,
    setIsSending,
    setShowMentions,
    file,
    setFile,
    isUploading,
    setIsUploading,
    setSendError,
    selectedRecipient,
    activeTopicId,
    setActiveTopicId,
    submitLockRef,
    effectiveZone,
    isLoaded,
    isSignedIn,
    senderDisplayName,
    senderHandle,
    supabase,
    territoryFocus,
    user,
    userId,
    messages,
    mutateMessages,
    sendChatMessageWithInboxRefresh,
    feedbackIdForSubmit,
  } = context;
  const composer = useChatShellComposer({
    initialComposerMode,
    initialAnnouncementTemplate,
    initialRelatedEvent,
    announcementEventRequested,
    announcementEventLoading,
    announcementEventError,
    userId,
    isLoaded,
    isSignedIn,
    message,
    file,
    isSending,
    isUploading,
    activeChannelType,
    activeActionId: selectedActionId,
    selectedRecipient,
    effectiveZone,
    territoryFocus,
    setActiveTopicId,
    setFile,
    setMessage,
    setSendError,
  });
  const {
    composerMode,
    pollOptions,
    relatedEvent,
    setPollOptions,
  } = composer;
  const pollVoting = useChatShellPollVoting({ messages, mutateMessages });
  const submit = useChatSubmit({
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
    activeActionId: selectedActionId,
    activeTopicId,
    messageKind: composerMode,
    pollOptions,
    relatedEvent,
    selectedRecipient,
    effectiveZone,
    territoryFocus,
    setIsSending,
    setSendError,
    setIsUploading,
    supabase,
    sendChatMessage: sendChatMessageWithInboxRefresh,
    feedbackId: feedbackIdForSubmit,
    setMessage,
    setFile,
    setShowMentions,
    setPollOptions,
  });
  return { composer, pollVoting, submit };
}
