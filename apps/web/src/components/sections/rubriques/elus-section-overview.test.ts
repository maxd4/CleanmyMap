import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useSWR: vi.fn(),
}));

vi.mock("swr", () => ({
  default: mocks.useSWR,
}));

import { fetchPilotageOverview, useElusOverview } from "./elus-section-overview";

beforeEach(() => {
  mocks.useSWR.mockReturnValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ElusSection overview loader", () => {
  it("suspends periodic refresh while the methodology tab is active", () => {
    useElusOverview("methods");

    expect(mocks.useSWR).toHaveBeenCalledWith(
      "/api/pilotage/overview",
      fetchPilotageOverview,
      expect.objectContaining({
        refreshInterval: 0,
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        keepPreviousData: true,
      }),
    );
  });

  it("keeps the institutional refresh cadence on data tabs", () => {
    useElusOverview("zones");

    expect(mocks.useSWR).toHaveBeenCalledWith(
      "/api/pilotage/overview",
      fetchPilotageOverview,
      expect.objectContaining({ refreshInterval: 1_800_000 }),
    );
  });

  it("keeps the no-store request and response contract", async () => {
    const payload = {
      status: "ok",
      generatedAt: "2026-10-03T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPilotageOverview("/api/pilotage/overview")).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/pilotage/overview", {
      method: "GET",
      cache: "no-store",
    });
  });

  it("preserves the response status and body when loading fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPilotageOverview("/api/pilotage/overview")).rejects.toMatchObject({
      message: "forbidden",
      status: 403,
    });
  });
});
