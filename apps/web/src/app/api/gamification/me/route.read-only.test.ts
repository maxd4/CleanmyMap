import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { expectNoSupabaseWrites } from "@/app/api/test-helpers";

describe("GET /api/gamification/me boundary", () => {
  it("uses the central authentication guard for the whole gamification/me surface", () => {
    const routes = [
      readFileSync(new URL("./route.ts", import.meta.url), "utf8"),
      readFileSync(new URL("./acknowledge-reconciliation/route.ts", import.meta.url), "utf8"),
      readFileSync(new URL("./acknowledge-rules-migration/route.ts", import.meta.url), "utf8"),
    ];

    for (const route of routes) {
      expect(route).toContain("requireAuthenticatedAccess");
      expect(route).not.toContain("auth(");
    }
  });

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

    expectNoSupabaseWrites([route, progression, profileBadges]);
  });
});
