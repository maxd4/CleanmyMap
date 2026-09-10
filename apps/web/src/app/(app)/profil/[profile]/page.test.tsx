import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("detailed profile gamification contract", () => {
  it("composes the compact summary from the page's existing data", () => {
    expect(pageSource).toContain("ProfileGamificationSummary");
    expect(pageSource).toContain("currentLevel={identity?.currentLevel ?? null}");
    expect(pageSource).toContain("actionsCreated={infiniteTotals.actionsCreated}");
    expect(pageSource).toContain(
      "regularityLabel={infiniteTotals.monthlyRegularity.currentLabel}",
    );
    expect(pageSource).toContain(
      "actionBalanceLabel={infiniteTotals.actionBalance.currentLabel}",
    );
    expect(pageSource).not.toContain('href="/gamification"');
    expect(pageSource).toContain("<InfiniteBadgesPanel totals={infiniteTotals} />");

    const summaryIndex = pageSource.indexOf("<ProfileGamificationSummary");
    const detailsIndex = pageSource.indexOf("<InfiniteBadgesPanel");
    expect(summaryIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeLessThan(detailsIndex);
  });

  it("does not add another gamification/progression data source", () => {
    expect((pageSource.match(/getInfiniteBadgeTotals\(userId\)/g) ?? [])).toHaveLength(1);
    expect(pageSource).not.toContain("getUserProgression");
    expect(pageSource).not.toContain("/api/gamification/me");
    expect(pageSource).not.toContain("identity.badges");
  });

  it("keeps the existing profile and advanced-profile flow", () => {
    expect(pageSource).toContain("isAppProfile(normalized)");
    expect(pageSource).toContain("getSwitchableProfiles(grantedRole)");
    expect(pageSource).toContain("redirect(buildProfileRoute(activeProfile))");
    expect(pageSource).toContain('id="parrainage"');
    expect(pageSource).toContain("<AccountSettingsSection />");
  });
});
