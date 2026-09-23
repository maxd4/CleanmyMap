import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadGamificationFunnelCounts,
  loadGamificationUserCounters,
} from "./counters";

describe("gamification counters", () => {
  it("keeps the CURRENT counter RPCs on progression profiles, not point tables", () => {
    const migration = readFileSync(
      new URL("../../../supabase/migrations/20260924000001_xp_only_gamification_rpc_contracts.sql", import.meta.url),
      "utf8",
    );

    expect(migration).toContain("public.progression_profiles");
    expect(migration).not.toContain("public.user_points");
    expect(migration).not.toContain("total_points");
  });

  it("loads funnel counts from Supabase RPC", async () => {
    const supabase = {
      rpc: vi.fn(async (name: string) => {
        expect(name).toBe("load_gamification_funnel_counts");
        return {
          data: [
            {
              total_users: 12,
              users_with_xp: 8,
              users_with_badges: 5,
              users_high_activity: 2,
            },
          ],
          error: null,
        };
      }),
    } as unknown as SupabaseClient;

    await expect(loadGamificationFunnelCounts(supabase)).resolves.toEqual({
      totalUsers: 12,
      usersWithXp: 8,
      usersWithBadges: 5,
      usersHighActivity: 2,
    });
  });

  it("loads per-user gamification counters from Supabase RPC", async () => {
    const supabase = {
      rpc: vi.fn(async (name: string, params: Record<string, unknown>) => {
        expect(name).toBe("load_gamification_user_counters");
        expect(params).toEqual({ p_user_id: "user-1" });
        return {
          data: [
            {
              approved_actions_count: 4,
              complete_actions_count: 2,
              visited_places_count: 6,
              eligible_forms_count: 7,
              participation_count: 3,
            },
          ],
          error: null,
        };
      }),
    } as unknown as SupabaseClient;

    await expect(loadGamificationUserCounters(supabase, "user-1")).resolves.toEqual({
      approvedActionsCount: 4,
      completeActionsCount: 2,
      visitedPlacesCount: 6,
      eligibleFormsCount: 7,
      participationCount: 3,
    });
  });
});
