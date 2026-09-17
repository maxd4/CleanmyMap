import { useMemo } from "react";
import useSWR from "swr";
import { fetchCommunityEvents } from "@/lib/community/http";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { isAppError, toAppError } from "@/lib/errors/app-errors";

export function useCommunityEvents() {
  const {
    data: eventsData,
    error: eventsError,
    isLoading: eventsLoading,
    isValidating: eventsValidating,
    mutate: reloadEvents,
  } = useSWR(
    ["section-community-events"],
    () => fetchCommunityEvents({ limit: 120 }),
    swrRecentViewOptions,
  );

  const allEvents = useMemo(() => eventsData?.items ?? [], [eventsData?.items]);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const upcomingEvents = useMemo(
    () =>
      allEvents
        .filter((event) => event.eventDate >= todayIso)
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [allEvents, todayIso],
  );
  const pastEvents = useMemo(
    () =>
      allEvents
        .filter((event) => event.eventDate < todayIso)
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    [allEvents, todayIso],
  );
  const myEvents = useMemo(
    () => allEvents.filter((event) => event.myRsvpStatus !== null),
    [allEvents],
  );

  const eventsLoadError = isAppError(eventsError)
    ? eventsError
    : eventsError instanceof Error
      ? toAppError(eventsError, {
          kind: "server",
          message: "Chargement agenda communautaire impossible.",
        })
      : null;

  return {
    eventsLoading,
    eventsValidating,
    eventsLoadError,
    reloadEvents,
    allEvents,
    upcomingEvents,
    pastEvents,
    myEvents,
  };
}
