"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { KeyedMutator } from "swr";

import { isChatRealtimeEnabled } from "@/lib/chat/chat-config";
import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatMessagesResponse } from "../chat-types";
import { fetchChatJson } from "./use-chat-user-search";
import {
  getChatRefreshIntervalMs,
  getRecentMessagesKey,
  isRelevantChatMessageChange,
  isRelevantChatPollVoteChange,
  mergeChatMessages,
  type ChatMessageChange,
  type ChatRealtimeScope,
} from "./use-chat-data.model";

type UseChatDataRefreshParams = {
  messagesKey: string | null;
  activeChannelType: ChatChannelType;
  activeActionId?: string | null;
  activeTopicIds?: readonly ChatTopicId[] | null;
  selectedRecipientId: string | null;
  effectiveZone: string;
  territoryFocus: number | null;
  currentUserId?: string;
  canQueryProtectedChat: boolean;
  supabase?: SupabaseClient | null;
  mutateMessages: KeyedMutator<ChatMessagesResponse>;
  surfaceActive: boolean;
};

export function useChatDataRefresh({
  messagesKey,
  activeChannelType,
  activeActionId,
  activeTopicIds,
  selectedRecipientId,
  effectiveZone,
  territoryFocus,
  currentUserId,
  canQueryProtectedChat,
  supabase,
  mutateMessages,
  surfaceActive,
}: UseChatDataRefreshParams) {
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState !== "hidden",
  );
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshAtRef = useRef(0);
  const currentMessagesKeyRef = useRef(messagesKey);
  useEffect(() => {
    currentMessagesKeyRef.current = messagesKey;
  }, [messagesKey]);
  const realtimeEnabled = isChatRealtimeEnabled();

  const refreshRecentMessages = useCallback(async () => {
    const requestedMessagesKey = messagesKey;
    if (!requestedMessagesKey || currentMessagesKeyRef.current !== requestedMessagesKey) {
      return;
    }

    const recentData = await fetchChatJson<ChatMessagesResponse>(
      getRecentMessagesKey(requestedMessagesKey),
    );
    if (currentMessagesKeyRef.current !== requestedMessagesKey) {
      return;
    }

    await mutateMessages(
      (currentData) => {
        if (!currentData) {
          return recentData;
        }

        return {
          ...currentData,
          messages: mergeChatMessages([currentData.messages, recentData.messages]),
          hasMore: currentData.hasMore || recentData.hasMore,
          previousCursor: currentData.previousCursor ?? recentData.previousCursor,
        };
      },
      { revalidate: false },
    );
  }, [messagesKey, mutateMessages]);

  const scheduleMessagesRefresh = useCallback(() => {
    if (!messagesKey || currentMessagesKeyRef.current !== messagesKey) {
      return;
    }

    const now = Date.now();
    const minGapMs = realtimeEnabled ? 8_000 : 15_000;
    const elapsed = now - lastRefreshAtRef.current;

    if (elapsed >= minGapMs) {
      lastRefreshAtRef.current = now;
      void refreshRecentMessages().catch(() => undefined);
      return;
    }

    if (refreshTimerRef.current) {
      return;
    }

    const requestedMessagesKey = messagesKey;
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      if (currentMessagesKeyRef.current !== requestedMessagesKey) {
        return;
      }
      lastRefreshAtRef.current = Date.now();
      void refreshRecentMessages().catch(() => undefined);
    }, minGapMs - elapsed);
  }, [messagesKey, realtimeEnabled, refreshRecentMessages]);

  useEffect(() => {
    if (!messagesKey) {
      return;
    }

    const handleVisibilityChange = () => {
      const visible = document.visibilityState !== "hidden";
      setIsPageVisible(visible);
      if (visible) {
        scheduleMessagesRefresh();
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      scheduleMessagesRefresh();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const refreshInterval = getChatRefreshIntervalMs({
      activeChannelType,
      realtimeEnabled,
      isVisible: isPageVisible,
      isOnline,
      surfaceActive,
    });
    const intervalId = refreshInterval
      // Vercel/polling justification: ce rafraîchissement borné sert de fallback au realtime ; il est désactivé hors ligne ou lorsque la page est masquée.
      ? window.setInterval(scheduleMessagesRefresh, refreshInterval)
      : null;

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [
    activeChannelType,
    isOnline,
    isPageVisible,
    messagesKey,
    realtimeEnabled,
    scheduleMessagesRefresh,
    surfaceActive,
  ]);

  useEffect(() => {
    if (!supabase || !messagesKey || !canQueryProtectedChat || !realtimeEnabled) {
      return;
    }

    const scope: ChatRealtimeScope = {
      activeChannelType,
      activeActionId,
      activeTopicIds,
      selectedRecipientId,
      currentUserId,
      effectiveZone,
      territoryFocus,
    };
    const channel = supabase
      .channel("chat-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "app_messages" },
        (payload) => {
          if (isRelevantChatMessageChange(payload.new as ChatMessageChange, scope)) {
            scheduleMessagesRefresh();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_poll_votes" },
        () => {
          if (isRelevantChatPollVoteChange(activeChannelType)) {
            scheduleMessagesRefresh();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel).catch((error: unknown) => {
        console.warn("Impossible de fermer le canal temps réel.", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      });
    };
  }, [
    activeActionId,
    activeChannelType,
    activeTopicIds,
    canQueryProtectedChat,
    currentUserId,
    effectiveZone,
    messagesKey,
    realtimeEnabled,
    scheduleMessagesRefresh,
    selectedRecipientId,
    supabase,
    territoryFocus,
  ]);

  return { realtimeEnabled };
}
