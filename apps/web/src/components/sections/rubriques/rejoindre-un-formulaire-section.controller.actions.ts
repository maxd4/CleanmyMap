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
  participationSource: "group_form" | "admin" | "admin_override" | "import" | "post_action_claim";
  participationUpdatedAt: string | null;
  participantsCount: number;
};

type LeaveActionResponse = {
  status: "ok";
  actionId: string;
  alreadyCancelled: boolean;
  joinedAt: string;
  participationStatus: "cancelled";
  participationSource: "group_form" | "admin" | "admin_override" | "import" | "post_action_claim";
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
          throw new Error("Impossible de charger les actions futures.");
        }

        const payload = (await response.json()) as JoinableActionsResponse;
        setItems(payload.items);
        setHistoryItems(payload.history ?? []);
        setAuthenticated(payload.authenticated);
      } catch (fetchError) {
        if ((fetchError as { name?: string }).name === "AbortError") {
          return;
        }
        setError(fr ? "Le flux d'inscription est temporairement indisponible." : "The registration flow is temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    },
    [fr, listUrl],
  );

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      await loadActions(controller.signal);
    })();
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
          setNotice(fr ? "Connectez-vous pour rejoindre cette action." : "Sign in to join this action.");
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
            ? "Votre demande d'inscription est visible dans la file publique. Le créateur ou un admin doit l'accepter."
            : "Your registration request is visible in the public queue. The creator or an admin must approve it."
          : joined.alreadyJoined
            ? fr
              ? "Inscription déjà enregistrée. Elle reste distincte de la participation finale."
              : "Registration already recorded. It remains separate from final participation."
            : fr
              ? "Inscription enregistrée. Elle reste prévisionnelle et n'alimente ni les statistiques ni les badges de présence."
              : "Registration saved. It remains provisional and does not update participation statistics or badges.",
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
              ? "L'inscription n'a pas pu être annulée."
              : "The registration could not be cancelled.";
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
            ? "Votre inscription était déjà annulée."
            : "Your registration was already cancelled."
          : wasPending
            ? fr
              ? "Votre demande d'inscription a été annulée."
              : "Your request has been cancelled."
            : wasConfirmed
              ? fr
              ? "Votre inscription a été annulée."
                : "Your registration was cancelled."
              : fr
                ? "L'inscription a été annulée."
                : "The registration has been cancelled.",
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
