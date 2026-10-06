"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatUser } from "../chat-types";

type UseChatShellSelectionParams = {
  resetComposerForChannelChange: () => void;
  setActiveTopicId: Dispatch<SetStateAction<ChatTopicId | null>>;
  setSelectedActionId: Dispatch<SetStateAction<string | null>>;
  setActiveChannelType: Dispatch<SetStateAction<ChatChannelType>>;
  setIsDmThreadOpen: Dispatch<SetStateAction<boolean>>;
  setIsPublicThreadOpen: Dispatch<SetStateAction<boolean>>;
  handleSelectChannel: (channelType: ChatChannelType) => void;
  handleSelectTopic: (topicId: ChatTopicId) => void;
  setViewMode: Dispatch<SetStateAction<"messages" | "graph">>;
  setIsEditingHandle: Dispatch<SetStateAction<boolean>>;
  setNewHandle: Dispatch<SetStateAction<string>>;
  activeChannelType: ChatChannelType;
  selectedRecipient: ChatUser | null;
  setMessage: (value: string) => void;
  setShowMentions: (value: boolean) => void;
  setSendError: (value: string | null) => void;
  setIsRecipientPickerOpen: Dispatch<SetStateAction<boolean>>;
};

export function useChatShellSelection({
  resetComposerForChannelChange,
  setActiveTopicId,
  setSelectedActionId,
  setActiveChannelType,
  setIsDmThreadOpen,
  setIsPublicThreadOpen,
  handleSelectChannel,
  handleSelectTopic,
  setViewMode,
  setIsEditingHandle,
  setNewHandle,
  activeChannelType,
  selectedRecipient,
  setMessage,
  setShowMentions,
  setSendError,
  setIsRecipientPickerOpen,
}: UseChatShellSelectionParams) {
  const handleSelectAction = useCallback(
    (actionId: string) => {
      resetComposerForChannelChange();
      setActiveTopicId(null);
      setSelectedActionId(actionId);
      setActiveChannelType("action");
      setIsDmThreadOpen(false);
      setIsPublicThreadOpen(true);
    },
    [
      resetComposerForChannelChange,
      setActiveChannelType,
      setActiveTopicId,
      setIsDmThreadOpen,
      setIsPublicThreadOpen,
      setSelectedActionId,
    ],
  );
  const handleSelectChannelForPresentation = useCallback(
    (channelType: ChatChannelType) => {
      handleSelectChannel(channelType);
      setIsPublicThreadOpen(true);
    },
    [handleSelectChannel, setIsPublicThreadOpen],
  );
  const handleSelectTopicForPresentation = useCallback(
    (topicId: ChatTopicId) => {
      handleSelectTopic(topicId);
      setIsPublicThreadOpen(true);
    },
    [handleSelectTopic, setIsPublicThreadOpen],
  );
  const handleBackToPublicContextList = useCallback(
    () => setIsPublicThreadOpen(false),
    [setIsPublicThreadOpen],
  );
  const handleViewModeChange = useCallback(
    (mode: "messages" | "graph") => setViewMode(mode),
    [setViewMode],
  );
  const handleToggleHandleEditor = useCallback(
    () => setIsEditingHandle((current) => !current),
    [setIsEditingHandle],
  );
  const handleHandleChange = useCallback(
    (value: string) => setNewHandle(value.toLowerCase().replace(/[^a-z0-9_]/g, "")),
    [setNewHandle],
  );
  const handleStarterPrompt = useCallback(
    (prompt: string) => {
      setMessage(prompt);
      setShowMentions(false);
      setSendError(null);
      if (activeChannelType === "dm" && !selectedRecipient) {
        setIsRecipientPickerOpen(true);
      }
    },
    [
      activeChannelType,
      selectedRecipient,
      setIsRecipientPickerOpen,
      setMessage,
      setSendError,
      setShowMentions,
    ],
  );

  return {
    handleBackToPublicContextList,
    handleHandleChange,
    handleSelectAction,
    handleSelectChannelForPresentation,
    handleSelectTopicForPresentation,
    handleStarterPrompt,
    handleToggleHandleEditor,
    handleViewModeChange,
  };
}
