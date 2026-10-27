"use client";

import { useEffect } from "react";
import type { useJoinFormSectionController } from "./rejoindre-un-formulaire-section.controller";
import { JoinFormExplorerFilters } from "./rejoindre-un-formulaire-section.explorer-filters";
import { JoinFormExplorerContent } from "./rejoindre-un-formulaire-section.explorer.content";

type ControllerState = ReturnType<typeof useJoinFormSectionController>;

export type ExplorerProps = Pick<ControllerState,
  | "fr" | "focusActionId" | "search" | "setSearch" | "locationFilter" | "setLocationFilter"
  | "periodFilter" | "setPeriodFilter" | "statusFilter" | "setStatusFilter"
  | "sort" | "setSort" | "preActionVisibleItems" | "resetFilters"
  | "loading" | "error" | "reloadActions" | "hasItems" | "hasVisibleItems"
  | "authenticated" | "joiningId" | "leavingId"
  | "requestJoin" | "requestLeave" | "noResultsMessage" | "notice"
  | "queueRequests" | "queueConfirmedParticipants" | "queueLoading" | "queueError"
  | "queueCanReview" | "reviewingQueueId" | "addingQueueParticipantId"
  | "queueSearchQuery" | "queueSearchResults" | "queueSearchLoading"
  | "queueSearchError" | "setQueueSearchQuery" | "reviewQueueRequest"
  | "addQueueParticipant"
> & Partial<Pick<ControllerState,
  | "communityUpcomingEvents" | "communityEventsLoading" | "communityEventsError"
  | "communityEventsRetry" | "focusCommunityEventId" | "communityRsvpLoadingEventId"
  | "onCommunityRsvp" | "communityMutationError" | "communitySuccessMessage"
  | "communityEventsHasMore" | "communityEventsLoadingMore" | "communityEventsLoadMore"
>> & {
  onShareAction?: (actionId: string) => void;
};

function useJoinFormExplorerFocus(focusActionId: string | null, loading: boolean, actionCount: number, focusCommunityEventId: string | null, communityEventsLoading: boolean, communityEventCount: number) {
  useEffect(() => {
    if (!focusActionId || loading) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(`join-action-${focusActionId}`);
      if (!(target instanceof HTMLElement)) return;
      target.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      target.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusActionId, loading, actionCount]);

  useEffect(() => {
    if (!focusCommunityEventId || communityEventsLoading) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(`join-community-event-${focusCommunityEventId}`)?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
    return () => window.cancelAnimationFrame(frame);
  }, [communityEventsLoading, communityEventCount, focusCommunityEventId]);
}

export function JoinFormExplorer(props: ExplorerProps) {
  const { fr, focusActionId, loading, preActionVisibleItems, focusCommunityEventId = null, communityEventsLoading = false, communityUpcomingEvents = [] } = props;
  useJoinFormExplorerFocus(focusActionId, loading, preActionVisibleItems.length, focusCommunityEventId, communityEventsLoading, communityUpcomingEvents.length);
  return <div className="space-y-5">
    <JoinFormExplorerFilters fr={fr} hasItems={props.hasItems} search={props.search} setSearch={props.setSearch} locationFilter={props.locationFilter} setLocationFilter={props.setLocationFilter} periodFilter={props.periodFilter} setPeriodFilter={props.setPeriodFilter} statusFilter={props.statusFilter} setStatusFilter={props.setStatusFilter} sort={props.sort} setSort={props.setSort} />
    <JoinFormExplorerContent {...props} />
  </div>;
}
