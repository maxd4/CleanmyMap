import { describe, expect, it } from "vitest";
import { computeQualityLeaderboard as canonicalComputeQualityLeaderboard } from "../engagement";
import { computeQualityLeaderboard } from "./leaderboard";

describe("computeQualityLeaderboard facade", () => {
  it("re-exports the canonical implementation without duplicating formula scenarios", () => {
    expect(computeQualityLeaderboard).toBe(canonicalComputeQualityLeaderboard);
  });
});
