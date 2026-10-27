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

    expect(key).toEqual(["section-community-events"]);
    await fetcher?.();
    expect(fetchCommunityEventsMock).toHaveBeenCalledWith({ limit: 120 });
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

    expect(key).toEqual(["section-community-events"]);
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

    expect(fetchCommunityEventsMock).toHaveBeenCalledWith({ limit: 120, cursor: "cursor-1" });
    expect(result.allEvents.map((event) => event.id)).toEqual(["event-1", "event-2"]);
    expect(result.hasMore).toBe(false);
    act(() => renderer?.unmount());
  });
});
