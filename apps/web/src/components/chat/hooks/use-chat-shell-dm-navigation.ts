"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";

import type { ChatUser, DmConversation } from "../chat-types";

type UseChatShellDmNavigationParams = {
  initialRecipient?: ChatUser | null;
  setActiveTopicId: Dispatch<SetStateAction<ChatTopicId | null>>;
  setActiveChannelType: Dispatch<SetStateAction<ChatChannelType>>;
  setSelectedRecipient: Dispatch<SetStateAction<ChatUser | null>>;
  setRecipientQuery: Dispatch<SetStateAction<string>>;
  setIsRecipientPickerOpen: Dispatch<SetStateAction<boolean>>;
};

export function useChatShellDmNavigation({
  initialRecipient,
  setActiveTopicId,
  setActiveChannelType,
  setSelectedRecipient,
  setRecipientQuery,
  setIsRecipientPickerOpen,
}: UseChatShellDmNavigationParams) {
  const [isDmThreadOpen, setIsDmThreadOpen] = useState(Boolean(initialRecipient));

  const handleSelectRecipient = useCallback(
    (recipient: ChatUser) => {
      setSelectedRecipient(recipient);
      setRecipientQuery("");
      setIsRecipientPickerOpen(false);
      setIsDmThreadOpen(true);
    },
    [setSelectedRecipient, setRecipientQuery, setIsRecipientPickerOpen],
  );

  const handleClearRecipient = useCallback(() => {
    setSelectedRecipient(null);
    setRecipientQuery("");
    setIsRecipientPickerOpen(true);
    setIsDmThreadOpen(true);
  }, [setSelectedRecipient, setRecipientQuery, setIsRecipientPickerOpen]);

  const handleSelectDmConversation = useCallback(
    (conversation: DmConversation) => {
      setActiveTopicId(null);
      setActiveChannelType("dm");
      setSelectedRecipient(conversation.peer);
      setRecipientQuery("");
      setIsRecipientPickerOpen(false);
      setIsDmThreadOpen(true);
    },
    [
      setActiveTopicId,
      setActiveChannelType,
      setSelectedRecipient,
      setRecipientQuery,
      setIsRecipientPickerOpen,
    ],
  );

  const handleStartDmConversation = useCallback(() => {
    setActiveTopicId(null);
    setActiveChannelType("dm");
    setSelectedRecipient(null);
    setRecipientQuery("");
    setIsRecipientPickerOpen(true);
    setIsDmThreadOpen(true);
  }, [
    setActiveTopicId,
    setActiveChannelType,
    setSelectedRecipient,
    setRecipientQuery,
    setIsRecipientPickerOpen,
  ]);

  const handleBackToDmInbox = useCallback(() => {
    setActiveTopicId(null);
    setSelectedRecipient(null);
    setRecipientQuery("");
    setIsRecipientPickerOpen(false);
    setIsDmThreadOpen(false);
  }, [setActiveTopicId, setSelectedRecipient, setRecipientQuery, setIsRecipientPickerOpen]);

  const handleRecipientQueryChange = useCallback(
    (value: string) => {
      setRecipientQuery(value);
      setIsRecipientPickerOpen(true);
    },
    [setRecipientQuery, setIsRecipientPickerOpen],
  );

  return {
    handleBackToDmInbox,
    handleClearRecipient,
    handleRecipientQueryChange,
    handleSelectDmConversation,
    handleSelectRecipient,
    handleStartDmConversation,
    isDmThreadOpen,
    setIsDmThreadOpen,
  };
}
