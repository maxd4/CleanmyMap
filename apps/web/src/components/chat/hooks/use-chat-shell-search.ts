"use client";

import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatSearchResult } from "@/lib/chat/chat-search";
import type { ChatUser } from "../chat-types";
import { getChatTopicIdsForPresentationScope } from "@/lib/chat/topic-presentation";

type UseChatShellSearchParams = {
  initialChannelType: ChatChannelType;
  initialTopicId?: ChatTopicId | null;
  initialRecipient?: ChatUser | null;
  initialMessageId: string | null;
  activeChannelType: ChatChannelType;
  activeTopicId: ChatTopicId | null;
  selectedRecipientId: string | null;
  setViewMode: Dispatch<SetStateAction<"messages" | "graph">>;
};

export function useChatShellSearch({
  initialChannelType,
  initialTopicId,
  initialRecipient,
  initialMessageId,
  activeChannelType,
  activeTopicId,
  selectedRecipientId,
  setViewMode,
}: UseChatShellSearchParams) {
  const [searchTarget, setSearchTarget] = useState<{
    messageId: string;
    scopeKey: string;
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeTopicIds = getChatTopicIdsForPresentationScope(activeChannelType, activeTopicId);
  const navigationScopeKey = `${activeChannelType}:${activeTopicIds?.join(",") ?? "global"}:${selectedRecipientId ?? "none"}:${initialMessageId ?? "none"}`;
  const searchTargetMessageId =
    searchTarget?.scopeKey === navigationScopeKey ? searchTarget.messageId : null;

  const targetMessageIdForScope = searchTargetMessageId ?? (
    initialMessageId &&
    activeChannelType === initialChannelType &&
    activeTopicId === (initialTopicId ?? null) &&
    selectedRecipientId === (initialRecipient?.id ?? null)
      ? initialMessageId
      : null
  );

  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen((open) => !open);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
  }, []);

  const handleSelectSearchResult = useCallback((result: ChatSearchResult) => {
    setSearchTarget({
      messageId: result.messageId,
      scopeKey: `${activeChannelType}:${activeTopicIds?.join(",") ?? "global"}:${selectedRecipientId ?? "none"}:${initialMessageId ?? "none"}`,
    });
    setIsSearchOpen(false);
    setSearchQuery("");
    setViewMode("messages");
  }, [activeChannelType, activeTopicIds, initialMessageId, selectedRecipientId, setViewMode]);

  const resetSearch = useCallback(() => {
    setSearchTarget(null);
    setIsSearchOpen(false);
    setSearchQuery("");
  }, []);

  return {
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    targetMessageIdForScope,
    handleToggleSearch,
    handleCloseSearch,
    handleSelectSearchResult,
    resetSearch,
  };
}
