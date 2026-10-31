import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  fetchCommunityEvents,
  type CommunityEventItem,
  type CommunityEventsResponse,
} from "@/lib/community/http";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { isAppError, toAppError, type AppError } from "@/lib/errors/app-errors";
import type { CommunityEventsPagePhase } from "@/lib/community/events-pagination";

type EventPhase = CommunityEventsPagePhase;

type PhasePaginationState = {
  additionalEvents: CommunityEventItem[];
  continuationCursors: string[];
  nextCursor: string | null;
  error: unknown;
  failedCursor: string | null;
  failedOperation: "continuation" | "reconciliation" | null;
  loadingMore: boolean;
};

const EMPTY_PHASE_STATE: PhasePaginationState = {
  additionalEvents: [],
  continuationCursors: [],
  nextCursor: null,
  error: null,
  failedCursor: null,
  failedOperation: null,
  loadingMore: false,
};

function createPhaseState(): Record<EventPhase, PhasePaginationState> {
  return {
    upcoming: { ...EMPTY_PHASE_STATE },
    past: { ...EMPTY_PHASE_STATE },
  };
}

function mergeEvents(
  existing: CommunityEventItem[],
  incoming: CommunityEventItem[],
): CommunityEventItem[] {
  const byId = new Map(existing.map((event) => [event.id, event]));
  for (const event of incoming) byId.set(event.id, event);
  return [...byId.values()];
}

function responseSignature(response: CommunityEventsResponse | undefined): string | null {
  if (!response) return null;
  return JSON.stringify({ nextCursor: response.nextCursor, items: response.items });
}

function toLoadError(value: unknown): AppError | null {
  if (isAppError(value)) return value;
  if (value instanceof Error) {
    return toAppError(value, {
      kind: "server",
      message: "Chargement agenda communautaire impossible.",
    });
  }
  return null;
}

function compareEvents(left: CommunityEventItem, right: CommunityEventItem, ascending: boolean): number {
  const dateOrder = left.eventDate.localeCompare(right.eventDate);
  if (dateOrder !== 0) return ascending ? dateOrder : -dateOrder;
  const createdOrder = left.createdAt.localeCompare(right.createdAt);
  if (createdOrder !== 0) return -createdOrder;
  return right.id.localeCompare(left.id);
}


function useCommunityEventQueries(enabled: boolean, focusEventId: string | null) {
  const upcoming = useSWR<CommunityEventsResponse, unknown>(
    enabled ? ["section-community-events", "upcoming"] : null,
    () => fetchCommunityEvents({ limit: 120, phase: "upcoming" }),
    swrRecentViewOptions,
  );
  const past = useSWR<CommunityEventsResponse, unknown>(
    enabled ? ["section-community-events", "past"] : null,
    () => fetchCommunityEvents({ limit: 120, phase: "past" }),
    swrRecentViewOptions,
  );
  const focused = useSWR<CommunityEventsResponse, unknown>(
    enabled && focusEventId ? ["section-community-event", focusEventId] : null,
    () => fetchCommunityEvents({ limit: 1, eventId: focusEventId }),
    swrRecentViewOptions,
  );
  return { upcoming, past, focused };
}

function useCommunityEventsPaginationState() {
  const [paginationState, setPaginationState] = useState<Record<EventPhase, PhasePaginationState>>(createPhaseState);
  const paginationRef = useRef(paginationState);
  const generationRef = useRef<Record<EventPhase, number>>({ upcoming: 0, past: 0 });
  const loadingMoreRef = useRef<Record<EventPhase, boolean>>({ upcoming: false, past: false });
  const baseSignaturesRef = useRef<Record<EventPhase, string | null>>({ upcoming: null, past: null });
  const reconciliationBaseRef = useRef<Record<EventPhase, CommunityEventsResponse | undefined>>({
    upcoming: undefined,
    past: undefined,
  });
  const updatePhaseState = useCallback(
    (phase: EventPhase, update: (current: PhasePaginationState) => PhasePaginationState) => {
      setPaginationState((current) => {
        const next = { ...current, [phase]: update(current[phase]) };
        paginationRef.current = next;
        return next;
      });
    },
    [],
  );
  return { paginationState, paginationRef, generationRef, loadingMoreRef, baseSignaturesRef, reconciliationBaseRef, updatePhaseState };
}

type CommunityEventsPaginationState = ReturnType<typeof useCommunityEventsPaginationState>;

function useCommunityEventsReconciliation(params: {
  upcomingData: CommunityEventsResponse | undefined;
  pastData: CommunityEventsResponse | undefined;
  state: CommunityEventsPaginationState;
}) {
  const { upcomingData, pastData, state } = params;
  const { paginationRef, generationRef, loadingMoreRef, baseSignaturesRef, reconciliationBaseRef, updatePhaseState } = state;
  const reconcileContinuationPages = useCallback(
    async (phase: EventPhase, base: CommunityEventsResponse | undefined, generation: number) => {
      if (generationRef.current[phase] !== generation) return;
      const loadedCursors = [...paginationRef.current[phase].continuationCursors];
      let cursor = base?.nextCursor ?? null;
      const refreshedCursors: string[] = [];
      let refreshedEvents: CommunityEventItem[] = [];
      loadingMoreRef.current[phase] = true;
      updatePhaseState(phase, (current) => ({ ...current, error: null, failedCursor: null, failedOperation: null, loadingMore: true }));
      try {
        for (let index = 0; index < loadedCursors.length && cursor; index += 1) {
          const requestCursor = cursor;
          const page = await fetchCommunityEvents({ limit: 120, phase, cursor: requestCursor });
          if (generationRef.current[phase] !== generation) return;
          refreshedCursors.push(requestCursor);
          refreshedEvents = mergeEvents(refreshedEvents, page.items);
          cursor = page.nextCursor;
        }
        if (generationRef.current[phase] !== generation) return;
        loadingMoreRef.current[phase] = false;
        updatePhaseState(phase, (current) => ({ ...current, additionalEvents: refreshedEvents, continuationCursors: refreshedCursors, nextCursor: cursor, error: null, failedCursor: null, failedOperation: null, loadingMore: false }));
      } catch (error) {
        if (generationRef.current[phase] !== generation) return;
        loadingMoreRef.current[phase] = false;
        const retryCursor = cursor ?? loadedCursors[refreshedCursors.length] ?? null;
        updatePhaseState(phase, (current) => ({ ...current, error, failedCursor: retryCursor, failedOperation: "reconciliation", nextCursor: null, loadingMore: false }));
      }
    },
    [generationRef, loadingMoreRef, paginationRef, updatePhaseState],
  );
  const reconcileBase = useCallback(
    (phase: EventPhase, base: CommunityEventsResponse | undefined, force = false) => {
      const signature = responseSignature(base);
      if (!force && baseSignaturesRef.current[phase] === signature) return Promise.resolve();
      baseSignaturesRef.current[phase] = signature;
      reconciliationBaseRef.current[phase] = base;
      const generation = ++generationRef.current[phase];
      return reconcileContinuationPages(phase, base, generation);
    },
    [baseSignaturesRef, generationRef, reconciliationBaseRef, reconcileContinuationPages],
  );
  useEffect(() => {
    if (upcomingData) void reconcileBase("upcoming", upcomingData);
  }, [reconcileBase, upcomingData]);
  useEffect(() => {
    if (pastData) void reconcileBase("past", pastData);
  }, [pastData, reconcileBase]);
  return { reconcileBase, reconcileContinuationPages };
}

type CommunityEventsReconciliation = ReturnType<typeof useCommunityEventsReconciliation>;

function useCommunityEventsPaginationActions(params: {
  enabled: boolean;
  upcomingData: CommunityEventsResponse | undefined;
  pastData: CommunityEventsResponse | undefined;
  reloadUpcoming: ReturnType<typeof useSWR<CommunityEventsResponse, unknown>>["mutate"];
  reloadPast: ReturnType<typeof useSWR<CommunityEventsResponse, unknown>>["mutate"];
  reloadFocusedEvent: ReturnType<typeof useSWR<CommunityEventsResponse, unknown>>["mutate"];
  state: CommunityEventsPaginationState;
  reconciliation: CommunityEventsReconciliation;
}) {
  const { enabled, upcomingData, pastData, reloadUpcoming, reloadPast, reloadFocusedEvent, state, reconciliation } = params;
  const { paginationRef, generationRef, loadingMoreRef, reconciliationBaseRef, updatePhaseState } = state;
  const { reconcileBase } = reconciliation;
  const loadMoreEvents = useCallback(
    async (phase: EventPhase = "upcoming", cursorOverride: string | null = null) => {
      const current = paginationRef.current[phase];
      const requestCursor = cursorOverride ?? current.nextCursor;
      if (!enabled || loadingMoreRef.current[phase] || current.failedOperation === "reconciliation" || !requestCursor) return;
      const generation = ++generationRef.current[phase];
      loadingMoreRef.current[phase] = true;
      updatePhaseState(phase, (currentState) => ({ ...currentState, error: null, failedCursor: null, failedOperation: null, loadingMore: true }));
      try {
        const page = await fetchCommunityEvents({ limit: 120, phase, cursor: requestCursor });
        if (generationRef.current[phase] !== generation) return;
        updatePhaseState(phase, (stateValue) => ({ ...stateValue, additionalEvents: mergeEvents(stateValue.additionalEvents, page.items), continuationCursors: [...stateValue.continuationCursors, requestCursor], nextCursor: page.nextCursor, error: null, failedCursor: null, failedOperation: null }));
      } catch (error) {
        if (generationRef.current[phase] === generation) updatePhaseState(phase, (stateValue) => ({ ...stateValue, error, failedCursor: requestCursor, failedOperation: "continuation", loadingMore: false }));
      } finally {
        if (generationRef.current[phase] === generation) {
          loadingMoreRef.current[phase] = false;
          updatePhaseState(phase, (stateValue) => ({ ...stateValue, loadingMore: false }));
        }
      }
    },
    [enabled, generationRef, loadingMoreRef, paginationRef, updatePhaseState],
  );
  const reloadPhase = useCallback(
    async (phase: EventPhase) => {
      const mutate = phase === "upcoming" ? reloadUpcoming : reloadPast;
      const generation = ++generationRef.current[phase];
      loadingMoreRef.current[phase] = true;
      updatePhaseState(phase, (stateValue) => ({ ...stateValue, error: null, failedCursor: null, loadingMore: true }));
      try {
        const refreshed = await mutate();
        if (generationRef.current[phase] !== generation) return;
        const base = (refreshed as CommunityEventsResponse | undefined) ?? (phase === "upcoming" ? upcomingData : pastData);
        await reconcileBase(phase, base, true);
      } finally {
        if (generationRef.current[phase] === generation) {
          loadingMoreRef.current[phase] = false;
          updatePhaseState(phase, (stateValue) => ({ ...stateValue, loadingMore: false }));
        }
      }
    },
    [generationRef, loadingMoreRef, pastData, reconcileBase, reloadPast, reloadUpcoming, updatePhaseState, upcomingData],
  );
  const reloadAllEvents = useCallback(async () => {
    await Promise.all([reloadPhase("upcoming"), reloadPhase("past"), reloadFocusedEvent()]);
  }, [reloadFocusedEvent, reloadPhase]);
  const retryEvents = useCallback(
    async (phase: EventPhase) => {
      const current = paginationRef.current[phase];
      if (current.failedOperation === "reconciliation") {
        const base = reconciliationBaseRef.current[phase];
        if (base) {
          await reconcileBase(phase, base, true);
          return;
        }
      }
      if (current.failedOperation === "continuation" && current.failedCursor) {
        await loadMoreEvents(phase, current.failedCursor);
        return;
      }
      await reloadPhase(phase);
    },
    [loadMoreEvents, paginationRef, reconcileBase, reconciliationBaseRef, reloadPhase],
  );
  return { loadMoreEvents, reloadAllEvents, retryEvents };
}

export function useCommunityEvents(enabled = true, focusEventId: string | null = null) {
  const queries = useCommunityEventQueries(enabled, focusEventId);
  const { data: upcomingData, error: upcomingError, isLoading: upcomingLoading, isValidating: upcomingValidating, mutate: reloadUpcoming } = queries.upcoming;
  const { data: pastData, error: pastError, isLoading: pastLoading, isValidating: pastValidating, mutate: reloadPast } = queries.past;
  const { data: focusedEventData, error: focusedEventError, isLoading: focusedEventLoading, isValidating: focusedEventValidating, mutate: reloadFocusedEvent } = queries.focused;
  const state = useCommunityEventsPaginationState();
  const reconciliation = useCommunityEventsReconciliation({ upcomingData, pastData, state });
  const actions = useCommunityEventsPaginationActions({ enabled, upcomingData, pastData, reloadUpcoming, reloadPast, reloadFocusedEvent, state, reconciliation });
  const { paginationState } = state;
  const phaseErrors = useMemo(() => ({
    upcoming: toLoadError(upcomingError ?? paginationState.upcoming.error),
    past: toLoadError(pastError ?? paginationState.past.error),
  }), [pastError, paginationState.past.error, paginationState.upcoming.error, upcomingError]);
  const eventsLoadError = toLoadError(upcomingError ?? pastError ?? focusedEventError ?? paginationState.upcoming.error ?? paginationState.past.error);
  const allEvents = useMemo(
    () => mergeEvents(
      mergeEvents(
        mergeEvents(upcomingData?.items ?? [], paginationState.upcoming.additionalEvents),
        mergeEvents(pastData?.items ?? [], paginationState.past.additionalEvents),
      ),
      focusedEventData?.items ?? [],
    ),
    [focusedEventData?.items, paginationState.past.additionalEvents, paginationState.upcoming.additionalEvents, pastData?.items, upcomingData?.items],
  );
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const upcomingEvents = useMemo(() => allEvents.filter((event) => event.eventDate >= todayIso).sort((a, b) => compareEvents(a, b, true)), [allEvents, todayIso]);
  const pastEvents = useMemo(() => allEvents.filter((event) => event.eventDate < todayIso).sort((a, b) => compareEvents(a, b, false)), [allEvents, todayIso]);
  const myEvents = useMemo(() => allEvents.filter((event) => event.myRsvpStatus !== null), [allEvents]);
  return {
    eventsLoading: upcomingLoading || pastLoading || focusedEventLoading,
    eventsLoadingByPhase: { upcoming: upcomingLoading, past: pastLoading },
    eventsValidating: upcomingValidating || pastValidating || focusedEventValidating,
    eventsValidatingByPhase: { upcoming: upcomingValidating, past: pastValidating },
    eventsLoadError,
    eventsLoadErrorByPhase: phaseErrors,
    reloadEvents: actions.reloadAllEvents,
    retryEvents: actions.retryEvents,
    hasMore: Boolean(paginationState.upcoming.nextCursor),
    hasMoreByPhase: { upcoming: Boolean(paginationState.upcoming.nextCursor), past: Boolean(paginationState.past.nextCursor) },
    loadingMore: paginationState.upcoming.loadingMore,
    loadingMoreByPhase: { upcoming: paginationState.upcoming.loadingMore, past: paginationState.past.loadingMore },
    loadMoreEvents: actions.loadMoreEvents,
    allEvents,
    upcomingEvents,
    pastEvents,
    myEvents,
  };
}
