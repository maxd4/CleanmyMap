import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("gamification progression leaderboard", () => {
  it("does not trigger a global backfill on read", () => {
    const sources = [
      "progression-leaderboard.ts",
      "progression-user.ts",
      "progression-ranking.ts",
      "progression-retention.ts",
    ].map((fileName) =>
      readFileSync(new URL(`./${fileName}`, import.meta.url), "utf8"),
    );

    expect(sources.every((source) => !source.includes("backfillAllProgression(supabase);"))).toBe(true);
  });

  it("keeps the public module as a narrow owner façade", () => {
    const source = readFileSync(
      new URL("./progression-leaderboard.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('export { getUserProgression } from "./progression-user";');
    expect(source).toContain("getGamificationLeaderboard,");
    expect(source).toContain("projectGamificationLeaderboardResponse,");
    expect(source).toContain('export { buildPostActionRetentionLoop } from "./progression-retention";');
  });
});
