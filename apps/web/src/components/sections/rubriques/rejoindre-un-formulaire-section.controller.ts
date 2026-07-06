"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ActionParticipationReviewItem,
  ActionParticipationSearchItem,
  JoinableActionHistoryItem,
  JoinableActionItem,
} from "@/lib/actions/group-participation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { filterAndSortJoinableActions, type JoinableActionSort } from "./rejoindre-un-formulaire-section.utils";
import { getActionDisplayStatus } from "./rejoindre-un-formulaire-section.shared";

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
  participationSource: "group_form" | "admin" | "import";
  participationUpdatedAt: string | null;
  participantsCount: number;
};

type LeaveActionResponse = {
  status: "ok";
  actionId: string;
  alreadyCancelled: boolean;
  joinedAt: string;
  participationStatus: "cancelled";
  participationSource: "group_form" | "admin" | "import";
  participationUpdatedAt: string | null;
  participantsCount: number;
};

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

export type StatusFilter = "all" | "open" | "pending" | "closed";
export type LocationFilter = "all" | "ile-de-france" | "autres";
export type PeriodFilter = "all" | "seven-days" | "thirty-days" | "ninety-days";

export function getLocationFilterBucket(label: string): LocationFilter {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    normalized.includes("paris") ||
    normalized.includes("meudon") ||
    normalized.includes("belleville") ||
    normalized.includes("seine") ||
    normalized.includes("ile-de-france")
  ) {
    return "ile-de-france";
  }

  return "autres";
}

export function isWithinPeriod(actionDate: string, period: PeriodFilter): boolean {
  if (period === "all") {
    return true;
  }

  const parsedActionDate = new Date(`${actionDate}T12:00:00Z`);
  if (Number.isNaN(parsedActionDate.getTime())) {
    return true;
  }

  const now = new Date();
  const diffInDays = (parsedActionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  switch (period) {
    case "seven-days":
      return diffInDays <= 7;
    case "thirty-days":
      return diffInDays <= 30;
    case "ninety-days":
      return diffInDays <= 90;
    default:
      return true;
  }
}

export function sortItemsByStatusRank(items: JoinableActionItem[]): JoinableActionItem[] {
  return [...items].sort((left, right) => {
    const leftRank = getActionDisplayStatus(left) === "open"
      ? 0
      : getActionDisplayStatus(left) === "pending"
        ? 1
        : getActionDisplayStatus(left) === "confirmed"
          ? 2
          : 3;
    const rightRank = getActionDisplayStatus(right) === "open"
      ? 0
      : getActionDisplayStatus(right) === "pending"
        ? 1
        : getActionDisplayStatus(right) === "confirmed"
          ? 2
          : 3;
    return leftRank - rightRank;
  });
}

export function useJoinFormSectionController() {
  const { locale } = useSitePreferences();
  const searchParams = useSearchParams();
  const fr = locale === "fr";
  const [items, setItems] = useState<JoinableActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [historyItems, setHistoryItems] = useState<JoinableActionHistoryItem[]>([]);
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [sort, setSort] = useState<JoinableActionSort>("soonest");
  const [pendingJoinActionId, setPendingJoinActionId] = useState<string | null>(null);
  const [pendingLeaveActionId, setPendingLeaveActionId] = useState<string | null>(null);
  const focusActionId = searchParams.get("actionId")?.trim() || null;

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "24", historyLimit: "12" });
    if (focusActionId) {
      params.set("actionId", focusActionId);
    }
    return `/api/actions/group-join?${params.toString()}`;
  }, [focusActionId]);

  const loadActions = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(listUrl, {
          signal,
        });

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

  const orderedItems = useMemo(
    () =>
      filterAndSortJoinableActions(items, {
        search,
        joinFilter: "all",
        sort,
        focusActionId,
        locale: fr ? "fr" : "en",
      }),
    [focusActionId, fr, items, search, sort],
  );

  const visibleItems = useMemo(() => {
    const filtered = orderedItems.filter((item) => {
      const displayStatus = getActionDisplayStatus(item);
      if (statusFilter !== "all" && displayStatus !== statusFilter) {
        return false;
      }

      if (locationFilter !== "all" && getLocationFilterBucket(item.location_label) !== locationFilter) {
        return false;
      }

      if (!isWithinPeriod(item.action_date, periodFilter)) {
        return false;
      }

      return true;
    });

    return focusActionId
      ? (() => {
          const focusIndex = filtered.findIndex((item) => item.id === focusActionId);
          if (focusIndex <= 0) {
            return filtered;
          }
          const focusItem = filtered[focusIndex];
          const withoutFocus = filtered.filter((item) => item.id !== focusActionId);
          return [focusItem, ...withoutFocus];
        })()
      : filtered;
  }, [focusActionId, locationFilter, orderedItems, periodFilter, statusFilter]);

  const hasItems = items.length > 0;
  const hasVisibleItems = visibleItems.length > 0;
  const preActionVisibleItems = useMemo(
    () => visibleItems.filter((item) => item.actionPhase === "pre_action"),
    [visibleItems],
  );
  const completedVisibleItems = useMemo(
    () =>
      visibleItems.filter(
        (item) => item.actionPhase !== "pre_action",
      ),
    [visibleItems],
  );
  const activeParticipationItems = useMemo(() => historyItems.filter((item) => item.joined), [historyItems]);
  const sortedHistoryItems = useMemo(
    () =>
      [...historyItems].sort((left, right) => {
        const leftDate = new Date(left.participationUpdatedAt ?? left.joinedAt ?? left.created_at).getTime();
        const rightDate = new Date(right.participationUpdatedAt ?? right.joinedAt ?? right.created_at).getTime();
        return rightDate - leftDate;
      }),
    [historyItems],
  );

  const openActionsCount = useMemo(
    () =>
      preActionVisibleItems.filter((item) => getActionDisplayStatus(item) === "open").length,
    [preActionVisibleItems],
  );
  const volunteersExpectedCount = useMemo(
    () => preActionVisibleItems.reduce((total, item) => total + Math.max(0, item.volunteers_count), 0),
    [preActionVisibleItems],
  );
  const pendingRequestsCount = useMemo(
    () => preActionVisibleItems.reduce((total, item) => total + item.pendingRequestsCount, 0),
    [preActionVisibleItems],
  );
  const summaryIsCompact =
    openActionsCount === 0 &&
    pendingRequestsCount === 0 &&
    activeParticipationItems.length === 0;

  const queueActionId = useMemo(
    () => focusActionId ?? visibleItems[0]?.id ?? orderedItems[0]?.id ?? null,
    [focusActionId, orderedItems, visibleItems],
  );
  const reloadActions = useCallback(() => {
    void loadActions();
  }, [loadActions]);
  const loadQueue = useCallback(
    async (actionId: string, signal?: AbortSignal) => {
      setQueueLoading(true);
      setQueueError(null);

      try {
        const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/group-join`, {
          signal,
        });
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

      fetch(
        `/api/actions/${encodeURIComponent(queueActionId)}/group-join?q=${encodeURIComponent(query)}&limit=8`,
        {
          signal: controller.signal,
        },
      )
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
          if ((error as { name?: string }).name === "AbortError") {
            return;
          }
          setQueueSearchResults([]);
          setQueueSearchError(fr ? "La recherche de comptes a échoué." : "Account search failed.");
        })
        .finally(() => {
          setQueueSearchLoading(false);
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [fr, queueActionId, queueCanReview, queueSearchQuery]);

  async function submitJoin(actionId: string) {
    const currentItem = items.find((item) => item.id === actionId) ?? null;
    setJoiningId(actionId);
    setNotice(null);

    try {
      const response = await fetch("/api/actions/group-join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      if (queueActionId === actionId) {
        await loadQueue(actionId);
      }
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

      if (queueActionId === actionId) {
        await loadQueue(actionId);
      }
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
    if (!pendingJoinActionId) {
      return;
    }

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
    if (!pendingLeaveActionId) {
      return;
    }

    const actionId = pendingLeaveActionId;
    setPendingLeaveActionId(null);
    await submitLeave(actionId);
  }

  async function reviewQueueRequest(requestId: string, decision: "accept" | "reject") {
    if (!queueActionId || !queueCanReview) {
      return;
    }

    setReviewingQueueId(requestId);
    setQueueError(null);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: requestId,
          decision,
        }),
      });

      const payload = (await response.json()) as
        | {
            status: "ok";
            participantId: string;
            participationStatus: "pending" | "confirmed" | "cancelled";
            participationSource: "group_form" | "admin" | "import";
            participantsCount: number;
          }
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

      const refreshedQueue = queueActionId ? await loadQueue(queueActionId) : null;
      const refreshedPendingCount = refreshedQueue?.pendingRequests.length ?? 0;

      setItems((previous) =>
        previous.map((item) =>
          item.id === queueActionId
            ? {
                ...item,
                participantsCount:
                  typeof payload === "object" && payload && "participantsCount" in payload
                    ? payload.participantsCount
                    : item.participantsCount,
                pendingRequestsCount: refreshedPendingCount,
              }
            : item,
        ),
      );

      setNotice(decision === "accept" ? (fr ? "Demande acceptée." : "Request approved.") : fr ? "Demande refusée." : "Request rejected.");
    } finally {
      setReviewingQueueId(null);
    }
  }

  async function addQueueParticipant(userId: string) {
    if (!queueActionId || !queueCanReview) {
      return;
    }

    setAddingQueueParticipantId(userId);
    setQueueError(null);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantUserId: userId,
        }),
      });

      const payload = (await response.json()) as
        | {
            status: "ok";
            participantId: string;
            participantUserId: string;
            participationStatus: "pending" | "confirmed" | "cancelled";
            participationSource: "group_form" | "admin" | "import";
            participantsCount: number;
          }
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

      const refreshedQueue = queueActionId ? await loadQueue(queueActionId) : null;
      const refreshedPendingCount = refreshedQueue?.pendingRequests.length ?? 0;

      setItems((previous) =>
        previous.map((item) =>
          item.id === queueActionId
            ? {
                ...item,
                participantsCount:
                  typeof payload === "object" && payload && "participantsCount" in payload
                    ? payload.participantsCount
                    : item.participantsCount,
                pendingRequestsCount: refreshedPendingCount,
              }
            : item,
        ),
      );

      setNotice(fr ? "Le compte a été ajouté à l'action." : "The account has been added to the action.");
    } finally {
      setAddingQueueParticipantId(null);
    }
  }

  const noResultsMessage = fr
    ? "Aucun pré-formulaire ne correspond à vos filtres."
    : "No pre-form matches your filters.";

  return {
    fr,
    items,
    loading,
    error,
    joiningId,
    leavingId,
    notice,
    authenticated,
    historyItems,
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
    search,
    statusFilter,
    locationFilter,
    periodFilter,
    sort,
    pendingJoinActionId,
    pendingLeaveActionId,
    hasItems,
    hasVisibleItems,
    preActionVisibleItems,
    completedVisibleItems,
    activeParticipationItems,
    sortedHistoryItems,
    openActionsCount,
    volunteersExpectedCount,
    pendingRequestsCount,
    summaryIsCompact,
    noResultsMessage,
    setSearch,
    setStatusFilter,
    setLocationFilter,
    setPeriodFilter,
    setSort,
    setQueueSearchQuery,
    requestJoin,
    requestLeave,
    closePendingActions,
    confirmPendingJoin,
    confirmPendingLeave,
    reviewQueueRequest,
    addQueueParticipant,
    resetFilters: () => {
      setSearch("");
      setStatusFilter("all");
      setLocationFilter("all");
      setPeriodFilter("all");
      setSort("soonest");
    },
    reloadActions,
  };
}
