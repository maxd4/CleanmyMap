"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getChatFeedState, type ChatFeedState } from "../chat-feed-state";
import { useChatSurfaceActivity } from "../chat-surface-activity-context";
import { fetchChatJson, useChatUserSearch, useDebouncedChatQuery } from "./use-chat-user-search";
import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatMessageKind } from "@/lib/chat/announcements";
import { readAppErrorResponse, toAppError } from "@/lib/errors/app-errors";
import type {
  ChatMessagesResponse,
  ChatMessage,
  ChatUser,
} from "../chat-types";
import type { ChatHistoryCursor } from "@/lib/chat/chat-pagination";
import { getChatTopicIdsForPresentationScope } from "@/lib/chat/topic-presentation";
import { useChatDataRefresh } from "./use-chat-data-refresh";
import { buildMessagesKey, getRecentMessagesKey, mergeChatMessages } from "./use-chat-data.model";

export { buildMessagesKey, getChatRefreshIntervalMs } from "./use-chat-data.model";

type UseChatDataParams = {
  activeChannelType: ChatChannelType;
  activeActionId?: string | null;
  activeTopicId: ChatTopicId | null;
  activeTopicIds?: readonly ChatTopicId[] | null;
  selectedRecipientId: string | null;
  effectiveZone: string;
  territoryFocus: number | null;
  showMentions: boolean;
  mentionQuery: string;
  recipientQuery: string;
  initialMessageId?: string | null;
  currentUserId?: string;
  canAccessProtectedChat?: boolean;
  supabase?: SupabaseClient | null;
  surfaceActive?: boolean;
};

export type SendChatMessageParams = {
  optimisticMessage: ChatMessage;
  body: {
    channelType: ChatChannelType;
    messageKind: ChatMessageKind;
    pollOptions?: string[];
    relatedEventId?: string;
    topicId?: ChatTopicId;
    content: string;
    recipientId?: string;
    arrondissementId?: number;
    zoneName?: string;
    attachmentUrl?: string;
    attachmentPath?: string;
    attachmentType?: string;
    attachmentSize?: number;
    actionId?: string;
    feedbackId?: string;
    operationId?: string;
  };
};

export function useChatData({
  activeChannelType,
  activeActionId,
  activeTopicId,
  activeTopicIds = getChatTopicIdsForPresentationScope(activeChannelType, activeTopicId),
  selectedRecipientId,
  effectiveZone,
  territoryFocus,
  showMentions,
  mentionQuery,
  recipientQuery,
  initialMessageId = null,
  currentUserId,
  canAccessProtectedChat = Boolean(currentUserId),
  supabase,
  surfaceActive: requestedSurfaceActive = true,
}: UseChatDataParams) {
  const contextSurfaceActive = useChatSurfaceActivity();
  const surfaceActive = requestedSurfaceActive && contextSurfaceActive;
  const canQueryProtectedChat = canAccessProtectedChat && Boolean(currentUserId);
  const deferredMentionQuery = useDebouncedChatQuery(mentionQuery);
  const deferredRecipientQuery = useDebouncedChatQuery(recipientQuery);
  const messagesKey = surfaceActive && canQueryProtectedChat
    ? buildMessagesKey({
        activeChannelType,
        activeActionId,
        activeTopicId,
        activeTopicIds,
        selectedRecipientId,
        effectiveZone,
        territoryFocus,
        initialMessageId,
      })
    : null;

  const mentionUsersKey =
    surfaceActive &&
    canQueryProtectedChat &&
    showMentions &&
    deferredMentionQuery.length >= 2
      ? `/api/chat/users?q=${encodeURIComponent(deferredMentionQuery)}`
      : null;

  const dmUsersKey =
    surfaceActive &&
    canQueryProtectedChat &&
    activeChannelType === "dm"
      ? `/api/chat/users${
          deferredRecipientQuery.length >= 2
            ? `?q=${encodeURIComponent(deferredRecipientQuery)}`
            : ""
        }`
      : null;

  const { mentionUsersData, dmUsersData } = useChatUserSearch({
    mentionUsersKey,
    dmUsersKey,
  });

  const {
    data: messagesData,
    error: messagesError,
    isLoading,
    mutate: mutateMessages,
  } = useSWR<ChatMessagesResponse>(messagesKey, fetchChatJson, {
    // Historical pages are merged explicitly; SWR must not replace them with the recent page.
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const currentMessagesKeyRef = useRef(messagesKey);
  useEffect(() => {
    currentMessagesKeyRef.current = messagesKey;
  }, [messagesKey]);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [loadPreviousError, setLoadPreviousError] = useState<string | null>(null);

  const { realtimeEnabled } = useChatDataRefresh({
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
  });

  const messages = messagesData?.messages ?? [];

  const loadPreviousMessages = useCallback(async () => {
    if (!messagesKey || !messagesData?.hasMore || !messagesData.previousCursor || isLoadingPrevious) {
      return;
    }

    const requestedMessagesKey = messagesKey;
    setIsLoadingPrevious(true);
    setLoadPreviousError(null);
    const cursor: ChatHistoryCursor = messagesData.previousCursor;
    try {
      const url = new URL(getRecentMessagesKey(messagesKey), "https://chat.local");
      url.searchParams.set("beforeCreatedAt", cursor.createdAt);
      url.searchParams.set("beforeId", cursor.id);
      const olderData = await fetchChatJson<ChatMessagesResponse>(
        `${url.pathname}${url.search}`,
      );
      if (currentMessagesKeyRef.current !== requestedMessagesKey) {
        return;
      }
      await mutateMessages(
        (currentData) => {
          if (currentMessagesKeyRef.current !== requestedMessagesKey) {
            return currentData;
          }
          const baseData = currentData ?? messagesData;
          return {
            ...baseData,
            messages: mergeChatMessages([olderData.messages, baseData.messages]),
            previousCursor: olderData.previousCursor,
            hasMore: olderData.hasMore,
          };
        },
        { revalidate: false },
      );
    } catch (error) {
      if (currentMessagesKeyRef.current === requestedMessagesKey) {
        setLoadPreviousError(
          error instanceof Error
            ? error.message
            : "Les messages précédents ne peuvent pas être chargés.",
        );
      }
      if (currentMessagesKeyRef.current !== requestedMessagesKey) {
        return;
      }
      throw error;
    } finally {
      setIsLoadingPrevious(false);
    }
  }, [isLoadingPrevious, messagesData, messagesKey, mutateMessages]);
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

      const requestedMessagesKey = messagesKey;
      let sentMessage: ChatMessage = optimisticMessage;
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

          if (currentMessagesKeyRef.current !== requestedMessagesKey) {
            return currentData;
          }

          const payload = (await response.json().catch(() => null)) as
            | { message?: ChatMessage }
            | null;
          const serverMessage = payload?.message
            ? {
                ...optimisticMessage,
                ...payload.message,
                attachment_url:
                  payload.message.attachment_url ?? optimisticMessage.attachment_url,
              }
            : optimisticMessage;
          sentMessage = serverMessage;
          const baseMessages = currentData?.messages ?? [];

          return {
            ...(currentData ?? { previousCursor: null, hasMore: false }),
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
            ...(currentData ?? { previousCursor: null, hasMore: false }),
            messages: [...(currentData?.messages ?? []), optimisticMessage],
          }),
          rollbackOnError: true,
          revalidate: false,
        },
      );
      return sentMessage;
    },
    [messagesKey, mutateMessages],
  );

  return {
    messages,
    messagesData,
    messagesError,
    hasMoreMessages: messagesData?.hasMore ?? false,
    isLoadingPrevious,
    loadPreviousError,
    loadPreviousMessages,
    targetMessageId: messagesData?.targetMessageId ?? null,
    targetStatus: messagesData?.targetStatus,
    isLoading,
    mutateMessages,
    feedState,
    mentionSuggestions,
    dmSuggestions,
    sendChatMessage,
    isLive: surfaceActive && !!supabase && canQueryProtectedChat && realtimeEnabled,
  };
}
