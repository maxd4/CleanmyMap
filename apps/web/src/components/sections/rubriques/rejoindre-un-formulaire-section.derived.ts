import { useMemo } from "react";
import { useJoinFormSectionActions } from "./rejoindre-un-formulaire-section.controller.actions";
import { getActionDisplayStatus } from "./rejoindre-un-formulaire-section.status";
import {
  filterAndSortJoinableActions,
  getLocationFilterBucket,
  isWithinPeriod,
  type JoinableActionSort,
  type LocationFilter,
  type PeriodFilter,
} from "./rejoindre-un-formulaire-section.utils";
import type { ActionListItem } from "@/lib/actions/types";
import type { JoinableActionItem } from "@/lib/actions/participation/group-participation";
import { extractEventRefFromNotes } from "@/lib/actions/event-link";
import { usesRegistrationStore } from "@/lib/actions/participation/action-phase";
import type { CommunityEventItem } from "@/lib/community/http";
import type { AppError } from "@/lib/errors/app-errors";
import { prioritizeAction, resolveJoinActionTab, resolveJoinActionTarget, type JoinActionTab } from "./rejoindre-une-action.model";
import { useJoinFormSectionQueue } from "./rejoindre-un-formulaire-section.controller.queue";

type ActionsState = ReturnType<typeof useJoinFormSectionActions>;

type CommunityEventsState = {
  upcomingEvents: CommunityEventItem[];
  pastEvents: CommunityEventItem[];
  eventsLoading: boolean;
  eventsLoadError: AppError | null;
  reloadEvents: () => void;
};

function useVisibleJoinActions(items: JoinableActionItem[], focusActionId: string | null, fr: boolean, search: string, sort: JoinableActionSort, statusFilter: "all" | "open" | "pending" | "closed", locationFilter: LocationFilter, periodFilter: PeriodFilter) {
  const orderedItems = useMemo(() => filterAndSortJoinableActions(items, { search, joinFilter: "all", sort, focusActionId, locale: fr ? "fr" : "en" }), [items, focusActionId, fr, search, sort]);
  const visibleItems = useMemo(() => {
    const filtered = orderedItems.filter((item) => {
      const displayStatus = getActionDisplayStatus(item);
      return (statusFilter === "all" || displayStatus === statusFilter) && (locationFilter === "all" || getLocationFilterBucket(item.location_label) === locationFilter) && isWithinPeriod(item.action_date, periodFilter);
    });
    if (!focusActionId) return filtered;
    const focusIndex = filtered.findIndex((item) => item.id === focusActionId);
    if (focusIndex <= 0) return filtered;
    const focusItem = filtered[focusIndex];
    return focusItem ? [focusItem, ...filtered.filter((item) => item.id !== focusActionId)] : filtered;
  }, [focusActionId, locationFilter, orderedItems, periodFilter, statusFilter]);
  return { visibleItems, preActionVisibleItems: visibleItems.filter((item) => item.actionPhase === "pre_action") };
}

function useVisibleCommunityActions(items: JoinableActionItem[], pastItems: ActionListItem[], upcomingEvents: CommunityEventItem[], pastEvents: CommunityEventItem[], focusCommunityEventId: string | null) {
  const linkedFutureEventIds = useMemo(() => new Set(items.map((item) => item.eventRef).filter((id): id is string => Boolean(id))), [items]);
  const linkedPastEventIds = useMemo(() => new Set(pastItems.map((item) => extractEventRefFromNotes(item.notes ?? item.contract?.metadata.notes)).filter((id): id is string => Boolean(id))), [pastItems]);
  const visibleCommunityUpcomingEvents = useMemo(() => upcomingEvents.filter((event) => !linkedFutureEventIds.has(event.id) || event.id === focusCommunityEventId), [upcomingEvents, focusCommunityEventId, linkedFutureEventIds]);
  const visibleCommunityPastEvents = useMemo(() => pastEvents.filter((event) => !linkedPastEventIds.has(event.id) || event.id === focusCommunityEventId), [pastEvents, focusCommunityEventId, linkedPastEventIds]);
  return { visibleCommunityUpcomingEvents, visibleCommunityPastEvents };
}

function useJoinActionTargetState({ focusActionId, focusCommunityEventId, requestedTab, futureActionIds, pastActionIds, futureLoading, pastLoading }: {
  focusActionId: string | null;
  focusCommunityEventId: string | null;
  requestedTab: JoinActionTab;
  futureActionIds: string[];
  pastActionIds: string[];
  futureLoading: boolean;
  pastLoading: boolean;
}) {
  const targetResolution = useMemo(() => resolveJoinActionTarget({ actionId: focusActionId ?? focusCommunityEventId, futureActionIds, pastActionIds, futureLoading, pastLoading }), [focusActionId, focusCommunityEventId, futureActionIds, futureLoading, pastActionIds, pastLoading]);
  return { targetResolution, activeTab: resolveJoinActionTab(requestedTab, targetResolution) };
}

export function useJoinFormControllerDerivedState({
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
}: {
  fr: boolean;
  focusActionId: string | null;
  focusCommunityEventId: string | null;
  requestedTab: JoinActionTab;
  search: string;
  sort: JoinableActionSort;
  statusFilter: "all" | "open" | "pending" | "closed";
  locationFilter: LocationFilter;
  periodFilter: PeriodFilter;
  actions: ActionsState;
  communityEvents: CommunityEventsState;
  pastItems: ActionListItem[];
  pastLoading: boolean;
  queueReloadAction: { actionId: string; version: number } | null;
}) {
  const { targetResolution, activeTab } = useJoinActionTargetState({
    focusActionId,
    focusCommunityEventId,
    requestedTab,
    futureActionIds: [...actions.items.map((item) => item.id), ...communityEvents.upcomingEvents.map((event) => event.id)],
    pastActionIds: [...pastItems.map((item) => item.id), ...communityEvents.pastEvents.map((event) => event.id)],
    futureLoading: actions.loading || communityEvents.eventsLoading,
    pastLoading: pastLoading || communityEvents.eventsLoading,
  });
  const { visibleItems, preActionVisibleItems } = useVisibleJoinActions(actions.items, focusActionId, fr, search, sort, statusFilter, locationFilter, periodFilter);
  const { visibleCommunityUpcomingEvents, visibleCommunityPastEvents } = useVisibleCommunityActions(actions.items, pastItems, communityEvents.upcomingEvents, communityEvents.pastEvents, focusCommunityEventId);
  const visiblePastItems = useMemo(() => prioritizeAction(pastItems, focusActionId), [focusActionId, pastItems]);
  const activeParticipationItems = useMemo(() => actions.historyItems.filter((item) => item.joined && !usesRegistrationStore(item.actionPhase)), [actions.historyItems]);
  const activeRegistrationItems = useMemo(() => actions.historyItems.filter((item) => item.joined && usesRegistrationStore(item.actionPhase)), [actions.historyItems]);
  const sortedHistoryItems = useMemo(() => [...actions.historyItems].sort((left, right) => new Date(right.participationUpdatedAt ?? right.joinedAt ?? right.created_at).getTime() - new Date(left.participationUpdatedAt ?? left.joinedAt ?? left.created_at).getTime()), [actions.historyItems]);
  const queueActionId = useMemo(() => resolveJoinFormQueueActionId({ activeTab, focusActionId }), [activeTab, focusActionId]);
  const queue = useJoinFormSectionQueue({ fr, queueActionId, reloadAction: queueReloadAction, onActionCountsChanged: actions.updateActionCounts, onNotice: actions.setNotice });
  return {
    activeTab,
    targetResolution,
    visibleItems,
    preActionVisibleItems,
    visiblePastItems,
    visibleCommunityUpcomingEvents,
    visibleCommunityPastEvents,
    activeParticipationItems,
    activeRegistrationItems,
    sortedHistoryItems,
    queue,
    hasItems: actions.items.length > 0,
    hasVisibleItems: visibleItems.length > 0,
    noResultsMessage: fr ? "Aucune action future ne correspond à vos filtres." : "No future action matches your filters.",
  };
}

export function resolveJoinFormQueueActionId({ activeTab, focusActionId }: { activeTab: JoinActionTab; focusActionId: string | null }) {
  return activeTab === "future" ? focusActionId : null;
}
