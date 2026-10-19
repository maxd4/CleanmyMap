import * as React from "react";
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
  return useSWRMock.mock.calls.at(-1) as [unknown, (() => Promise<unknown>) | undefined];
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
});
