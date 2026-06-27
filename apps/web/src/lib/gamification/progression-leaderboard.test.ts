import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("gamification progression leaderboard", () => {
  it("does not trigger a global backfill on read", () => {
    const source = readFileSync(
      new URL("./progression-leaderboard.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("backfillAllProgression(supabase);");
  });
});
