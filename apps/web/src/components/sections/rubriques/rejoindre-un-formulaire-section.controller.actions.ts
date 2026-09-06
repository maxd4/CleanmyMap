"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  JoinableActionHistoryItem,
  JoinableActionItem,
} from "@/lib/actions/participation/group-participation";

type JoinableActionsResponse = {
  status: "ok";
  authenticated: boolean;
  count: number;
  items: JoinableActionItem[];
  history: JoinableActionHistoryItem[];
};

type JoinActionResponse = {
  status: "ok";
  actionId: string;
  alreadyJoined: boolean;
  joinedAt: string;
  participationStatus: "pending" | "confirmed" | "cancelled";
  participationSource: "group_form" | "admin" | "admin_override" | "import";
  participationUpdatedAt: string | null;
  participantsCount: number;
};

type LeaveActionResponse = {
  status: "ok";
  actionId: string;
  alreadyCancelled: boolean;
  joinedAt: string;
  participationStatus: "cancelled";
  participationSource: "group_form" | "admin" | "admin_override" | "import";
  participationUpdatedAt: string | null;
  participantsCount: number;
};

export function useJoinFormSectionActions({
  fr,
  listUrl,
  onQueueMutation,
}: {
  fr: boolean;
  listUrl: string;
  onQueueMutation?: (actionId: string) => void;
}) {
  const [items, setItems] = useState<JoinableActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [historyItems, setHistoryItems] = useState<JoinableActionHistoryItem[]>([]);
  const [pendingJoinActionId, setPendingJoinActionId] = useState<string | null>(null);
  const [pendingLeaveActionId, setPendingLeaveActionId] = useState<string | null>(null);

  const loadActions = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(listUrl, { signal });

        if (!response.ok) {
          throw new Error("Impossible de charger les pré-formulaires.");
        }

        const payload = (await response.json()) as JoinableActionsResponse;
        setItems(payload.items);
        setHistoryItems(payload.history ?? []);
        setAuthenticated(payload.authenticated);
      } catch (fetchError) {
        if ((fetchError as { name?: string }).name === "AbortError") {
          return;
        }
        setError(fr ? "Le flux de participation est temporairement indisponible." : "The participation flow is temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    },
    [fr, listUrl],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadActions(controller.signal);
    return () => controller.abort();
  }, [loadActions]);

  const updateActionCounts = useCallback(
    (actionId: string, participantsCount: number | null, pendingRequestsCount: number) => {
      setItems((previous) =>
        previous.map((item) =>
          item.id === actionId
            ? {
                ...item,
                ...(participantsCount === null ? {} : { participantsCount }),
                pendingRequestsCount,
              }
            : item,
        ),
      );
    },
    [],
  );

  async function submitJoin(actionId: string) {
    const currentItem = items.find((item) => item.id === actionId) ?? null;
    setJoiningId(actionId);
    setNotice(null);

    try {
      const response = await fetch("/api/actions/group-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });

      const payload = (await response.json()) as
        | JoinActionResponse
        | { error?: string; details?: Record<string, string[]> };

      if (!response.ok) {
        if (response.status === 401) {
          setNotice(fr ? "Connectez-vous pour rejoindre un formulaire." : "Sign in to join a form.");
          return;
        }

        const message =
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "La jonction a échoué."
              : "Join failed.";
        setNotice(message);
        return;
      }

      const joined = payload as JoinActionResponse;
      const isConfirmed = joined.participationStatus === "confirmed";
      const isPending = joined.participationStatus === "pending";

      setItems((previous) =>
        previous.map((item) =>
          item.id === actionId
            ? {
                ...item,
                joined: isConfirmed,
                awaitingApproval: isPending,
                joinedAt: joined.joinedAt,
                participationStatus: joined.participationStatus,
                participationSource: joined.participationSource,
                participationUpdatedAt: joined.participationUpdatedAt,
                participantsCount: joined.participantsCount,
                pendingRequestsCount: item.pendingRequestsCount + (isPending ? 1 : 0),
              }
            : item,
        ),
      );

      if (currentItem) {
        setHistoryItems((previous) => [
          {
            ...currentItem,
            participantsCount: joined.participantsCount,
            joined: isConfirmed,
            awaitingApproval: isPending,
            joinedAt: joined.joinedAt,
            participationStatus: joined.participationStatus,
            participationSource: joined.participationSource,
            participationUpdatedAt: joined.participationUpdatedAt,
            pendingRequestsCount: currentItem.pendingRequestsCount + (isPending ? 1 : 0),
            groupJoinEnabled: currentItem.groupJoinEnabled,
          },
          ...previous.filter((item) => item.id !== actionId),
        ]);
      }

      setNotice(
        isPending
          ? fr
            ? "Votre demande est visible dans la file publique. Le créateur ou un admin doit l'accepter."
            : "Your request is visible in the public queue. The creator or an admin must approve it."
          : joined.alreadyJoined
            ? fr
              ? "Participation déjà enregistrée. L'historique reste synchronisé et la progression peut être recalculée."
              : "Participation already recorded. Your history stays synced and progression can be recalculated."
            : fr
              ? "Participation enregistrée. Elle alimente l'historique, les badges et le compteur collectif."
              : "Participation saved. It updates history, badges, and the collective counter.",
      );
      onQueueMutation?.(actionId);
    } finally {
      setJoiningId(null);
    }
  }

  async function submitLeave(actionId: string) {
    const currentItem = items.find((item) => item.id === actionId) ?? null;
    setLeavingId(actionId);
    setNotice(null);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/group-join`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as LeaveActionResponse | { error?: string };

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "La participation n'a pas pu être retirée."
              : "The participation could not be removed.";
        setNotice(message);
        return;
      }

      const cancelled = payload as LeaveActionResponse;
      const wasPending = Boolean(currentItem?.awaitingApproval);
      const wasConfirmed = Boolean(currentItem?.joined);
      const nextPendingRequestsCount = Math.max(0, (currentItem?.pendingRequestsCount ?? 0) - (wasPending ? 1 : 0));

      setItems((previous) =>
        previous.map((item) =>
          item.id === actionId
            ? {
                ...item,
                joined: false,
                awaitingApproval: false,
                joinedAt: cancelled.joinedAt,
                participationStatus: cancelled.participationStatus,
                participationSource: cancelled.participationSource,
                participationUpdatedAt: cancelled.participationUpdatedAt,
                participantsCount: cancelled.participantsCount,
                pendingRequestsCount: Math.max(0, item.pendingRequestsCount - (wasPending ? 1 : 0)),
              }
            : item,
        ),
      );

      if (currentItem) {
        setHistoryItems((previous) => [
          {
            ...currentItem,
            joined: false,
            awaitingApproval: false,
            joinedAt: cancelled.joinedAt,
            participationStatus: cancelled.participationStatus,
            participationSource: cancelled.participationSource,
            participationUpdatedAt: cancelled.participationUpdatedAt,
            participantsCount: cancelled.participantsCount,
            pendingRequestsCount: nextPendingRequestsCount,
            groupJoinEnabled: currentItem.groupJoinEnabled,
          },
          ...previous.filter((item) => item.id !== actionId),
        ]);
      }

      setNotice(
        cancelled.alreadyCancelled
          ? fr
            ? "Votre participation était déjà annulée."
            : "Your participation was already cancelled."
          : wasPending
            ? fr
              ? "Votre demande a été annulée."
              : "Your request has been cancelled."
            : wasConfirmed
              ? fr
                ? "Vous avez quitté ce formulaire."
                : "You left this form."
              : fr
                ? "La participation a été retirée."
                : "The participation has been removed.",
      );
      onQueueMutation?.(actionId);
    } finally {
      setLeavingId(null);
    }
  }

  function requestJoin(actionId: string) {
    setNotice(null);
    setPendingLeaveActionId(null);
    setPendingJoinActionId(actionId);
  }

  async function confirmPendingJoin() {
    if (!pendingJoinActionId) return;
    const actionId = pendingJoinActionId;
    setPendingJoinActionId(null);
    await submitJoin(actionId);
  }

  function requestLeave(actionId: string) {
    setNotice(null);
    setPendingJoinActionId(null);
    setPendingLeaveActionId(actionId);
  }

  function closePendingActions() {
    setPendingJoinActionId(null);
    setPendingLeaveActionId(null);
  }

  async function confirmPendingLeave() {
    if (!pendingLeaveActionId) return;
    const actionId = pendingLeaveActionId;
    setPendingLeaveActionId(null);
    await submitLeave(actionId);
  }

  return {
    items,
    loading,
    error,
    joiningId,
    leavingId,
    notice,
    authenticated,
    historyItems,
    pendingJoinActionId,
    pendingLeaveActionId,
    updateActionCounts,
    setNotice,
    requestJoin,
    requestLeave,
    closePendingActions,
    confirmPendingJoin,
    confirmPendingLeave,
    reloadActions: () => void loadActions(),
  };
}
