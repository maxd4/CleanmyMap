"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getChatFeedState, type ChatFeedState } from "../chat-feed-state";
import type { ChatChannelType } from "@/lib/chat/channels";
import { isChatRealtimeEnabled } from "@/lib/chat/chat-config";
import { readAppErrorResponse, toAppError } from "@/lib/errors/app-errors";
import type {
  ChatMessagesResponse,
  ChatMessage,
  ChatUser,
  ChatUsersResponse,
} from "../chat-types";

type UseChatDataParams = {
  activeChannelType: ChatChannelType;
  selectedRecipientId: string | null;
  effectiveZone: string;
  territoryFocus: number | null;
  showMentions: boolean;
  mentionQuery: string;
  recipientQuery: string;
  currentUserId?: string;
  canAccessProtectedChat?: boolean;
  supabase?: SupabaseClient | null;
};

export type SendChatMessageParams = {
  optimisticMessage: ChatMessage;
  body: {
    channelType: ChatChannelType;
    content: string;
    recipientId?: string;
    arrondissementId?: number;
    zoneName?: string;
    attachmentUrl?: string;
    attachmentType?: string;
  };
};

type FetcherErrorPayload = {
  hint?: unknown;
  message?: unknown;
};

type ChatMessageChange = {
  channel_type?: string;
  sender_id?: string;
  recipient_id?: string | null;
  zone_name?: string | null;
  arrondissement_id?: number | null;
};

type ChatRefreshContext = {
  activeChannelType: ChatChannelType;
  realtimeEnabled: boolean;
  isVisible: boolean;
  isOnline: boolean;
};

const CHAT_REFRESH_INTERVALS_MS: Record<
  ChatChannelType,
  {
    realtime: number;
    fallback: number;
  }
> = {
  community: { realtime: 300_000, fallback: 900_000 },
  dm: { realtime: 180_000, fallback: 600_000 },
  admin_elu: { realtime: 300_000, fallback: 900_000 },
  territory: { realtime: 240_000, fallback: 720_000 },
  bug_report: { realtime: 180_000, fallback: 600_000 },
};

export function getChatRefreshIntervalMs({
  activeChannelType,
  realtimeEnabled,
  isVisible,
  isOnline,
}: ChatRefreshContext): number {
  if (!isOnline || !isVisible) {
    return 0;
  }

  const interval = CHAT_REFRESH_INTERVALS_MS[activeChannelType];
  return realtimeEnabled ? interval.realtime : interval.fallback;
}

const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => ({}))) as FetcherErrorPayload;

  if (!response.ok) {
    const message =
      typeof payload.hint === "string"
        ? payload.hint
        : typeof payload.message === "string"
          ? payload.message
          : "Le service de discussion est momentanément indisponible. Nous tentons de rétablir la connexion.";
    throw new Error(message);
  }

  return payload as T;
};

function buildMessagesKey({
  activeChannelType,
  selectedRecipientId,
  effectiveZone,
  territoryFocus,
}: Pick<
  UseChatDataParams,
  "activeChannelType" | "selectedRecipientId" | "effectiveZone" | "territoryFocus"
>): string | null {
  if (activeChannelType === "dm") {
    return selectedRecipientId
      ? `/api/chat?channelType=dm&recipientId=${encodeURIComponent(selectedRecipientId)}`
      : null;
  }

  if (activeChannelType === "territory") {
    if (effectiveZone) {
      return `/api/chat?channelType=territory&zoneName=${encodeURIComponent(effectiveZone)}`;
    }

    return territoryFocus
      ? `/api/chat?channelType=territory&arrondissementId=${territoryFocus}`
      : null;
  }

  return `/api/chat?channelType=${activeChannelType}`;
}

export function useChatData({
  activeChannelType,
  selectedRecipientId,
  effectiveZone,
  territoryFocus,
  showMentions,
  mentionQuery,
  recipientQuery,
  currentUserId,
  canAccessProtectedChat = Boolean(currentUserId),
  supabase,
}: UseChatDataParams) {
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState !== "hidden",
  );
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const realtimeEnabled = isChatRealtimeEnabled();
  const canQueryProtectedChat = canAccessProtectedChat && Boolean(currentUserId);
  const deferredMentionQuery = useDeferredValue(mentionQuery.trim());
  const deferredRecipientQuery = useDeferredValue(recipientQuery.trim());
  const messagesKey = canQueryProtectedChat
    ? buildMessagesKey({
        activeChannelType,
        selectedRecipientId,
        effectiveZone,
        territoryFocus,
      })
    : null;

  const mentionUsersKey =
    canQueryProtectedChat &&
    showMentions &&
    deferredMentionQuery.length >= 2
      ? `/api/chat/users?q=${encodeURIComponent(deferredMentionQuery)}`
      : null;

  const dmUsersKey =
    canQueryProtectedChat &&
    activeChannelType === "dm"
      ? `/api/chat/users${
          deferredRecipientQuery.length >= 2
            ? `?q=${encodeURIComponent(deferredRecipientQuery)}`
            : ""
        }`
      : null;

  const { data: mentionUsersData } = useSWR<ChatUsersResponse>(mentionUsersKey, fetcher);
  const { data: dmUsersData } = useSWR<ChatUsersResponse>(dmUsersKey, fetcher);

  const {
    data: messagesData,
    error: messagesError,
    isLoading,
    mutate: mutateMessages,
  } = useSWR<ChatMessagesResponse>(messagesKey, fetcher, {
    // Polling keeps the feed fresh without relying on Supabase Realtime by default.
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    refreshInterval: () =>
      getChatRefreshIntervalMs({
        activeChannelType,
        realtimeEnabled,
        isVisible: isPageVisible,
        isOnline,
      }),
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshAtRef = useRef(0);

  const scheduleMessagesRefresh = useCallback(() => {
    if (!messagesKey) {
      return;
    }

    const now = Date.now();
    const minGapMs = realtimeEnabled ? 8_000 : 15_000;
    const elapsed = now - lastRefreshAtRef.current;

    if (elapsed >= minGapMs) {
      lastRefreshAtRef.current = now;
      void mutateMessages();
      return;
    }

    if (refreshTimerRef.current) {
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      lastRefreshAtRef.current = Date.now();
      void mutateMessages();
    }, minGapMs - elapsed);
  }, [messagesKey, mutateMessages, realtimeEnabled]);

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

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [messagesKey, scheduleMessagesRefresh]);

  // Real-time subscription
  useEffect(() => {
    if (!supabase || !messagesKey || !canQueryProtectedChat || !realtimeEnabled) {
      return;
    }

    const channel = supabase
      .channel("chat-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessageChange;
          
          // Basic filtering to avoid excessive revalidations
          // We trigger revalidation if the channel type matches
          if (newMsg.channel_type === activeChannelType) {
            // Further filtering for DMs or Territory
            if (activeChannelType === "dm") {
              if (
                (newMsg.sender_id === currentUserId && newMsg.recipient_id === selectedRecipientId) ||
                (newMsg.sender_id === selectedRecipientId && newMsg.recipient_id === currentUserId)
              ) {
                scheduleMessagesRefresh();
              }
            } else if (activeChannelType === "territory") {
              // Match by zone or arrondissement
              if (
                (newMsg.zone_name && newMsg.zone_name === effectiveZone) ||
                (newMsg.arrondissement_id && newMsg.arrondissement_id === territoryFocus)
              ) {
                scheduleMessagesRefresh();
              }
            } else {
              // Global channels (community, admin_elu, etc.)
              scheduleMessagesRefresh();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    supabase,
    messagesKey,
    canQueryProtectedChat,
    activeChannelType,
    selectedRecipientId,
    currentUserId,
    effectiveZone,
    territoryFocus,
    scheduleMessagesRefresh,
    realtimeEnabled,
  ]);

  const messages = messagesData?.messages ?? [];
  const feedState: ChatFeedState = getChatFeedState({
    isLoading,
    hasMessages: messages.length > 0,
    hasError: Boolean(messagesError),
  });

  const mentionSuggestions = ((mentionUsersData?.users ?? []) as ChatUser[]).filter(
    (candidate) => candidate.id !== currentUserId,
  );

  const dmSuggestions = ((dmUsersData?.users ?? []) as ChatUser[]).filter(
    (candidate) => candidate.id !== currentUserId,
  );

  const sendChatMessage = useCallback(
    async ({ optimisticMessage, body }: SendChatMessageParams) => {
      if (!messagesKey) {
        throw toAppError("Le canal actif n'est pas prêt pour l'envoi.", {
          kind: "validation",
          message: "Le canal actif n'est pas prêt pour l'envoi.",
        });
      }

      await mutateMessages(
        async (currentData) => {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw await readAppErrorResponse(
              response,
              "Envoi impossible pour le moment. Veuillez réessayer.",
            );
          }

          const payload = (await response.json().catch(() => null)) as
            | { message?: ChatMessage }
            | null;
          const serverMessage = payload?.message ?? optimisticMessage;
          const baseMessages = currentData?.messages ?? [];

          return {
            messages: [
              ...baseMessages.filter(
                (message) => message.id !== optimisticMessage.id,
              ),
              serverMessage,
            ],
          };
        },
        {
          optimisticData: (currentData) => ({
            messages: [...(currentData?.messages ?? []), optimisticMessage],
          }),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [messagesKey, mutateMessages],
  );

  return {
    messages,
    messagesData,
    messagesError,
    isLoading,
    mutateMessages,
    feedState,
    mentionSuggestions,
    dmSuggestions,
    sendChatMessage,
    isLive: !!supabase && canQueryProtectedChat && realtimeEnabled,
  };
}
