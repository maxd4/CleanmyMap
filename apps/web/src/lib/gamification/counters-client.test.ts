import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadGamificationCountersClient,
  resetGamificationCountersRequestCache,
} from "./counters-client";

const getSupabaseBrowserClientMock = vi.hoisted(() => vi.fn());
const loadGamificationUserCountersMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: getSupabaseBrowserClientMock,
}));

vi.mock("@/lib/gamification/counters", () => ({
  loadGamificationUserCounters: loadGamificationUserCountersMock,
}));

afterEach(() => {
  resetGamificationCountersRequestCache();
  vi.restoreAllMocks();
});

describe("loadGamificationCountersClient", () => {
  it("dedupes concurrent counter loads", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({} as never);
    loadGamificationUserCountersMock.mockResolvedValue({
      totalPoints: 42,
      approvedActionsCount: 4,
      completeActionsCount: 2,
      visitedPlacesCount: 5,
      eligibleFormsCount: 12,
      participationCount: 3,
    });

    const [first, second] = await Promise.all([
      loadGamificationCountersClient("user-1", async () => "token"),
      loadGamificationCountersClient("user-1", async () => "token"),
    ]);

    expect(getSupabaseBrowserClientMock).toHaveBeenCalledTimes(1);
    expect(loadGamificationUserCountersMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(first.counters?.eligibleFormsCount).toBe(12);
  });
});
