"use client";

import { useCallback, useState } from "react";
import type { KeyedMutator } from "swr";

import {
  applyChatPollVoteSummary,
  applyOptimisticChatPollVote,
  normalizeChatPollVoteResponse,
} from "@/lib/chat/poll-votes";

import type { ChatMessage, ChatMessagesResponse } from "../chat-types";

export type ChatShellPollVoteState = {
  pending: boolean;
  error: string | null;
};

type UseChatShellPollVotingParams = {
  messages: ChatMessage[];
  mutateMessages: KeyedMutator<ChatMessagesResponse>;
};

export function useChatShellPollVoting({
  messages,
  mutateMessages,
}: UseChatShellPollVotingParams) {
  const [pollVoteStates, setPollVoteStates] = useState<
    Record<string, ChatShellPollVoteState>
  >({});

  const handlePollVote = useCallback(
    async (messageId: string, optionId: string | null) => {
      const currentMessage = messages.find((candidate) => candidate.id === messageId);
      if (!currentMessage || currentMessage.message_kind !== "poll") {
        return;
      }

      const currentState = pollVoteStates[messageId];
      if (currentState?.pending || currentMessage.selectedOptionId === optionId) {
        return;
      }

      setPollVoteStates((states) => ({
        ...states,
        [messageId]: { pending: true, error: null },
      }));
      await mutateMessages(
        (data) => ({
          ...(data ?? { previousCursor: null, hasMore: false }),
          messages: (data?.messages ?? []).map((message) =>
            message.id === messageId
              ? applyOptimisticChatPollVote(message, optionId)
              : message,
          ),
        }),
        { revalidate: false },
      );

      try {
        const response = await fetch(`/api/chat/polls/${encodeURIComponent(messageId)}/vote`, {
          method: optionId ? "PUT" : "DELETE",
          headers: optionId ? { "Content-Type": "application/json" } : undefined,
          body: optionId ? JSON.stringify({ optionId }) : undefined,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const errorPayload = payload as { hint?: unknown; error?: unknown } | null;
          throw new Error(
            typeof errorPayload?.hint === "string"
              ? errorPayload.hint
              : typeof errorPayload?.error === "string"
                ? errorPayload.error
                : "Votre vote n'a pas pu être enregistré.",
          );
        }

        const summary = normalizeChatPollVoteResponse(payload);
        if (!summary) {
          throw new Error("La réponse du sondage est invalide.");
        }

        await mutateMessages(
          (data) => ({
            ...(data ?? { previousCursor: null, hasMore: false }),
            messages: (data?.messages ?? []).map((message) =>
              message.id === messageId
                ? applyChatPollVoteSummary(message, summary)
                : message,
            ),
          }),
          { revalidate: false },
        );
        setPollVoteStates((states) => ({
          ...states,
          [messageId]: { pending: false, error: null },
        }));
      } catch (error) {
        await mutateMessages(
          (data) => ({
            ...(data ?? { previousCursor: null, hasMore: false }),
            messages: (data?.messages ?? []).map((message) =>
              message.id === messageId ? currentMessage : message,
            ),
          }),
          { revalidate: false },
        );
        setPollVoteStates((states) => ({
          ...states,
          [messageId]: {
            pending: false,
            error: error instanceof Error ? error.message : "Vote indisponible.",
          },
        }));
      }
    },
    [messages, mutateMessages, pollVoteStates],
  );

  return { handlePollVote, pollVoteStates };
}
