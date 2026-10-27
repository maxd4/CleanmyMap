import * as React from "react";
import { act, create } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const useSWRMock = vi.hoisted(() => vi.fn());
const fetchCommunityEventsMock = vi.hoisted(() => vi.fn());

vi.mock("swr", () => ({ default: useSWRMock }));
vi.mock("@/lib/community/http", () => ({
  fetchCommunityEvents: fetchCommunityEventsMock,
}));

import { useCommunityEvents } from "./use-community-events";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function renderEventsHook(enabled: boolean) {
  useSWRMock.mockReturnValue({
    data: undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  });

  function Harness() {
    useCommunityEvents(enabled);
    return null;
  }

  renderToStaticMarkup(React.createElement(Harness));
  return useSWRMock.mock.calls[0] as [unknown, (() => Promise<unknown>) | undefined];
}

function makeEvent(id: string, eventDate: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    eventDate,
    createdAt: `${eventDate}T08:00:00.000Z`,
    myRsvpStatus: null,
    canEditOwnOps: false,
    ...overrides,
  };
}

function configurePhaseData(data: {
  upcoming?: unknown;
  past?: unknown;
}, mutations: {
  upcoming?: ReturnType<typeof vi.fn>;
  past?: ReturnType<typeof vi.fn>;
} = {}) {
  useSWRMock.mockImplementation((key: unknown) => {
    const phase = Array.isArray(key) && key[0] === "section-community-events" ? key[1] : null;
    return {
      data: phase === "upcoming" ? data.upcoming : phase === "past" ? data.past : undefined,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: phase === "upcoming" ? mutations.upcoming ?? vi.fn() : mutations.past ?? vi.fn(),
    };
  });
}

async function flushHookEffects() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("useCommunityEvents inactive-tab contract", () => {
  it("does not expose a SWR key or invoke the event fetcher for partners", async () => {
    useSWRMock.mockClear();
    fetchCommunityEventsMock.mockClear();

    const [key, fetcher] = renderEventsHook(false);

    expect(key).toBeNull();
    expect(fetcher).toBeTypeOf("function");
    expect(fetchCommunityEventsMock).not.toHaveBeenCalled();
  });

  it("keeps the canonical 120-event fetch when community is active", async () => {
    useSWRMock.mockClear();
    fetchCommunityEventsMock.mockResolvedValue({ items: [] });

    const [key, fetcher] = renderEventsHook(true);

    expect(key).toEqual(["section-community-events", "upcoming"]);
    await fetcher?.();
    expect(fetchCommunityEventsMock).toHaveBeenCalledWith({ limit: 120, phase: "upcoming" });
  });

  it("loads a deep-linked event separately so pagination cannot hide it", async () => {
    useSWRMock.mockClear();
    fetchCommunityEventsMock.mockResolvedValue({ items: [] });

    function Harness() {
      useCommunityEvents(true, "event-42");
      return null;
    }

    renderToStaticMarkup(React.createElement(Harness));
    const fetchers = useSWRMock.mock.calls
      .map((call) => call[1])
      .filter((fetcher): fetcher is () => Promise<unknown> => typeof fetcher === "function");
    await Promise.all(fetchers.map((fetcher) => fetcher()));

    expect(fetchCommunityEventsMock).toHaveBeenCalledWith({ limit: 1, eventId: "event-42" });
  });

  it("exposes the continuation owner without changing the focused-event request", () => {
    useSWRMock.mockClear();
    fetchCommunityEventsMock.mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
    });

    const [key] = renderEventsHook(true);

    expect(key).toEqual(["section-community-events", "upcoming"]);
  });

  it("appends a continuation page once and deduplicates an overlapping event", async () => {
    const firstEvent = { id: "event-1", eventDate: "2099-09-10" };
    const secondEvent = { id: "event-2", eventDate: "2099-09-11" };
    const baseResponse = {
      status: "ok" as const,
      count: 1,
      items: [firstEvent],
      hasMore: true,
      nextCursor: "cursor-1",
    };
    useSWRMock.mockImplementation((key: unknown) => ({
      data: Array.isArray(key) ? baseResponse : undefined,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    }));
    fetchCommunityEventsMock.mockResolvedValue({
      status: "ok",
      count: 2,
      items: [firstEvent, secondEvent],
      hasMore: false,
      nextCursor: null,
    });

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() {
      result = useCommunityEvents(true);
      return null;
    }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(React.createElement(Harness));
    });

    await act(async () => {
      await result.loadMoreEvents();
    });

    expect(fetchCommunityEventsMock).toHaveBeenCalledWith({ limit: 120, phase: "upcoming", cursor: "cursor-1" });
    expect(result.allEvents.map((event) => event.id)).toEqual(["event-1", "event-2"]);
    expect(result.hasMore).toBe(false);
    act(() => renderer?.unmount());
  });

  it("keeps future and past windows and continuation cursors independent", async () => {
    const future = makeEvent("future-1", "2099-09-10");
    const past = makeEvent("past-1", "2020-09-10");
    configurePhaseData({
      upcoming: { status: "ok", count: 1, items: [future], hasMore: true, nextCursor: "future-cursor" },
      past: { status: "ok", count: 1, items: [past], hasMore: true, nextCursor: "past-cursor" },
    });
    fetchCommunityEventsMock.mockImplementation(async (params: { phase?: string; cursor?: string }) => ({
      status: "ok",
      count: 1,
      items: [params.phase === "past" ? makeEvent("past-2", "2019-09-10") : makeEvent("future-2", "2099-09-11")],
      hasMore: false,
      nextCursor: null,
    }));

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() {
      result = useCommunityEvents(true);
      return null;
    }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });

    await act(async () => { await result.loadMoreEvents("past"); });
    expect(result.pastEvents.map((event) => event.id)).toEqual(["past-1", "past-2"]);
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["future-1"]);
    expect(result.hasMoreByPhase).toEqual({ upcoming: true, past: false });
    expect(fetchCommunityEventsMock).toHaveBeenCalledWith({ limit: 120, phase: "past", cursor: "past-cursor" });
    act(() => renderer?.unmount());
  });

  it.each([0, 1, 120, 121, 300])("keeps the bounded event window coherent for %s records", (count) => {
    const items = Array.from({ length: count }, (_, index) => makeEvent(`future-${index}`, "2099-09-10", {
      createdAt: `2099-01-01T08:00:00.000Z`,
    }));
    configurePhaseData({
      upcoming: { status: "ok", count: Math.min(count, 120), items: items.slice(0, 120), hasMore: count > 120, nextCursor: count > 120 ? "window-cursor" : null },
      past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null },
    });

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });

    expect(result.upcomingEvents).toHaveLength(Math.min(count, 120));
    expect(result.hasMoreByPhase.upcoming).toBe(count > 120);
    expect(new Set(result.upcomingEvents.map((event) => event.id)).size).toBe(Math.min(count, 120));
    act(() => renderer?.unmount());
  });

  it("retries the exact failed continuation cursor without reloading the first page", async () => {
    const first = makeEvent("future-1", "2099-09-10");
    const second = makeEvent("future-2", "2099-09-11");
    configurePhaseData({
      upcoming: { status: "ok", count: 1, items: [first], hasMore: true, nextCursor: "cursor-failed" },
      past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null },
    });
    fetchCommunityEventsMock.mockClear();
    fetchCommunityEventsMock
      .mockRejectedValueOnce(new Error("continuation unavailable"))
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [second], hasMore: false, nextCursor: null });

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });

    await act(async () => { await result.loadMoreEvents("upcoming"); });
    expect(result.eventsLoadErrorByPhase.upcoming?.message).toContain("continuation unavailable");
    await act(async () => { await result.retryEvents("upcoming"); });
    expect(fetchCommunityEventsMock).toHaveBeenLastCalledWith({ limit: 120, phase: "upcoming", cursor: "cursor-failed" });
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["future-1", "future-2"]);
    expect(result.eventsLoadErrorByPhase.upcoming).toBeNull();
    act(() => renderer?.unmount());
  });

  it("reconciles loaded pages after SWR revalidation, updating personal fields and dropping deleted ids", async () => {
    const first = makeEvent("future-1", "2099-09-10", { myRsvpStatus: null });
    const second = makeEvent("future-2", "2099-09-11", { myRsvpStatus: "yes" });
    const firstUpdated = makeEvent("future-1", "2099-09-10", { myRsvpStatus: "maybe" });
    const secondUpdated = makeEvent("future-2", "2099-09-11", { myRsvpStatus: "no" });
    let upcomingData: unknown = { status: "ok", count: 1, items: [first], hasMore: true, nextCursor: "cursor-1" };
    configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
    fetchCommunityEventsMock.mockResolvedValueOnce({ status: "ok", count: 1, items: [second], hasMore: false, nextCursor: null });

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });
    await act(async () => { await result.loadMoreEvents("upcoming"); });
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["future-1", "future-2"]);

    upcomingData = { status: "ok", count: 1, items: [firstUpdated], hasMore: true, nextCursor: "cursor-new" };
    fetchCommunityEventsMock.mockResolvedValueOnce({ status: "ok", count: 1, items: [secondUpdated], hasMore: false, nextCursor: null });
    await act(async () => {
      configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
      renderer?.update(React.createElement(Harness));
      await flushHookEffects();
    });

    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["future-1", "future-2"]);
    expect(result.upcomingEvents.find((event) => event.id === "future-1")?.myRsvpStatus).toBe("maybe");
    expect(result.upcomingEvents.find((event) => event.id === "future-2")?.myRsvpStatus).toBe("no");
    act(() => renderer?.unmount());
  });

  it("blocks an old continuation while reconciliation establishes the new cursor chain", async () => {
    const first = makeEvent("future-1", "2099-09-10", { myRsvpStatus: null });
    const oldSecond = makeEvent("future-old-2", "2099-09-11", { myRsvpStatus: "yes" });
    const oldThird = makeEvent("future-old-3", "2099-09-12", { canEditOwnOps: true });
    const refreshedFirst = makeEvent("future-1", "2099-09-10", { myRsvpStatus: "maybe" });
    const newSecond = makeEvent("future-new-2", "2099-09-11", { myRsvpStatus: "no" });
    const newThird = makeEvent("future-new-3", "2099-09-12", { canEditOwnOps: false });
    let upcomingData: unknown = { status: "ok", count: 1, items: [first], hasMore: true, nextCursor: "cursor-a-1" };
    configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
    fetchCommunityEventsMock
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [oldSecond], hasMore: true, nextCursor: "cursor-a-2" })
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [oldThird], hasMore: true, nextCursor: "cursor-a-3" });

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });
    await act(async () => { await result.loadMoreEvents("upcoming"); });
    await act(async () => { await result.loadMoreEvents("upcoming"); });
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["future-1", "future-old-2", "future-old-3"]);

    const refreshedFirstPage = deferred<unknown>();
    const refreshedSecondPage = deferred<unknown>();
    upcomingData = { status: "ok", count: 1, items: [refreshedFirst], hasMore: true, nextCursor: "cursor-b-1" };
    fetchCommunityEventsMock
      .mockReturnValueOnce(refreshedFirstPage.promise)
      .mockReturnValueOnce(refreshedSecondPage.promise);
    await act(async () => {
      configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
      renderer?.update(React.createElement(Harness));
      await flushHookEffects();
    });

    expect(result.loadingMoreByPhase.upcoming).toBe(true);
    expect(fetchCommunityEventsMock).toHaveBeenLastCalledWith({ limit: 120, phase: "upcoming", cursor: "cursor-b-1" });
    const callsWhileReconciling = fetchCommunityEventsMock.mock.calls.length;
    await act(async () => { await result.loadMoreEvents("upcoming"); });
    expect(fetchCommunityEventsMock.mock.calls).toHaveLength(callsWhileReconciling);

    refreshedFirstPage.resolve({ status: "ok", count: 1, items: [newSecond], hasMore: true, nextCursor: "cursor-b-2" });
    await act(async () => { await flushHookEffects(); });
    expect(fetchCommunityEventsMock).toHaveBeenLastCalledWith({ limit: 120, phase: "upcoming", cursor: "cursor-b-2" });
    expect(result.loadingMoreByPhase.upcoming).toBe(true);

    refreshedSecondPage.resolve({ status: "ok", count: 1, items: [newThird], hasMore: true, nextCursor: "cursor-b-3" });
    await act(async () => { await flushHookEffects(); });
    expect(result.loadingMoreByPhase.upcoming).toBe(false);
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["future-1", "future-new-2", "future-new-3"]);
    expect(result.upcomingEvents.find((event) => event.id === "future-1")?.myRsvpStatus).toBe("maybe");

    fetchCommunityEventsMock.mockResolvedValueOnce({ status: "ok", count: 1, items: [makeEvent("future-new-4", "2099-09-13")], hasMore: false, nextCursor: null });
    await act(async () => { await result.loadMoreEvents("upcoming"); });
    expect(fetchCommunityEventsMock).toHaveBeenLastCalledWith({ limit: 120, phase: "upcoming", cursor: "cursor-b-3" });
    act(() => renderer?.unmount());
  });

  it("keeps the reconciliation lock when an older continuation finishes late", async () => {
    const first = makeEvent("future-1", "2099-09-10");
    const oldSecond = makeEvent("future-old-2", "2099-09-11", { myRsvpStatus: "yes" });
    const refreshedFirst = makeEvent("future-1", "2099-09-10", { myRsvpStatus: "no" });
    const newSecond = makeEvent("future-new-2", "2099-09-11", { myRsvpStatus: "maybe" });
    let upcomingData: unknown = { status: "ok", count: 1, items: [first], hasMore: true, nextCursor: "cursor-a-1" };
    configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
    fetchCommunityEventsMock.mockResolvedValueOnce({ status: "ok", count: 1, items: [oldSecond], hasMore: true, nextCursor: "cursor-a-2" });

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });
    await act(async () => { await result.loadMoreEvents("upcoming"); });

    const oldContinuation = deferred<unknown>();
    const refreshedContinuation = deferred<unknown>();
    fetchCommunityEventsMock.mockReturnValueOnce(oldContinuation.promise);
    let oldLoadMore!: Promise<void>;
    act(() => { oldLoadMore = result.loadMoreEvents("upcoming"); });
    expect(result.loadingMoreByPhase.upcoming).toBe(true);

    upcomingData = { status: "ok", count: 1, items: [refreshedFirst], hasMore: true, nextCursor: "cursor-b-1" };
    fetchCommunityEventsMock.mockReturnValueOnce(refreshedContinuation.promise);
    await act(async () => {
      configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
      renderer?.update(React.createElement(Harness));
      await flushHookEffects();
    });
    expect(fetchCommunityEventsMock).toHaveBeenLastCalledWith({ limit: 120, phase: "upcoming", cursor: "cursor-b-1" });

    oldContinuation.resolve({ status: "ok", count: 1, items: [makeEvent("stale-old", "2099-09-12")], hasMore: false, nextCursor: null });
    await act(async () => { await oldLoadMore; });
    expect(result.loadingMoreByPhase.upcoming).toBe(true);
    expect(result.upcomingEvents.map((event) => event.id)).not.toContain("stale-old");

    refreshedContinuation.resolve({ status: "ok", count: 1, items: [newSecond], hasMore: false, nextCursor: null });
    await act(async () => { await flushHookEffects(); });
    expect(result.loadingMoreByPhase.upcoming).toBe(false);
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["future-1", "future-new-2"]);
    act(() => renderer?.unmount());
  });

  it("keeps rapid revalidations generation-safe and independent between phases", async () => {
    const firstUpcoming = makeEvent("future-1", "2099-09-10");
    const firstPast = makeEvent("past-1", "2020-09-10");
    const oldUpcoming = makeEvent("future-old", "2099-09-11");
    const oldPast = makeEvent("past-old", "2020-09-11");
    const currentUpcoming = makeEvent("future-current", "2099-09-12");
    const currentPast = makeEvent("past-current", "2020-09-12");
    const base = {
      upcoming: { status: "ok", count: 1, items: [firstUpcoming], hasMore: true, nextCursor: "cursor-a-upcoming" },
      past: { status: "ok", count: 1, items: [firstPast], hasMore: true, nextCursor: "cursor-a-past" },
    };
    configurePhaseData(base);
    fetchCommunityEventsMock
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [oldUpcoming], hasMore: false, nextCursor: null })
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [oldPast], hasMore: false, nextCursor: null });

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });
    await act(async () => { await result.loadMoreEvents("upcoming"); });
    await act(async () => { await result.loadMoreEvents("past"); });

    const bUpcoming = deferred<unknown>();
    const bPast = deferred<unknown>();
    const cUpcoming = deferred<unknown>();
    let upcomingData: unknown = { status: "ok", count: 1, items: [makeEvent("future-b", "2099-09-10")], hasMore: true, nextCursor: "cursor-b-upcoming" };
    const pastData: unknown = { status: "ok", count: 1, items: [makeEvent("past-b", "2020-09-10")], hasMore: true, nextCursor: "cursor-b-past" };
    fetchCommunityEventsMock.mockReturnValueOnce(bUpcoming.promise).mockReturnValueOnce(bPast.promise);
    await act(async () => {
      configurePhaseData({ upcoming: upcomingData, past: pastData });
      renderer?.update(React.createElement(Harness));
      await flushHookEffects();
    });
    expect(result.loadingMoreByPhase).toEqual({ upcoming: true, past: true });

    const callsWhileReconciling = fetchCommunityEventsMock.mock.calls.length;
    await act(async () => {
      await result.loadMoreEvents("upcoming");
      await result.loadMoreEvents("past");
    });
    expect(fetchCommunityEventsMock.mock.calls).toHaveLength(callsWhileReconciling);

    upcomingData = { status: "ok", count: 1, items: [makeEvent("future-c", "2099-09-10")], hasMore: true, nextCursor: "cursor-c-upcoming" };
    fetchCommunityEventsMock.mockReturnValueOnce(cUpcoming.promise);
    await act(async () => {
      configurePhaseData({ upcoming: upcomingData, past: pastData });
      renderer?.update(React.createElement(Harness));
      await flushHookEffects();
    });
    bUpcoming.resolve({ status: "ok", count: 1, items: [makeEvent("stale-b-upcoming", "2099-09-11")], hasMore: false, nextCursor: null });
    await act(async () => { await flushHookEffects(); });
    expect(result.loadingMoreByPhase.upcoming).toBe(true);
    expect(result.upcomingEvents.map((event) => event.id)).not.toContain("stale-b-upcoming");

    bPast.resolve({ status: "ok", count: 1, items: [currentPast], hasMore: false, nextCursor: null });
    await act(async () => { await flushHookEffects(); });
    expect(result.loadingMoreByPhase).toEqual({ upcoming: true, past: false });
    cUpcoming.resolve({ status: "ok", count: 1, items: [currentUpcoming], hasMore: false, nextCursor: null });
    await act(async () => { await flushHookEffects(); });
    expect(result.loadingMoreByPhase).toEqual({ upcoming: false, past: false });
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["future-c", "future-current"]);
    expect(result.pastEvents.map((event) => event.id)).toEqual(["past-current", "past-b"]);
    act(() => renderer?.unmount());
  });

  it("retries a failed reconciliation from the refreshed base when the previous chain is exhausted", async () => {
    const first = makeEvent("future-1", "2099-09-10");
    const firstUpdated = makeEvent("future-1", "2099-09-10", { myRsvpStatus: "maybe" });
    const oldSecond = makeEvent("future-old-2", "2099-09-11");
    const oldThird = makeEvent("future-old-3", "2099-09-12");
    const newSecond = makeEvent("future-new-2", "2099-09-11");
    const newThird = makeEvent("future-new-3", "2099-09-12");
    let upcomingData: unknown = { status: "ok", count: 1, items: [first], hasMore: true, nextCursor: "cursor-old-1" };
    configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
    fetchCommunityEventsMock
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [oldSecond], hasMore: true, nextCursor: "cursor-old-2" })
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [oldThird], hasMore: false, nextCursor: null });

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });
    await act(async () => { await result.loadMoreEvents("upcoming"); });
    await act(async () => { await result.loadMoreEvents("upcoming"); });
    expect(result.hasMoreByPhase.upcoming).toBe(false);

    const reconciliationError = new Error("new continuation unavailable");
    upcomingData = { status: "ok", count: 1, items: [firstUpdated], hasMore: true, nextCursor: "cursor-new-1" };
    fetchCommunityEventsMock.mockRejectedValueOnce(reconciliationError);
    await act(async () => {
      configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
      renderer?.update(React.createElement(Harness));
      await flushHookEffects();
    });

    expect(result.eventsLoadErrorByPhase.upcoming?.message).toContain("new continuation unavailable");
    expect(fetchCommunityEventsMock).toHaveBeenLastCalledWith({ limit: 120, phase: "upcoming", cursor: "cursor-new-1" });

    fetchCommunityEventsMock
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [newSecond], hasMore: true, nextCursor: "cursor-new-2" })
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [newThird], hasMore: false, nextCursor: null });
    await act(async () => { await result.retryEvents("upcoming"); });

    expect(fetchCommunityEventsMock.mock.calls.slice(-3)).toEqual([
      [{ limit: 120, phase: "upcoming", cursor: "cursor-new-1" }],
      [{ limit: 120, phase: "upcoming", cursor: "cursor-new-1" }],
      [{ limit: 120, phase: "upcoming", cursor: "cursor-new-2" }],
    ]);
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["future-1", "future-new-2", "future-new-3"]);
    expect(result.eventsLoadErrorByPhase.upcoming).toBeNull();
    act(() => renderer?.unmount());
  });

  it("restarts the refreshed cursor chain after a later reconciliation page fails", async () => {
    const first = makeEvent("future-1", "2099-09-10");
    const oldSecond = makeEvent("future-old-2", "2099-09-11");
    const oldThird = makeEvent("future-old-3", "2099-09-12");
    const newSecond = makeEvent("future-new-2", "2099-09-11");
    const newThird = makeEvent("future-new-3", "2099-09-12");
    let upcomingData: unknown = { status: "ok", count: 1, items: [first], hasMore: true, nextCursor: "cursor-old-1" };
    configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
    fetchCommunityEventsMock
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [oldSecond], hasMore: true, nextCursor: "cursor-old-2" })
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [oldThird], hasMore: false, nextCursor: null });

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });
    await act(async () => { await result.loadMoreEvents("upcoming"); });
    await act(async () => { await result.loadMoreEvents("upcoming"); });

    upcomingData = { status: "ok", count: 1, items: [first], hasMore: true, nextCursor: "cursor-new-1" };
    fetchCommunityEventsMock
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [newSecond], hasMore: true, nextCursor: "cursor-new-2" })
      .mockRejectedValueOnce(new Error("second refreshed continuation unavailable"));
    await act(async () => {
      configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
      renderer?.update(React.createElement(Harness));
      await flushHookEffects();
    });

    expect(result.eventsLoadErrorByPhase.upcoming?.message).toContain("second refreshed continuation unavailable");
    expect(fetchCommunityEventsMock.mock.calls.slice(-2)).toEqual([
      [{ limit: 120, phase: "upcoming", cursor: "cursor-new-1" }],
      [{ limit: 120, phase: "upcoming", cursor: "cursor-new-2" }],
    ]);

    fetchCommunityEventsMock
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [newSecond], hasMore: true, nextCursor: "cursor-new-2" })
      .mockResolvedValueOnce({ status: "ok", count: 1, items: [newThird], hasMore: false, nextCursor: null });
    await act(async () => { await result.retryEvents("upcoming"); });

    expect(fetchCommunityEventsMock.mock.calls.slice(-4)).toEqual([
      [{ limit: 120, phase: "upcoming", cursor: "cursor-new-1" }],
      [{ limit: 120, phase: "upcoming", cursor: "cursor-new-2" }],
      [{ limit: 120, phase: "upcoming", cursor: "cursor-new-1" }],
      [{ limit: 120, phase: "upcoming", cursor: "cursor-new-2" }],
    ]);
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["future-1", "future-new-2", "future-new-3"]);
    expect(result.eventsLoadErrorByPhase.upcoming).toBeNull();
    act(() => renderer?.unmount());
  });

  it("ignores a late continuation response after a newer base revalidation", async () => {
    const first = makeEvent("future-1", "2099-09-10");
    const replacement = makeEvent("future-new", "2099-09-09");
    let resolveOld!: (value: unknown) => void;
    const oldPage = new Promise((resolve) => { resolveOld = resolve; });
    let upcomingData: unknown = { status: "ok", count: 1, items: [first], hasMore: true, nextCursor: "cursor-old" };
    configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
    fetchCommunityEventsMock.mockReturnValueOnce(oldPage);

    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });
    let loadMore!: Promise<void>;
    act(() => { loadMore = result.loadMoreEvents("upcoming"); });

    upcomingData = { status: "ok", count: 1, items: [replacement], hasMore: false, nextCursor: null };
    await act(async () => {
      configurePhaseData({ upcoming: upcomingData, past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null } });
      renderer?.update(React.createElement(Harness));
      await flushHookEffects();
    });
    resolveOld({ status: "ok", count: 1, items: [makeEvent("stale", "2099-09-12")], hasMore: false, nextCursor: null });
    await act(async () => { await loadMore; });

    expect(result.allEvents.map((event) => event.id)).toEqual(["future-new"]);
    act(() => renderer?.unmount());
  });

  it("matches the server keyset order for equal dates and separates personal state by id", async () => {
    const upcomingCreatedLater = makeEvent("upcoming-c", "2099-09-10", { createdAt: "2099-01-01T09:00:00.000Z" });
    const upcomingTieB = makeEvent("upcoming-b", "2099-09-10", { createdAt: "2099-01-01T08:00:00.000Z", myRsvpStatus: "yes" });
    const upcomingTieA = makeEvent("upcoming-a", "2099-09-10", { createdAt: "2099-01-01T08:00:00.000Z" });
    const pastCreatedLater = makeEvent("past-c", "2020-09-10", { createdAt: "2020-01-01T09:00:00.000Z", myRsvpStatus: "maybe" });
    const pastTieB = makeEvent("past-b", "2020-09-10", { createdAt: "2020-01-01T08:00:00.000Z" });
    const pastTieA = makeEvent("past-a", "2020-09-10", { createdAt: "2020-01-01T08:00:00.000Z" });
    configurePhaseData({
      upcoming: { status: "ok", count: 3, items: [upcomingTieA, upcomingCreatedLater, upcomingTieB], hasMore: false, nextCursor: null },
      past: { status: "ok", count: 3, items: [pastTieA, pastCreatedLater, pastTieB], hasMore: false, nextCursor: null },
    });
    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["upcoming-c", "upcoming-b", "upcoming-a"]);
    expect(result.pastEvents.map((event) => event.id)).toEqual(["past-c", "past-b", "past-a"]);
    expect(result.myEvents.map((event) => event.id)).toEqual(["upcoming-b", "past-c"]);
    act(() => renderer?.unmount());
  });
});
