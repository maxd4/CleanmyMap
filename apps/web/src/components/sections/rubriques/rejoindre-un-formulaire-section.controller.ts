"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useJoinFormSectionActions } from "./rejoindre-un-formulaire-section.controller.actions";
import { useJoinFormSectionQueue } from "./rejoindre-un-formulaire-section.controller.queue";
import { getActionDisplayStatus } from "./rejoindre-un-formulaire-section.status";
import {
  filterAndSortJoinableActions,
  getLocationFilterBucket,
  isWithinPeriod,
  type JoinableActionSort,
  type LocationFilter,
  type PeriodFilter,
} from "./rejoindre-un-formulaire-section.utils";

export type { LocationFilter, PeriodFilter } from "./rejoindre-un-formulaire-section.utils";
export { getLocationFilterBucket, isWithinPeriod, sortItemsByStatusRank } from "./rejoindre-un-formulaire-section.utils";
export type StatusFilter = "all" | "open" | "pending" | "closed";

export function useJoinFormSectionController() {
  const { locale } = useSitePreferences();
  const searchParams = useSearchParams();
  const fr = locale === "fr";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [sort, setSort] = useState<JoinableActionSort>("soonest");
  const [search, setSearch] = useState("");
  const [queueReloadAction, setQueueReloadAction] = useState<{ actionId: string; version: number } | null>(null);
  const focusActionId = searchParams.get("actionId")?.trim() || null;

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "24", historyLimit: "12" });
    if (focusActionId) params.set("actionId", focusActionId);
    return `/api/actions/group-join?${params.toString()}`;
  }, [focusActionId]);

  const actions = useJoinFormSectionActions({
    fr,
    listUrl,
    onQueueMutation: (actionId) =>
      setQueueReloadAction((previous) => ({
        actionId,
        version: (previous?.version ?? 0) + 1,
      })),
  });

  const orderedItems = useMemo(
    () =>
      filterAndSortJoinableActions(actions.items, {
        search,
        joinFilter: "all",
        sort,
        focusActionId,
        locale: fr ? "fr" : "en",
      }),
    [actions.items, focusActionId, fr, search, sort],
  );

  const visibleItems = useMemo(() => {
    const filtered = orderedItems.filter((item) => {
      const displayStatus = getActionDisplayStatus(item);
      if (statusFilter !== "all" && displayStatus !== statusFilter) return false;
      if (locationFilter !== "all" && getLocationFilterBucket(item.location_label) !== locationFilter) return false;
      if (!isWithinPeriod(item.action_date, periodFilter)) return false;
      return true;
    });

    if (!focusActionId) return filtered;
    const focusIndex = filtered.findIndex((item) => item.id === focusActionId);
    if (focusIndex <= 0) return filtered;
    const focusItem = filtered[focusIndex];
    return [focusItem, ...filtered.filter((item) => item.id !== focusActionId)];
  }, [focusActionId, locationFilter, orderedItems, periodFilter, statusFilter]);

  const hasItems = actions.items.length > 0;
  const hasVisibleItems = visibleItems.length > 0;
  const preActionVisibleItems = useMemo(
    () => visibleItems.filter((item) => item.actionPhase === "pre_action"),
    [visibleItems],
  );
  const completedVisibleItems = useMemo(
    () => visibleItems.filter((item) => item.actionPhase !== "pre_action"),
    [visibleItems],
  );
  const activeParticipationItems = useMemo(
    () => actions.historyItems.filter((item) => item.joined),
    [actions.historyItems],
  );
  const sortedHistoryItems = useMemo(
    () =>
      [...actions.historyItems].sort((left, right) => {
        const leftDate = new Date(left.participationUpdatedAt ?? left.joinedAt ?? left.created_at).getTime();
        const rightDate = new Date(right.participationUpdatedAt ?? right.joinedAt ?? right.created_at).getTime();
        return rightDate - leftDate;
      }),
    [actions.historyItems],
  );
  const openActionsCount = useMemo(
    () => preActionVisibleItems.filter((item) => getActionDisplayStatus(item) === "open").length,
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
  const summaryIsCompact = openActionsCount === 0 && pendingRequestsCount === 0 && activeParticipationItems.length === 0;
  const queueActionId = useMemo(
    () => focusActionId ?? visibleItems[0]?.id ?? orderedItems[0]?.id ?? null,
    [focusActionId, orderedItems, visibleItems],
  );

  const queue = useJoinFormSectionQueue({
    fr,
    queueActionId,
    reloadAction: queueReloadAction,
    onActionCountsChanged: actions.updateActionCounts,
    onNotice: actions.setNotice,
  });

  const noResultsMessage = fr
    ? "Aucun pré-formulaire ne correspond à vos filtres."
    : "No pre-form matches your filters.";

  return {
    fr,
    items: actions.items,
    loading: actions.loading,
    error: actions.error,
    joiningId: actions.joiningId,
    leavingId: actions.leavingId,
    notice: actions.notice,
    authenticated: actions.authenticated,
    historyItems: actions.historyItems,
    queueRequests: queue.queueRequests,
    queueConfirmedParticipants: queue.queueConfirmedParticipants,
    queueLoading: queue.queueLoading,
    queueError: queue.queueError,
    queueCanReview: queue.queueCanReview,
    reviewingQueueId: queue.reviewingQueueId,
    addingQueueParticipantId: queue.addingQueueParticipantId,
    queueSearchQuery: queue.queueSearchQuery,
    queueSearchResults: queue.queueSearchResults,
    queueSearchLoading: queue.queueSearchLoading,
    queueSearchError: queue.queueSearchError,
    search,
    statusFilter,
    locationFilter,
    periodFilter,
    sort,
    pendingJoinActionId: actions.pendingJoinActionId,
    pendingLeaveActionId: actions.pendingLeaveActionId,
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
    setQueueSearchQuery: queue.setQueueSearchQuery,
    requestJoin: actions.requestJoin,
    requestLeave: actions.requestLeave,
    closePendingActions: actions.closePendingActions,
    confirmPendingJoin: actions.confirmPendingJoin,
    confirmPendingLeave: actions.confirmPendingLeave,
    reviewQueueRequest: queue.reviewQueueRequest,
    addQueueParticipant: queue.addQueueParticipant,
    resetFilters: () => {
      setSearch("");
      setStatusFilter("all");
      setLocationFilter("all");
      setPeriodFilter("all");
      setSort("soonest");
    },
    reloadActions: actions.reloadActions,
  };
}
