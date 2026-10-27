import { useCallback, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { fetchCommunityEvents, type CommunityEventItem, type CommunityEventsResponse } from "@/lib/community/http";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { isAppError, toAppError } from "@/lib/errors/app-errors";

export function useCommunityEvents(enabled = true, focusEventId: string | null = null) {
  const {
    data: eventsData,
    error: eventsError,
    isLoading: eventsLoading,
    isValidating: eventsValidating,
    mutate: reloadEvents,
  } = useSWR<CommunityEventsResponse, unknown>(
    enabled ? ["section-community-events"] : null,
    () => fetchCommunityEvents({ limit: 120 }),
    swrRecentViewOptions,
  );
  const [paginationState, setPaginationState] = useState<{
    base: CommunityEventsResponse | null;
    additionalEvents: CommunityEventItem[];
    nextCursor: string | null;
    error: unknown;
  }>({ base: null, additionalEvents: [], nextCursor: null, error: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreSequenceRef = useRef(0);

  const activePagination = useMemo(
    () => paginationState.base === (eventsData ?? null)
      ? paginationState
      : {
          base: eventsData ?? null,
          additionalEvents: [],
          nextCursor: eventsData?.nextCursor ?? null,
          error: null,
        },
    [eventsData, paginationState],
  );

  const loadMoreEvents = useCallback(async () => {
    if (!enabled || loadingMore || !activePagination.nextCursor) return;
    const requestSequence = ++loadMoreSequenceRef.current;
    setLoadingMore(true);
    setPaginationState((current) => ({
      ...activePagination,
      error: current.base === activePagination.base ? null : activePagination.error,
    }));
    try {
      const page = await fetchCommunityEvents({ limit: 120, cursor: activePagination.nextCursor });
      if (loadMoreSequenceRef.current !== requestSequence) return;
      setPaginationState((current) => {
        const byId = new Map(current.additionalEvents.map((event) => [event.id, event]));
        for (const event of page.items) byId.set(event.id, event);
        return {
          base: activePagination.base,
          additionalEvents: [...byId.values()],
          nextCursor: page.nextCursor,
          error: null,
        };
      });
    } catch (error) {
      if (loadMoreSequenceRef.current === requestSequence) {
        setPaginationState((current) => ({ ...current, error }));
      }
    } finally {
      if (loadMoreSequenceRef.current === requestSequence) setLoadingMore(false);
    }
  }, [activePagination, enabled, loadingMore]);
  const {
    data: focusedEventData,
    error: focusedEventError,
    isLoading: focusedEventLoading,
    isValidating: focusedEventValidating,
    mutate: reloadFocusedEvent,
  } = useSWR<CommunityEventsResponse, unknown>(
    enabled && focusEventId ? ["section-community-event", focusEventId] : null,
    () => fetchCommunityEvents({ limit: 1, eventId: focusEventId }),
    swrRecentViewOptions,
  );

  const allEvents = useMemo(() => {
    const byId = new Map<string, CommunityEventItem>();
    for (const event of [...(eventsData?.items ?? []), ...activePagination.additionalEvents]) {
      byId.set(event.id, event);
    }
    for (const event of focusedEventData?.items ?? []) byId.set(event.id, event);
    return [...byId.values()];
  }, [activePagination.additionalEvents, eventsData?.items, focusedEventData?.items]);
  const mergedEvents = allEvents;
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const upcomingEvents = useMemo(
    () =>
      mergedEvents
        .filter((event) => event.eventDate >= todayIso)
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [mergedEvents, todayIso],
  );
  const pastEvents = useMemo(
    () =>
      mergedEvents
        .filter((event) => event.eventDate < todayIso)
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    [mergedEvents, todayIso],
  );
  const myEvents = useMemo(
    () => mergedEvents.filter((event) => event.myRsvpStatus !== null),
    [mergedEvents],
  );

  const rawEventsError = eventsError ?? focusedEventError ?? activePagination.error;
  const eventsLoadError = isAppError(rawEventsError)
    ? rawEventsError
    : rawEventsError instanceof Error
      ? toAppError(rawEventsError, {
          kind: "server",
          message: "Chargement agenda communautaire impossible.",
        })
      : null;
  const reloadAllEvents = useCallback(async () => {
    await Promise.all([
      reloadEvents(),
      reloadFocusedEvent(),
    ]);
  }, [reloadEvents, reloadFocusedEvent]);

  return {
    eventsLoading: eventsLoading || focusedEventLoading,
    eventsValidating: eventsValidating || focusedEventValidating,
    eventsLoadError,
    reloadEvents: reloadAllEvents,
    hasMore: Boolean(activePagination.nextCursor),
    loadingMore,
    loadMoreEvents,
    allEvents: mergedEvents,
    upcomingEvents,
    pastEvents,
    myEvents,
  };
}
