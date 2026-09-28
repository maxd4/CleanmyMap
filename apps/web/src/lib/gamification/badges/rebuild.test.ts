import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

const reconcileUserGamificationMock = vi.hoisted(() => vi.fn());

vi.mock("../gamification-reconciliation", () => ({
  reconcileUserGamification: reconcileUserGamificationMock,
}));

import { rebuildUserGamificationBadges } from "./rebuild";

describe("rebuildUserGamificationBadges", () => {
  it("delegates the compatibility entry point to CURRENT reconstruction", async () => {
    reconcileUserGamificationMock.mockResolvedValueOnce({
      inserted: 1,
      updated: 2,
      removed: 3,
      preservedLegacy: 4,
      expectedEvents: 5,
      expectedBadges: ["badge-a"],
    });

    await expect(rebuildUserGamificationBadges({} as SupabaseClient, "user-1"))
      .resolves.toEqual({ inserted: 1, updated: 2, removed: 3 });
    expect(reconcileUserGamificationMock).toHaveBeenCalledWith(expect.anything(), "user-1");
  });
});
