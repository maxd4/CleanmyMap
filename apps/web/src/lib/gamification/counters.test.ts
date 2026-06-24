import { describe, expect, it, vi } from "vitest";
import {
  loadGamificationFunnelCounts,
  loadGamificationUserCounters,
} from "./counters";

describe("gamification counters", () => {
  it("loads funnel counts from Supabase RPC", async () => {
    const supabase = {
      rpc: vi.fn(async (name: string) => {
        expect(name).toBe("load_gamification_funnel_counts");
        return {
          data: [
            {
              total_users: 12,
              users_with_points: 8,
              users_with_badges: 5,
              users_high_activity: 2,
            },
          ],
          error: null,
        };
      }),
    };

    await expect(loadGamificationFunnelCounts(supabase)).resolves.toEqual({
      totalUsers: 12,
      usersWithPoints: 8,
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
              total_points: 14.5,
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
    };

    await expect(loadGamificationUserCounters(supabase, "user-1")).resolves.toEqual({
      totalPoints: 14.5,
      approvedActionsCount: 4,
      completeActionsCount: 2,
      visitedPlacesCount: 6,
      eligibleFormsCount: 7,
      participationCount: 3,
    });
  });
});
