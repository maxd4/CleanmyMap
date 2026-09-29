import { describe, expect, it } from "vitest";
import {
  buildPublicLeaderboardUrl,
  formatBadgeBreakdown,
  isPublicStructureItem,
  PUBLIC_LEADERBOARD_METRICS,
} from "./leaderboard-panel.model";

describe("public leaderboard panel model", () => {
  it("builds the six bounded API combinations without client-side filtering", () => {
    expect(PUBLIC_LEADERBOARD_METRICS).toEqual(["level", "xp", "badges"]);
    for (const scope of ["user", "structure"] as const) {
      for (const metric of PUBLIC_LEADERBOARD_METRICS) {
        expect(buildPublicLeaderboardUrl(scope, metric)).toBe(
          `/api/gamification/leaderboard/public?scope=${scope}&metric=${metric}`,
        );
      }
    }
  });

  it("formats the canonical badge total and identifies structure rows safely", () => {
    const user = {
      rank: 1,
      publicLabel: "Alice",
      level: 4,
      xpValidated: 42,
      badgeTotal: 9,
      gradeCount: 7,
      oneShotCount: 2,
    } as const;
    const structure = {
      ...user,
      publicLabel: "Les Rives",
      structureType: "association" as const,
    };

    expect(formatBadgeBreakdown(user)).toBe("(7 grades + 2 one-shot)");
    expect(isPublicStructureItem(user)).toBe(false);
    expect(isPublicStructureItem(structure)).toBe(true);
  });
});
