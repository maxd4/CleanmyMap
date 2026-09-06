"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ActionParticipationReviewItem,
  ActionParticipationSearchItem,
} from "@/lib/actions/participation/group-participation";

type GroupJoinQueueResponse = {
  status: "ok";
  canReview: boolean;
  pendingRequests: ActionParticipationReviewItem[];
  confirmedParticipants: ActionParticipationReviewItem[];
};

type GroupJoinSearchResponse = {
  status: "ok";
  items: ActionParticipationSearchItem[];
};

export function useJoinFormSectionQueue({
  fr,
  queueActionId,
  reloadAction,
  onActionCountsChanged,
  onNotice,
}: {
  fr: boolean;
  queueActionId: string | null;
  reloadAction: { actionId: string; version: number } | null;
  onActionCountsChanged: (actionId: string, participantsCount: number | null, pendingRequestsCount: number) => void;
  onNotice: (message: string) => void;
}) {
  const [queueRequests, setQueueRequests] = useState<ActionParticipationReviewItem[]>([]);
  const [queueConfirmedParticipants, setQueueConfirmedParticipants] = useState<ActionParticipationReviewItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueCanReview, setQueueCanReview] = useState(false);
  const [reviewingQueueId, setReviewingQueueId] = useState<string | null>(null);
  const [addingQueueParticipantId, setAddingQueueParticipantId] = useState<string | null>(null);
  const [queueSearchQuery, setQueueSearchQuery] = useState("");
  const [queueSearchResults, setQueueSearchResults] = useState<ActionParticipationSearchItem[]>([]);
  const [queueSearchLoading, setQueueSearchLoading] = useState(false);
  const [queueSearchError, setQueueSearchError] = useState<string | null>(null);

  const loadQueue = useCallback(
    async (actionId: string, signal?: AbortSignal) => {
      setQueueLoading(true);
      setQueueError(null);

      try {
        const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/group-join`, { signal });
        const payload = (await response.json()) as GroupJoinQueueResponse | { error?: string };

        if (!response.ok) {
          const message =
            typeof payload === "object" && payload && "error" in payload && payload.error
              ? payload.error
              : fr
                ? "Impossible de charger la file publique."
                : "Unable to load the public queue.";
          setQueueRequests([]);
          setQueueConfirmedParticipants([]);
          setQueueCanReview(false);
          setQueueError(message);
          return null;
        }

        const typedPayload = payload as GroupJoinQueueResponse;
        setQueueRequests(typedPayload.pendingRequests ?? []);
        setQueueConfirmedParticipants(typedPayload.confirmedParticipants ?? []);
        setQueueCanReview(Boolean(typedPayload.canReview));
        return typedPayload;
      } catch (queueFetchError) {
        if ((queueFetchError as { name?: string }).name === "AbortError") {
          return null;
        }
        setQueueRequests([]);
        setQueueConfirmedParticipants([]);
        setQueueCanReview(false);
        setQueueError(fr ? "Impossible de charger la file publique." : "Unable to load the public queue.");
        return null;
      } finally {
        setQueueLoading(false);
      }
    },
    [fr],
  );

  useEffect(() => {
    if (!queueActionId) {
      setQueueRequests([]);
      setQueueConfirmedParticipants([]);
      setQueueCanReview(false);
      setQueueLoading(false);
      setQueueError(null);
      setQueueSearchResults([]);
      setQueueSearchError(null);
      setQueueSearchQuery("");
      return undefined;
    }

    const controller = new AbortController();
    void loadQueue(queueActionId, controller.signal);
    return () => controller.abort();
  }, [loadQueue, queueActionId]);

  useEffect(() => {
    if (reloadAction?.actionId === queueActionId && queueActionId) {
      void loadQueue(queueActionId);
    }
  }, [loadQueue, reloadAction?.actionId, reloadAction?.version, queueActionId]);

  useEffect(() => {
    if (!queueCanReview || !queueActionId) {
      setQueueSearchResults([]);
      setQueueSearchError(null);
      setQueueSearchLoading(false);
      return undefined;
    }

    const query = queueSearchQuery.trim();
    if (query.length < 2) {
      setQueueSearchResults([]);
      setQueueSearchError(null);
      setQueueSearchLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setQueueSearchLoading(true);
      setQueueSearchError(null);

      fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join?q=${encodeURIComponent(query)}&limit=8`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as GroupJoinSearchResponse | { error?: string };
          if (!response.ok) {
            const message =
              typeof payload === "object" && payload && "error" in payload && payload.error
                ? payload.error
                : fr
                  ? "La recherche de comptes a échoué."
                  : "Account search failed.";
            setQueueSearchResults([]);
            setQueueSearchError(message);
            return;
          }
          const typedPayload = payload as GroupJoinSearchResponse;
          setQueueSearchResults(typedPayload.items ?? []);
        })
        .catch((error) => {
          if ((error as { name?: string }).name === "AbortError") return;
          setQueueSearchResults([]);
          setQueueSearchError(fr ? "La recherche de comptes a échoué." : "Account search failed.");
        })
        .finally(() => setQueueSearchLoading(false));
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [fr, queueActionId, queueCanReview, queueSearchQuery]);

  async function reviewQueueRequest(requestId: string, decision: "accept" | "reject") {
    if (!queueActionId || !queueCanReview) return;

    setReviewingQueueId(requestId);
    setQueueError(null);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: requestId, decision }),
      });

      const payload = (await response.json()) as
        | { status: "ok"; participantId: string; participationStatus: "pending" | "confirmed" | "cancelled"; participationSource: "group_form" | "admin" | "admin_override" | "import"; participantsCount: number }
        | { error?: string };

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "La demande n'a pas pu être traitée."
              : "The request could not be processed.";
        setQueueError(message);
        return;
      }

      const refreshedQueue = await loadQueue(queueActionId);
      const refreshedPendingCount = refreshedQueue?.pendingRequests.length ?? 0;
      onActionCountsChanged(
        queueActionId,
        typeof payload === "object" && payload && "participantsCount" in payload
          ? payload.participantsCount
          : null,
        refreshedPendingCount,
      );
      onNotice(decision === "accept" ? (fr ? "Demande acceptée." : "Request approved.") : fr ? "Demande refusée." : "Request rejected.");
    } finally {
      setReviewingQueueId(null);
    }
  }

  async function addQueueParticipant(userId: string) {
    if (!queueActionId || !queueCanReview) return;

    setAddingQueueParticipantId(userId);
    setQueueError(null);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantUserId: userId }),
      });

      const payload = (await response.json()) as
        | { status: "ok"; participantId: string; participantUserId: string; participationStatus: "pending" | "confirmed" | "cancelled"; participationSource: "group_form" | "admin" | "admin_override" | "import"; participantsCount: number }
        | { error?: string };

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "L'ajout du compte a échoué."
              : "Adding the account failed.";
        setQueueError(message);
        return;
      }

      const refreshedQueue = await loadQueue(queueActionId);
      const refreshedPendingCount = refreshedQueue?.pendingRequests.length ?? 0;
      onActionCountsChanged(
        queueActionId,
        typeof payload === "object" && payload && "participantsCount" in payload
          ? payload.participantsCount
          : null,
        refreshedPendingCount,
      );
      onNotice(fr ? "Le compte a été ajouté à l'action." : "The account has been added to the action.");
    } finally {
      setAddingQueueParticipantId(null);
    }
  }

  return {
    queueRequests,
    queueConfirmedParticipants,
    queueLoading,
    queueError,
    queueCanReview,
    reviewingQueueId,
    addingQueueParticipantId,
    queueSearchQuery,
    queueSearchResults,
    queueSearchLoading,
    queueSearchError,
    setQueueSearchQuery,
    reviewQueueRequest,
    addQueueParticipant,
  };
}
