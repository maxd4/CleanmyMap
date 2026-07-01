import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("gamification leaderboard route", () => {
  it("accepts a named leaderboard period", () => {
    const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

    expect(source).toContain('const periodSchema = z.enum(["lifetime","yearToDate"]);');
    expect(source).toContain('period: period.data,');
    expect(source).toContain('loadCachedGamificationLeaderboard(parsed.data, period.data)');
  });
});
