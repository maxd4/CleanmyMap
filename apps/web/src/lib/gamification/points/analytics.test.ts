import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadGamificationPointsAnalytics } from "./analytics";

describe("gamification points analytics", () => {
  it("loads the points analytics payload from Supabase RPC", async () => {
    const supabase = {
      rpc: vi.fn(async (name: string, params: Record<string, unknown>) => {
        expect(name).toBe("load_gamification_points_analytics");
        expect(params).toEqual({
          p_user_id: "user-1",
          p_floor_date: "2026-06-01",
        });
        return {
          data: [
            {
              total_points: 42,
              transaction_count: 3,
              event_breakdown: {
                action_created: { count: 2, points: 12 },
                form_bonus: { count: 1, points: 30 },
              },
              timeline: [
                { date: "2026-06-01", points: 12 },
                { date: "2026-06-02", points: 30 },
              ],
            },
          ],
          error: null,
        };
      }),
    } as unknown as SupabaseClient;

    await expect(
      loadGamificationPointsAnalytics(supabase, "user-1", "2026-06-01"),
    ).resolves.toEqual({
      totalPoints: 42,
      transactionCount: 3,
      eventBreakdown: {
        action_created: { count: 2, points: 12 },
        form_bonus: { count: 1, points: 30 },
      },
      timeline: [
        { date: "2026-06-01", points: 12 },
        { date: "2026-06-02", points: 30 },
      ],
    });
  });
});
