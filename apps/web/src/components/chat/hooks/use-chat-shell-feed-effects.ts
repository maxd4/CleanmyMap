"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import { getChatScrollTopAfterPrepend } from "@/lib/chat/chat-pagination";
import type { ChatFeedState } from "../chat-feed-state";
import type { ChatMessage } from "../chat-types";

type UseChatShellFeedEffectsParams = {
  activeChannelType: ChatChannelType;
  activeTopicId: ChatTopicId | null;
  selectedRecipientId: string | null;
  effectiveZone: string;
  territoryFocus: number | null;
  viewMode: "messages" | "graph";
  feedState: ChatFeedState;
  messages: ChatMessage[];
  targetMessageId: string | null;
  targetStatus?: "found" | "unavailable";
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  loadPreviousMessages: () => Promise<unknown>;
  resetSearch: () => void;
};

export function useChatShellFeedEffects({
  activeChannelType,
  activeTopicId,
  selectedRecipientId,
  effectiveZone,
  territoryFocus,
  viewMode,
  feedState,
  messages,
  targetMessageId,
  targetStatus,
  scrollRef,
  loadPreviousMessages,
  resetSearch,
}: UseChatShellFeedEffectsParams) {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const initialScrollScopeRef = useRef<string | null>(null);
  const latestMessageIdRef = useRef<string | null>(null);
  const scrollScopeKey = `${activeChannelType}:${activeTopicId ?? "global"}:${selectedRecipientId ?? "none"}:${effectiveZone}:${territoryFocus ?? "none"}`;

  useEffect(() => {
    if (initialScrollScopeRef.current !== scrollScopeKey) {
      initialScrollScopeRef.current = null;
      latestMessageIdRef.current = null;
      resetSearch();
    }
  }, [resetSearch, scrollScopeKey]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || viewMode !== "messages" || feedState === "loading" || messages.length === 0) {
      return;
    }

    const latestMessageId = messages[messages.length - 1]?.id ?? null;
    if (initialScrollScopeRef.current === null) {
      element.scrollTop = element.scrollHeight;
      initialScrollScopeRef.current = scrollScopeKey;
    } else if (
      latestMessageId &&
      latestMessageId !== latestMessageIdRef.current &&
      element.scrollHeight - (element.scrollTop + element.clientHeight) < 120
    ) {
      element.scrollTop = element.scrollHeight;
    }
    latestMessageIdRef.current = latestMessageId;
  }, [feedState, messages, scrollRef, scrollScopeKey, viewMode]);

  useEffect(() => {
    if (
      viewMode !== "messages" ||
      !targetMessageId ||
      targetStatus !== "found" ||
      !messages.some((message) => message.id === targetMessageId)
    ) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setHighlightedMessageId(targetMessageId);
      document
        .getElementById(`chat-message-${targetMessageId}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    const timeoutId = window.setTimeout(() => setHighlightedMessageId(null), 4_000);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      setHighlightedMessageId(null);
    };
  }, [messages, targetMessageId, targetStatus, viewMode]);

  const handleLoadPreviousMessages = useCallback(async () => {
    const element = scrollRef.current;
    const previousHeight = element?.scrollHeight ?? 0;
    const previousTop = element?.scrollTop ?? 0;
    try {
      await loadPreviousMessages();
      if (element) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            element.scrollTop = getChatScrollTopAfterPrepend(
              previousTop,
              previousHeight,
              element.scrollHeight,
            );
          });
        });
      }
    } catch {
      // The hook exposes the real error and the same control remains available for retry.
    }
  }, [loadPreviousMessages, scrollRef]);

  return { highlightedMessageId, handleLoadPreviousMessages };
}
