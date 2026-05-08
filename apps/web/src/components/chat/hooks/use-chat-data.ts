"use client";

import { useCallback } from "react";
import useSWR from "swr";

import { getChatFeedState, type ChatFeedState } from "../chat-feed-state";
import type { ChatChannelType } from "@/lib/chat/channels";
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
};

type SendChatMessageParams = {
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
}: UseChatDataParams) {
  const messagesKey = buildMessagesKey({
    activeChannelType,
    selectedRecipientId,
    effectiveZone,
    territoryFocus,
  });

  const mentionUsersKey =
    showMentions && mentionQuery.trim().length > 0
      ? `/api/chat/users?q=${encodeURIComponent(mentionQuery.trim())}`
      : null;

  const dmUsersKey =
    activeChannelType === "dm"
      ? `/api/chat/users${
          recipientQuery.trim().length > 0
            ? `?q=${encodeURIComponent(recipientQuery.trim())}`
            : ""
        }`
      : null;

  const {
    data: mentionUsersData,
  } = useSWR<ChatUsersResponse>(mentionUsersKey, fetcher);

  const { data: dmUsersData } = useSWR<ChatUsersResponse>(dmUsersKey, fetcher);

  const {
    data: messagesData,
    error: messagesError,
    isLoading,
    mutate: mutateMessages,
  } = useSWR<ChatMessagesResponse>(messagesKey, fetcher, {
    refreshInterval: 30000,
  });

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
  };
}
