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

  it("keeps a deterministic order for equal dates and separates personal state by id", async () => {
    const first = makeEvent("b", "2099-09-10", { createdAt: "2099-01-01T08:00:00.000Z", myRsvpStatus: "yes" });
    const second = makeEvent("a", "2099-09-10", { createdAt: "2099-01-01T08:00:00.000Z", myRsvpStatus: null });
    configurePhaseData({
      upcoming: { status: "ok", count: 2, items: [first, second], hasMore: false, nextCursor: null },
      past: { status: "ok", count: 0, items: [], hasMore: false, nextCursor: null },
    });
    let result!: ReturnType<typeof useCommunityEvents>;
    function Harness() { result = useCommunityEvents(true); return null; }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => { renderer = create(React.createElement(Harness)); });
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["a", "b"]);
    expect(result.myEvents.map((event) => event.id)).toEqual(["b"]);
    act(() => renderer?.unmount());
  });
});
