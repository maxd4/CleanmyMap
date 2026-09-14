"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import {
  buildAnnouncementDraft,
  getAnnouncementTopicId,
  type ChatRelatedEvent,
  type CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import {
  createInitialChatPollOptionDraft,
  getChatPollOptionsValidationError,
} from "@/lib/chat/polls";
import type { ChatTopicId } from "@/lib/chat/topics";

import type { ChatUser } from "../chat-types";

export type ChatShellComposerMode = "message" | "announcement" | "poll";

type CanSubmitChatMessageParams = {
  userId?: string;
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  message: string;
  file: File | null;
  isSending: boolean;
  isUploading: boolean;
  composerMode: ChatShellComposerMode;
  pollOptions: string[];
  announcementTemplate: CommunityAnnouncementTemplateKey | null;
  announcementEventRequested: boolean;
  relatedEvent: ChatRelatedEvent | null;
  announcementEventLoading: boolean;
  announcementEventError: Error | null;
  activeChannelType: ChatChannelType;
  activeActionId?: string | null;
  selectedRecipient: ChatUser | null;
  effectiveZone: string;
  territoryFocus: number | null;
};

export function canSubmitChatMessage({
  userId,
  isLoaded,
  isSignedIn,
  message,
  file,
  isSending,
  isUploading,
  composerMode,
  pollOptions,
  announcementTemplate,
  announcementEventRequested,
  relatedEvent,
  announcementEventLoading,
  announcementEventError,
  activeChannelType,
  selectedRecipient,
  effectiveZone,
  territoryFocus,
  activeActionId,
}: CanSubmitChatMessageParams): boolean {
  const announcementMode = composerMode === "announcement";

  return Boolean(
    userId &&
      isLoaded &&
      isSignedIn &&
      (message.trim().length > 0 || file) &&
      !isSending &&
      !isUploading &&
      (composerMode !== "poll" || !getChatPollOptionsValidationError(pollOptions)) &&
      (!announcementMode || Boolean(announcementTemplate)) &&
      (!announcementMode || !announcementEventRequested || Boolean(relatedEvent)) &&
      (!announcementMode || !announcementEventLoading) &&
      (!announcementMode || !announcementEventError) &&
      !(activeChannelType === "dm" && !selectedRecipient) &&
      !(activeChannelType === "territory" && !effectiveZone && territoryFocus === null) &&
      !(activeChannelType === "action" && (!activeActionId || composerMode !== "message")),
  );
}

type UseChatShellComposerParams = {
  initialComposerMode: ChatShellComposerMode;
  initialAnnouncementTemplate: CommunityAnnouncementTemplateKey | null;
  initialRelatedEvent: ChatRelatedEvent | null;
  announcementEventRequested: boolean;
  announcementEventLoading: boolean;
  announcementEventError: Error | null;
  userId?: string;
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  message: string;
  file: File | null;
  isSending: boolean;
  isUploading: boolean;
  activeChannelType: ChatChannelType;
  activeActionId?: string | null;
  selectedRecipient: ChatUser | null;
  effectiveZone: string;
  territoryFocus: number | null;
  setActiveTopicId: Dispatch<SetStateAction<ChatTopicId | null>>;
  setFile: Dispatch<SetStateAction<File | null>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setSendError: Dispatch<SetStateAction<string | null>>;
};

export function useChatShellComposer({
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
  activeActionId,
  selectedRecipient,
  effectiveZone,
  territoryFocus,
  setActiveTopicId,
  setFile,
  setMessage,
  setSendError,
}: UseChatShellComposerParams) {
  const [composerMode, setComposerMode] = useState<ChatShellComposerMode>(
    initialComposerMode,
  );
  const [announcementTemplate, setAnnouncementTemplate] =
    useState<CommunityAnnouncementTemplateKey | null>(initialAnnouncementTemplate);
  const [relatedEventOverride, setRelatedEventOverride] = useState<
    ChatRelatedEvent | null | undefined
  >();
  const [pollOptions, setPollOptions] = useState<string[]>(
    createInitialChatPollOptionDraft,
  );
  const announcementMode = composerMode === "announcement";
  const relatedEvent =
    relatedEventOverride === undefined ? initialRelatedEvent : relatedEventOverride;

  const handleComposerModeChange = useCallback(
    (mode: ChatShellComposerMode) => {
      setComposerMode(mode);
      if (mode === "poll") {
        setAnnouncementTemplate(null);
        setRelatedEventOverride(null);
        setFile(null);
        setPollOptions((current) =>
          current.length >= 2 ? current : createInitialChatPollOptionDraft(),
        );
      } else if (mode === "message") {
        setAnnouncementTemplate(null);
        setRelatedEventOverride(null);
      } else if (mode === "announcement" && !announcementTemplate) {
        setActiveTopicId(null);
      }
    },
    [announcementTemplate, setActiveTopicId, setFile],
  );

  const handleAnnouncementTemplateChange = useCallback(
    (template: CommunityAnnouncementTemplateKey) => {
      setAnnouncementTemplate(template);
      setActiveTopicId(getAnnouncementTopicId(template));
      setMessage(buildAnnouncementDraft(template));
      setSendError(null);
    },
    [setActiveTopicId, setMessage, setSendError],
  );

  const handleSelectTopic = useCallback(
    (topicId: ChatTopicId) => {
      setActiveTopicId(topicId);
      if (announcementMode) {
        setComposerMode("message");
        setAnnouncementTemplate(null);
        setRelatedEventOverride(null);
      }
    },
    [announcementMode, setActiveTopicId],
  );

  const resetComposerForChannelChange = useCallback(() => {
    setComposerMode("message");
    setAnnouncementTemplate(null);
    setRelatedEventOverride(null);
    setPollOptions(createInitialChatPollOptionDraft());
  }, []);

  const canSubmitMessage = useMemo(
    () =>
      canSubmitChatMessage({
        userId,
        isLoaded,
        isSignedIn,
        message,
        file,
        isSending,
        isUploading,
        composerMode,
        pollOptions,
        announcementTemplate,
        announcementEventRequested,
        relatedEvent,
        announcementEventLoading,
        announcementEventError,
        activeChannelType,
        activeActionId,
        selectedRecipient,
        effectiveZone,
        territoryFocus,
      }),
    [
      userId,
      isLoaded,
      isSignedIn,
      message,
      file,
      isSending,
      isUploading,
      composerMode,
      pollOptions,
      announcementTemplate,
      announcementEventRequested,
      relatedEvent,
      announcementEventLoading,
      announcementEventError,
      activeChannelType,
      activeActionId,
      selectedRecipient,
      effectiveZone,
      territoryFocus,
    ],
  );

  return {
    announcementMode,
    announcementTemplate,
    canSubmitMessage,
    composerMode,
    handleAnnouncementTemplateChange,
    handleComposerModeChange,
    handleSelectTopic,
    pollOptions,
    relatedEvent,
    resetComposerForChannelChange,
    setAnnouncementTemplate,
    setPollOptions,
  };
}
