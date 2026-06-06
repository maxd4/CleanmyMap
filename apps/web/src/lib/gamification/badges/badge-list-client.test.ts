import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadGamificationBadgesListClient,
  resetGamificationBadgesListRequestCache,
} from "./badge-list-client";

afterEach(() => {
  resetGamificationBadgesListRequestCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadGamificationBadgesListClient", () => {
  it("dedupes concurrent badge list fetches", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: "ok",
        summary: { currentPlaces: 3 },
        badges: [],
      }),
    }));

    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      loadGamificationBadgesListClient(),
      loadGamificationBadgesListClient(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(first.summary?.currentPlaces).toBe(3);
  });
});
