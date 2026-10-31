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

async function fetchPollVotePayload(messageId: string, optionId: string | null) {
  const response = await fetch(`/api/chat/polls/${encodeURIComponent(messageId)}/vote`, {
    method: optionId ? "PUT" : "DELETE",
    headers: optionId ? { "Content-Type": "application/json" } : undefined,
    body: optionId ? JSON.stringify({ optionId }) : undefined,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = payload as { hint?: unknown; error?: unknown } | null;
    throw new Error(typeof errorPayload?.hint === "string" ? errorPayload.hint : typeof errorPayload?.error === "string" ? errorPayload.error : "Votre vote n'a pas pu être enregistré.");
  }
  return payload;
}

function requirePollVoteSummary(messageId: string, payload: unknown) {
  const summary = normalizeChatPollVoteResponse(payload);
  if (!summary) throw new Error("La réponse du sondage est invalide.");
  if (summary.messageId !== messageId) throw new Error("La réponse du sondage ne correspond pas au sondage demandé.");
  return summary;
}

async function fetchPollVoteSummary(messageId: string, optionId: string | null) {
  return requirePollVoteSummary(messageId, await fetchPollVotePayload(messageId, optionId));
}

function updatePollCache(
  mutateMessages: KeyedMutator<ChatMessagesResponse>,
  messageId: string,
  isCurrentRequest: () => boolean,
  updateMessage: (message: ChatMessage) => ChatMessage,
) {
  return mutateMessages((data) => {
    if (!isCurrentRequest()) return data;
    return {
      ...(data ?? { previousCursor: null, hasMore: false }),
      messages: (data?.messages ?? []).map((message) => message.id === messageId ? updateMessage(message) : message),
    };
  }, { revalidate: false });
}

async function reconcilePollVoteFailure(params: {
  error: unknown;
  messageId: string;
  optionId: string | null;
  previousOptionId: string | null;
  isCurrentRequest: () => boolean;
  mutateMessages: KeyedMutator<ChatMessagesResponse>;
  setPollVoteStates: React.Dispatch<React.SetStateAction<Record<string, ChatShellPollVoteState>>>;
}) {
  const { error, messageId, optionId, previousOptionId, isCurrentRequest, mutateMessages, setPollVoteStates } = params;
  let reconciledData: ChatMessagesResponse | undefined;
  try {
    reconciledData = await mutateMessages(undefined, { revalidate: true });
  } catch {
    reconciledData = undefined;
  }
  if (!isCurrentRequest()) return;
  const reconciledSelection = reconciledData?.messages.find((candidate) => candidate.id === messageId)?.selectedOptionId;
  if (reconciledSelection === optionId) {
    setPollVoteStates((states) => ({ ...states, [messageId]: { pending: false, error: null, retryOptionId: null } }));
    return;
  }
  await mutateMessages((data) => {
    if (!isCurrentRequest()) return data;
    const serverSelection = reconciledData?.messages.find((candidate) => candidate.id === messageId)?.selectedOptionId;
    return {
      ...(data ?? { previousCursor: null, hasMore: false }),
      messages: (data?.messages ?? []).map((message) => message.id === messageId && message.selectedOptionId === optionId && serverSelection !== optionId ? applyOptimisticChatPollVote(message, previousOptionId) : message),
    };
  }, { revalidate: false });
  if (!isCurrentRequest()) return;
  setPollVoteStates((states) => ({ ...states, [messageId]: { pending: false, error: error instanceof Error ? error.message : "Vote indisponible.", retryOptionId: optionId } }));
}

export function useChatShellPollVoting({
  messages,
  messagesKey,
  mutateMessages,
}: UseChatShellPollVotingParams) {
  const [pollVoteStates, setPollVoteStates] = useState<
    Record<string, ChatShellPollVoteState>
  >({});
  const scopeKeyRef = useRef(messagesKey);
  const scopeGenerationRef = useRef(0);
  const initialScopeEffectRef = useRef(true);
  const requestIdentityRef = useRef(0);
  const activeRequestRef = useRef<Record<string, number>>({});
  const pendingRequestRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const scopeGeneration = ++scopeGenerationRef.current;
    const requestIdentityAtScopeChange = requestIdentityRef.current;
    scopeKeyRef.current = messagesKey;
    activeRequestRef.current = {};
    pendingRequestRef.current = {};
    if (initialScopeEffectRef.current) {
      initialScopeEffectRef.current = false;
      return;
    }
    queueMicrotask(() => {
      if (scopeGenerationRef.current !== scopeGeneration) return;
      if (requestIdentityRef.current !== requestIdentityAtScopeChange) return;
      setPollVoteStates({});
    });
  }, [messagesKey]);

  const submitPollVote = useCallback(
    async (messageId: string, optionId: string | null, force: boolean) => {
      const currentMessage = messages.find((candidate) => candidate.id === messageId);
      if (!currentMessage || currentMessage.message_kind !== "poll") {
        return;
      }

      if (pendingRequestRef.current[messageId] || (!force && currentMessage.selectedOptionId === optionId)) {
        return;
      }

      const requestedScopeKey = messagesKey;
      const requestIdentity = ++requestIdentityRef.current;
      activeRequestRef.current[messageId] = requestIdentity;
      pendingRequestRef.current[messageId] = requestIdentity;
      const isCurrentRequest = () =>
        scopeKeyRef.current === requestedScopeKey &&
        activeRequestRef.current[messageId] === requestIdentity;
      const previousOptionId = currentMessage.selectedOptionId ?? null;

      setPollVoteStates((states) => ({
        ...states,
        [messageId]: { pending: true, error: null, retryOptionId: optionId },
      }));

      try {
        if (!isCurrentRequest()) return;
        await updatePollCache(mutateMessages, messageId, isCurrentRequest, (message) => applyOptimisticChatPollVote(message, optionId));
        if (!isCurrentRequest()) return;
        const summary = await fetchPollVoteSummary(messageId, optionId);

        if (!isCurrentRequest()) {
          return;
        }
        await updatePollCache(mutateMessages, messageId, isCurrentRequest, (message) => applyChatPollVoteSummary(message, summary));
        if (!isCurrentRequest()) return;
        setPollVoteStates((states) => ({
          ...states,
          [messageId]: { pending: false, error: null, retryOptionId: null },
        }));
      } catch (error) {
        if (!isCurrentRequest()) return;
        await reconcilePollVoteFailure({ error, messageId, optionId, previousOptionId, isCurrentRequest, mutateMessages, setPollVoteStates });
      } finally {
        if (activeRequestRef.current[messageId] === requestIdentity) {
          delete pendingRequestRef.current[messageId];
        }
      }
    },
    [messages, messagesKey, mutateMessages],
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
