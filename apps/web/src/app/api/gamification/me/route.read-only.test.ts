import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("GET /api/gamification/me boundary", () => {
  it("does not invoke a rebuild or perform DML while reading progression", () => {
    const route = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
    const progression = readFileSync(
      new URL("../../../../lib/gamification/progression-leaderboard.ts", import.meta.url),
      "utf8",
    );
    const profileBadges = readFileSync(
      new URL("../../../../lib/gamification/infinite-badges-server.ts", import.meta.url),
      "utf8",
    );

    expect(route).not.toContain("backfill");
    expect(route).not.toContain("rebuild");
    expect(progression).not.toContain("backfillUserProgression");

    for (const source of [route, progression, profileBadges]) {
      expect(source).not.toMatch(/\.insert\s*\(/);
      expect(source).not.toMatch(/\.update\s*\(/);
      expect(source).not.toMatch(/\.delete\s*\(/);
      expect(source).not.toMatch(/\.upsert\s*\(/);
    }
  });
});
