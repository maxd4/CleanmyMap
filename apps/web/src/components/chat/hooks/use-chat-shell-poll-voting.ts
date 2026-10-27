"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  retryOptionId?: string | null;
};

type UseChatShellPollVotingParams = {
  messages: ChatMessage[];
  messagesKey: string | null;
  mutateMessages: KeyedMutator<ChatMessagesResponse>;
};

export function useChatShellPollVoting({
  messages,
  messagesKey,
  mutateMessages,
}: UseChatShellPollVotingParams) {
  const [pollVoteStates, setPollVoteStates] = useState<
    Record<string, ChatShellPollVoteState>
  >({});
  const scopeKeyRef = useRef(messagesKey);
  const requestVersionRef = useRef<Record<string, number>>({});
  const pendingRequestRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    scopeKeyRef.current = messagesKey;
    requestVersionRef.current = {};
    pendingRequestRef.current = {};
    setPollVoteStates({});
  }, [messagesKey]);

  const submitPollVote = useCallback(
    async (messageId: string, optionId: string | null, force: boolean) => {
      const currentMessage = messages.find((candidate) => candidate.id === messageId);
      if (!currentMessage || currentMessage.message_kind !== "poll") {
        return;
      }

      const currentState = pollVoteStates[messageId];
      if (currentState?.pending || pendingRequestRef.current[messageId] || (!force && currentMessage.selectedOptionId === optionId)) {
        return;
      }

      const requestedScopeKey = messagesKey;
      const requestVersion = (requestVersionRef.current[messageId] ?? 0) + 1;
      requestVersionRef.current[messageId] = requestVersion;
      pendingRequestRef.current[messageId] = true;
      const isCurrentRequest = () =>
        scopeKeyRef.current === requestedScopeKey &&
        requestVersionRef.current[messageId] === requestVersion;
      const previousOptionId = currentMessage.selectedOptionId ?? null;

      setPollVoteStates((states) => ({
        ...states,
        [messageId]: { pending: true, error: null, retryOptionId: optionId },
      }));

      try {
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
        const response = await fetch(`/api/chat/polls/${encodeURIComponent(messageId)}/vote`, {
          method: optionId ? "PUT" : "DELETE",
          headers: optionId ? { "Content-Type": "application/json" } : undefined,
          body: optionId ? JSON.stringify({ optionId }) : undefined,
        });
        const payload: unknown = await response.json().catch(() => null);
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

        if (!isCurrentRequest()) {
          return;
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
          [messageId]: { pending: false, error: null, retryOptionId: null },
        }));
      } catch (error) {
        if (!isCurrentRequest()) {
          return;
        }

        // A timeout may mean that the server committed the idempotent vote.
        // Revalidate first; only inverse the optimistic transition if the
        // current cache still exposes the optimistic selection.
        let reconciledData: ChatMessagesResponse | undefined;
        try {
          reconciledData = await mutateMessages(undefined, { revalidate: true });
        } catch {
          reconciledData = undefined;
        }

        if (!isCurrentRequest()) {
          return;
        }

        const reconciledSelection = reconciledData?.messages.find(
          (candidate) => candidate.id === messageId,
        )?.selectedOptionId;
        if (reconciledSelection === optionId) {
          setPollVoteStates((states) => ({
            ...states,
            [messageId]: { pending: false, error: null, retryOptionId: null },
          }));
          return;
        }

        await mutateMessages(
          (data) => ({
            ...(data ?? { previousCursor: null, hasMore: false }),
            messages: (data?.messages ?? []).map((message) =>
              message.id === messageId &&
              message.selectedOptionId === optionId &&
              reconciledData?.messages.find((candidate) => candidate.id === messageId)?.selectedOptionId !== optionId
                ? applyOptimisticChatPollVote(message, previousOptionId)
                : message,
            ),
          }),
          { revalidate: false },
        );
        setPollVoteStates((states) => ({
          ...states,
          [messageId]: {
            pending: false,
            error: error instanceof Error ? error.message : "Vote indisponible.",
            retryOptionId: optionId,
          },
        }));
      } finally {
        pendingRequestRef.current[messageId] = false;
      }
    },
    [messages, messagesKey, mutateMessages, pollVoteStates],
  );

  const handlePollVote = useCallback(
    (messageId: string, optionId: string | null) => submitPollVote(messageId, optionId, false),
    [submitPollVote],
  );
  const retryPollVote = useCallback(
    (messageId: string) => {
      const optionId = pollVoteStates[messageId]?.retryOptionId;
      if (optionId === undefined) return Promise.resolve();
      return submitPollVote(messageId, optionId, true);
    },
    [pollVoteStates, submitPollVote],
  );

  return { handlePollVote, retryPollVote, pollVoteStates };
}
