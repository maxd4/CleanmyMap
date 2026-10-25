import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { fetchCommunityEvents, type CommunityEventsResponse } from "@/lib/community/http";
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

  const allEvents = useMemo(() => eventsData?.items ?? [], [eventsData?.items]);
  const mergedEvents = useMemo(() => {
    const byId = new Map(allEvents.map((event) => [event.id, event]));
    for (const event of focusedEventData?.items ?? []) {
      byId.set(event.id, event);
    }
    return [...byId.values()];
  }, [allEvents, focusedEventData?.items]);
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

  const rawEventsError = eventsError ?? focusedEventError;
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
    allEvents: mergedEvents,
    upcomingEvents,
    pastEvents,
    myEvents,
  };
}
