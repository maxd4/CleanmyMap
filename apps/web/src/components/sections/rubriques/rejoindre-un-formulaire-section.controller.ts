"use client";

import { useEffect, useMemo, useState } from "react";
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
import { fetchActions } from "@/lib/actions/http";
import { usesRegistrationStore } from "@/lib/actions/participation/action-phase";
import type { ActionListItem } from "@/lib/actions/types";
import {
  isPastPublicAction,
  isCanonicalActionId,
  prioritizeAction,
  resolveJoinActionTab,
  resolveJoinActionTarget,
  sortPastActions,
  type JoinActionTab,
  type JoinActionTargetResolution,
} from "./rejoindre-une-action.model";

export type { LocationFilter, PeriodFilter } from "./rejoindre-un-formulaire-section.utils";
export { getLocationFilterBucket, isWithinPeriod, sortItemsByStatusRank } from "./rejoindre-un-formulaire-section.utils";
export type StatusFilter = "all" | "open" | "pending" | "closed";

export function resolveJoinFormQueueActionId({
  activeTab,
  focusActionId,
}: {
  activeTab: JoinActionTab;
  focusActionId: string | null;
}): string | null {
  return activeTab === "future" ? focusActionId : null;
}

export function useJoinFormSectionController() {
  const { locale } = useSitePreferences();
  const searchParams = useSearchParams();
  const fr = locale === "fr";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [sort, setSort] = useState<JoinableActionSort>("soonest");
  const [search, setSearch] = useState("");
  const [pastItems, setPastItems] = useState<ActionListItem[]>([]);
  const [pastLoading, setPastLoading] = useState(true);
  const [pastError, setPastError] = useState<string | null>(null);
  const [queueReloadAction, setQueueReloadAction] = useState<{ actionId: string; version: number } | null>(null);
  const focusActionId = searchParams.get("actionId")?.trim() || null;
  const requestedTab: JoinActionTab = resolveJoinActionTab(searchParams.get("tab"));

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "24", historyLimit: "200" });
    if (isCanonicalActionId(focusActionId)) params.set("actionId", focusActionId);
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

  useEffect(() => {
    let active = true;
    void fetchActions({ status: "approved", types: "action", limit: 200 })
      .then((result) => {
        if (!active) return;
        setPastItems(sortPastActions(result.items.filter((item) => isPastPublicAction(item))));
        setPastError(null);
      })
      .catch(() => {
        if (active) setPastError(fr ? "Les actions passées sont temporairement indisponibles." : "Past actions are temporarily unavailable.");
      })
      .finally(() => {
        if (active) setPastLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fr]);

  const targetResolution: JoinActionTargetResolution = useMemo(
    () =>
      resolveJoinActionTarget({
        actionId: focusActionId,
        futureActionIds: actions.items.map((item) => item.id),
        pastActionIds: pastItems.map((item) => item.id),
        futureLoading: actions.loading,
        pastLoading,
      }),
    [actions.items, actions.loading, focusActionId, pastItems, pastLoading],
  );
  const activeTab: JoinActionTab = resolveJoinActionTab(requestedTab, targetResolution);

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
  const visiblePastItems = useMemo(
    () => prioritizeAction(pastItems, focusActionId),
    [focusActionId, pastItems],
  );
  const activeParticipationItems = useMemo(
    () => actions.historyItems.filter((item) => item.joined && !usesRegistrationStore(item.actionPhase)),
    [actions.historyItems],
  );
  const activeRegistrationItems = useMemo(
    () => actions.historyItems.filter((item) => item.joined && usesRegistrationStore(item.actionPhase)),
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
  const queueActionId = useMemo(
    () => resolveJoinFormQueueActionId({ activeTab, focusActionId }),
    [activeTab, focusActionId],
  );

  const queue = useJoinFormSectionQueue({
    fr,
    queueActionId,
    reloadAction: queueReloadAction,
    onActionCountsChanged: actions.updateActionCounts,
    onNotice: actions.setNotice,
  });

  const noResultsMessage = fr
    ? "Aucune action future ne correspond à vos filtres."
    : "No future action matches your filters.";

  return {
    fr,
    navigationSearchParams: searchParams.toString(),
    focusActionId,
    targetResolution,
    items: actions.items,
    activeTab,
    pastItems,
    visiblePastItems,
    pastLoading,
    pastError,
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
    activeParticipationItems,
    activeRegistrationItems,
    sortedHistoryItems,
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
