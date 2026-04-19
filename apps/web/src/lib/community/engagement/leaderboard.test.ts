import { describe, expect, it } from "vitest";
import { computeQualityLeaderboard } from "./leaderboard";
import { makeAction } from "./test-fixtures";

describe("computeQualityLeaderboard (module)", () => {
  it("ranks contributors by weighted score and quality", () => {
    const leaderboard = computeQualityLeaderboard([
      makeAction({ id: "a1", actor_name: "Alice", notes: "ok" }),
      makeAction({ id: "a2", actor_name: "Alice", waste_kg: 8 }),
      makeAction({
        id: "a3",
        actor_name: "Bob",
        latitude: null,
        longitude: null,
      }),
    ]);

    expect(leaderboard[0]?.actor).toBe("Alice");
    expect(leaderboard[0]?.avgQuality).toBeGreaterThanOrEqual(
      leaderboard[1]?.avgQuality ?? 0,
    );
    expect(leaderboard[0]?.badge).toBeTruthy();
  });
});
