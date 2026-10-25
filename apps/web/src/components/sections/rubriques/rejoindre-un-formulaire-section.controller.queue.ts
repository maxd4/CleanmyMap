"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActionParticipationReviewItem, ActionParticipationSearchItem } from "@/lib/actions/participation/group-participation";

type GroupJoinQueueResponse = { status: "ok"; canReview: boolean; pendingRequests: ActionParticipationReviewItem[]; confirmedParticipants: ActionParticipationReviewItem[] };
type GroupJoinSearchResponse = { status: "ok"; items: ActionParticipationSearchItem[] };
type QueueMutationKind = "review" | "add";
type QueueMutationResponse = { status: "ok"; participantId: string; participantsCount: number } | { error?: string };

function queueMutationFallbackMessage(fr: boolean, kind: QueueMutationKind) {
  return kind === "review" ? fr ? "La demande n'a pas pu être traitée." : "The request could not be processed." : fr ? "L'ajout du compte a échoué." : "Adding the account failed.";
}

function useQueueData({ fr, queueActionId, reloadAction }: { fr: boolean; queueActionId: string | null; reloadAction: { actionId: string; version: number } | null }) {
  const [queueRequests, setQueueRequests] = useState<ActionParticipationReviewItem[]>([]);
  const [queueConfirmedParticipants, setQueueConfirmedParticipants] = useState<ActionParticipationReviewItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueCanReview, setQueueCanReview] = useState(false);

  const loadQueue = useCallback(async (actionId: string, signal?: AbortSignal) => {
    setQueueLoading(true);
    setQueueError(null);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/group-join`, { signal });
      const payload = (await response.json()) as GroupJoinQueueResponse | { error?: string };
      if (!response.ok) {
        const message = payload && "error" in payload && payload.error ? payload.error : fr ? "Impossible de charger la file publique." : "Unable to load the public queue.";
        setQueueRequests([]); setQueueConfirmedParticipants([]); setQueueCanReview(false); setQueueError(message); return null;
      }
      const typedPayload = payload as GroupJoinQueueResponse;
      setQueueRequests(typedPayload.pendingRequests ?? []); setQueueConfirmedParticipants(typedPayload.confirmedParticipants ?? []); setQueueCanReview(Boolean(typedPayload.canReview));
      return typedPayload;
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") return null;
      setQueueRequests([]); setQueueConfirmedParticipants([]); setQueueCanReview(false); setQueueError(fr ? "Impossible de charger la file publique." : "Unable to load the public queue."); return null;
    } finally {
      setQueueLoading(false);
    }
  }, [fr]);

  useEffect(() => {
    if (!queueActionId) return undefined;
    const controller = new AbortController();
    void (async () => { await loadQueue(queueActionId, controller.signal); })().catch(() => undefined);
    return () => controller.abort();
  }, [loadQueue, queueActionId]);
  useEffect(() => {
    if (reloadAction?.actionId !== queueActionId || !queueActionId) return;
    void (async () => { await loadQueue(queueActionId); })().catch(() => undefined);
  }, [loadQueue, reloadAction?.actionId, reloadAction?.version, queueActionId]);

  return { queueRequests, queueConfirmedParticipants, queueLoading, queueError, queueCanReview, setQueueError, loadQueue };
}

function useQueueSearch({ fr, queueActionId, queueCanReview, queueSearchQuery }: { fr: boolean; queueActionId: string | null; queueCanReview: boolean; queueSearchQuery: string }) {
  const [queueSearchResults, setQueueSearchResults] = useState<ActionParticipationSearchItem[]>([]);
  const [queueSearchLoading, setQueueSearchLoading] = useState(false);
  const [queueSearchError, setQueueSearchError] = useState<string | null>(null);
  useEffect(() => {
    const query = queueSearchQuery.trim();
    if (!queueCanReview || !queueActionId || query.length < 2) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setQueueSearchLoading(true); setQueueSearchError(null);
      fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join?q=${encodeURIComponent(query)}&limit=8`, { signal: controller.signal })
        .then(async (response) => {
          const payload = (await response.json()) as GroupJoinSearchResponse | { error?: string };
          if (!response.ok) {
            const message = payload && "error" in payload && payload.error ? payload.error : fr ? "La recherche de comptes a échoué." : "Account search failed.";
            setQueueSearchResults([]); setQueueSearchError(message); return;
          }
          setQueueSearchResults((payload as GroupJoinSearchResponse).items ?? []);
        })
        .catch((error) => {
          if ((error as { name?: string }).name === "AbortError") return;
          setQueueSearchResults([]); setQueueSearchError(fr ? "La recherche de comptes a échoué." : "Account search failed.");
        })
        .finally(() => setQueueSearchLoading(false));
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [fr, queueActionId, queueCanReview, queueSearchQuery]);
  return { queueSearchResults, queueSearchLoading, queueSearchError };
}

function useQueueMutations({ fr, queueActionId, queueCanReview, loadQueue, setQueueError, onActionCountsChanged, onNotice }: { fr: boolean; queueActionId: string | null; queueCanReview: boolean; loadQueue: (actionId: string, signal?: AbortSignal) => Promise<GroupJoinQueueResponse | null>; setQueueError: (error: string | null) => void; onActionCountsChanged: (actionId: string, participantsCount: number | null, pendingRequestsCount: number) => void; onNotice: (message: string) => void }) {
  const [reviewingQueueId, setReviewingQueueId] = useState<string | null>(null);
  const [addingQueueParticipantId, setAddingQueueParticipantId] = useState<string | null>(null);
  async function reviewQueueRequest(requestId: string, decision: "accept" | "reject") {
    if (!queueActionId || !queueCanReview) return;
    setReviewingQueueId(requestId); setQueueError(null);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantId: requestId, decision }) });
      const payload = (await response.json()) as QueueMutationResponse;
      if (!response.ok) { setQueueError(payload && "error" in payload && payload.error ? payload.error : queueMutationFallbackMessage(fr, "review")); return; }
      const refreshedQueue = await loadQueue(queueActionId);
      if (refreshedQueue) onActionCountsChanged(queueActionId, "participantsCount" in payload ? payload.participantsCount : null, refreshedQueue.pendingRequests.length);
      onNotice(decision === "accept" ? fr ? "Demande acceptée." : "Request approved." : fr ? "Demande refusée." : "Request rejected.");
    } catch { setQueueError(queueMutationFallbackMessage(fr, "review")); }
    finally { setReviewingQueueId(null); }
  }
  async function addQueueParticipant(userId: string) {
    if (!queueActionId || !queueCanReview) return;
    setAddingQueueParticipantId(userId); setQueueError(null);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantUserId: userId }) });
      const payload = (await response.json()) as QueueMutationResponse;
      if (!response.ok) { setQueueError(payload && "error" in payload && payload.error ? payload.error : queueMutationFallbackMessage(fr, "add")); return; }
      const refreshedQueue = await loadQueue(queueActionId);
      if (refreshedQueue) onActionCountsChanged(queueActionId, "participantsCount" in payload ? payload.participantsCount : null, refreshedQueue.pendingRequests.length);
      onNotice(fr ? "Le compte a été ajouté à l'action." : "The account has been added to the action.");
    } catch { setQueueError(queueMutationFallbackMessage(fr, "add")); }
    finally { setAddingQueueParticipantId(null); }
  }
  return { reviewingQueueId, addingQueueParticipantId, reviewQueueRequest, addQueueParticipant };
}

export function useJoinFormSectionQueue({ fr, queueActionId, reloadAction, onActionCountsChanged, onNotice }: { fr: boolean; queueActionId: string | null; reloadAction: { actionId: string; version: number } | null; onActionCountsChanged: (actionId: string, participantsCount: number | null, pendingRequestsCount: number) => void; onNotice: (message: string) => void }) {
  const [queueSearchQuery, setQueueSearchQuery] = useState("");
  const data = useQueueData({ fr, queueActionId, reloadAction });
  const search = useQueueSearch({ fr, queueActionId, queueCanReview: data.queueCanReview, queueSearchQuery });
  const mutations = useQueueMutations({ fr, queueActionId, queueCanReview: data.queueCanReview, loadQueue: data.loadQueue, setQueueError: data.setQueueError, onActionCountsChanged, onNotice });
  const visible = queueActionId ? data : { ...data, queueRequests: [], queueConfirmedParticipants: [], queueLoading: false, queueError: null, queueCanReview: false };
  const activeSearch = visible.queueCanReview && queueSearchQuery.trim().length >= 2;
  return { queueRequests: visible.queueRequests, queueConfirmedParticipants: visible.queueConfirmedParticipants, queueLoading: visible.queueLoading, queueError: visible.queueError, queueCanReview: visible.queueCanReview, reviewingQueueId: mutations.reviewingQueueId, addingQueueParticipantId: mutations.addingQueueParticipantId, queueSearchQuery, queueSearchResults: activeSearch ? search.queueSearchResults : [], queueSearchLoading: activeSearch ? search.queueSearchLoading : false, queueSearchError: activeSearch ? search.queueSearchError : null, setQueueSearchQuery, reviewQueueRequest: mutations.reviewQueueRequest, addQueueParticipant: mutations.addQueueParticipant };
}
