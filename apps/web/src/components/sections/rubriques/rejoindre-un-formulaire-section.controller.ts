"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useJoinFormSectionActions } from "./rejoindre-un-formulaire-section.controller.actions";
import { type JoinableActionSort, type LocationFilter, type PeriodFilter } from "./rejoindre-un-formulaire-section.utils";
import { fetchActions } from "@/lib/actions/http";
import type { ActionListItem } from "@/lib/actions/types";
import { useCommunityEvents } from "./community/use-community-events";
import { useCommunityActions } from "./community/use-community-actions";
import { useJoinFormControllerDerivedState } from "./rejoindre-un-formulaire-section.derived";
import {
  isPastPublicAction,
  isCanonicalActionId,
  resolveJoinActionTab,
  sortPastActions,
  type JoinActionTab,
} from "./rejoindre-une-action.model";
export { resolveJoinFormQueueActionId } from "./rejoindre-un-formulaire-section.derived";

export type { LocationFilter, PeriodFilter } from "./rejoindre-un-formulaire-section.utils";
export { getLocationFilterBucket, isWithinPeriod, sortItemsByStatusRank } from "./rejoindre-un-formulaire-section.utils";
export type StatusFilter = "all" | "open" | "pending" | "closed";

function usePastActions(fr: boolean) {
  const [pastItems, setPastItems] = useState<ActionListItem[]>([]);
  const [pastLoading, setPastLoading] = useState(true);
  const [pastError, setPastError] = useState<string | null>(null);
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
  return { pastItems, pastLoading, pastError };
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
  const [queueReloadAction, setQueueReloadAction] = useState<{ actionId: string; version: number } | null>(null);
  const focusActionId = searchParams.get("actionId")?.trim() || null;
  const requestedCommunityEventId = searchParams.get("communityEventId")?.trim() || null;
  const focusCommunityEventId = isCanonicalActionId(requestedCommunityEventId)
    ? requestedCommunityEventId
    : null;
  const requestedTab: JoinActionTab = resolveJoinActionTab(searchParams.get("tab"));

  const communityEvents = useCommunityEvents(true, focusCommunityEventId);
  const communityActions = useCommunityActions(communityEvents.reloadEvents);

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

  const { pastItems, pastLoading, pastError } = usePastActions(fr);

  const derived = useJoinFormControllerDerivedState({
    fr,
    focusActionId,
    focusCommunityEventId,
    requestedTab,
    search,
    sort,
    statusFilter,
    locationFilter,
    periodFilter,
    actions,
    communityEvents,
    pastItems,
    pastLoading,
    queueReloadAction,
  });

  return {
    fr,
    navigationSearchParams: searchParams.toString(),
    focusActionId,
    focusCommunityEventId,
    targetResolution: derived.targetResolution,
    items: actions.items,
    activeTab: derived.activeTab,
    pastItems,
    visiblePastItems: derived.visiblePastItems,
    pastLoading,
    pastError,
    loading: actions.loading,
    error: actions.error,
    joiningId: actions.joiningId,
    leavingId: actions.leavingId,
    notice: actions.notice,
    authenticated: actions.authenticated,
    historyItems: actions.historyItems,
    queueRequests: derived.queue.queueRequests,
    queueConfirmedParticipants: derived.queue.queueConfirmedParticipants,
    queueLoading: derived.queue.queueLoading,
    queueError: derived.queue.queueError,
    queueCanReview: derived.queue.queueCanReview,
    reviewingQueueId: derived.queue.reviewingQueueId,
    addingQueueParticipantId: derived.queue.addingQueueParticipantId,
    queueSearchQuery: derived.queue.queueSearchQuery,
    queueSearchResults: derived.queue.queueSearchResults,
    queueSearchLoading: derived.queue.queueSearchLoading,
    queueSearchError: derived.queue.queueSearchError,
    search,
    statusFilter,
    locationFilter,
    periodFilter,
    sort,
    pendingJoinActionId: actions.pendingJoinActionId,
    pendingLeaveActionId: actions.pendingLeaveActionId,
    hasItems: derived.hasItems,
    hasVisibleItems: derived.hasVisibleItems,
    preActionVisibleItems: derived.preActionVisibleItems,
    activeParticipationItems: derived.activeParticipationItems,
    activeRegistrationItems: derived.activeRegistrationItems,
    sortedHistoryItems: derived.sortedHistoryItems,
    noResultsMessage: derived.noResultsMessage,
    setSearch,
    setStatusFilter,
    setLocationFilter,
    setPeriodFilter,
    setSort,
    setQueueSearchQuery: derived.queue.setQueueSearchQuery,
    requestJoin: actions.requestJoin,
    requestLeave: actions.requestLeave,
    closePendingActions: actions.closePendingActions,
    confirmPendingJoin: actions.confirmPendingJoin,
    confirmPendingLeave: actions.confirmPendingLeave,
    reviewQueueRequest: derived.queue.reviewQueueRequest,
    addQueueParticipant: derived.queue.addQueueParticipant,
    resetFilters: () => {
      setSearch("");
      setStatusFilter("all");
      setLocationFilter("all");
      setPeriodFilter("all");
      setSort("soonest");
    },
    reloadActions: actions.reloadActions,
    communityUpcomingEvents: derived.visibleCommunityUpcomingEvents,
    communityPastEvents: derived.visibleCommunityPastEvents,
    communityEventsLoading: communityEvents.eventsLoadingByPhase.upcoming,
    communityPastEventsLoading: communityEvents.eventsLoadingByPhase.past,
    communityEventsError: communityEvents.eventsLoadErrorByPhase.upcoming,
    communityPastEventsError: communityEvents.eventsLoadErrorByPhase.past,
    communityEventsRetry: () => communityEvents.retryEvents("upcoming"),
    communityPastEventsRetry: () => communityEvents.retryEvents("past"),
    communityEventsHasMore: communityEvents.hasMoreByPhase.upcoming,
    communityPastEventsHasMore: communityEvents.hasMoreByPhase.past,
    communityEventsLoadingMore: communityEvents.loadingMoreByPhase.upcoming,
    communityPastEventsLoadingMore: communityEvents.loadingMoreByPhase.past,
    communityEventsLoadMore: () => communityEvents.loadMoreEvents("upcoming"),
    communityPastEventsLoadMore: () => communityEvents.loadMoreEvents("past"),
    communityRsvpLoadingEventId: communityActions.rsvpLoadingEventId,
    onCommunityRsvp: communityActions.onRsvp,
    communityMutationError: communityActions.communityError,
    communitySuccessMessage: communityActions.communitySuccessMessage,
    isUpdatingEventOpsId: communityActions.isUpdatingEventOpsId,
    getOpsDraft: communityActions.getOpsDraft,
    updateOpsDraft: communityActions.updateOpsDraft,
    onSaveEventOps: communityActions.onSaveEventOps,
  };
}
