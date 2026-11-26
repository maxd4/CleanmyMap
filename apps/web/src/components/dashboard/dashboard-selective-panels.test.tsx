import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadDashboardOverviewResult: vi.fn(),
  loadDashboardEngagementData: vi.fn(),
}));

vi.mock("@/lib/dashboard/page-data", () => ({
  loadDashboardOverviewResult: mocks.loadDashboardOverviewResult,
  loadDashboardEngagementData: mocks.loadDashboardEngagementData,
}));

vi.mock("./dashboard-overview-section", () => ({
  DashboardOverviewSection: () =>
    React.createElement("div", { "data-testid": "overview-section" }, "Indicateurs chargés"),
}));

vi.mock("./dashboard-user-level-ranking", () => ({
  DashboardUserLevelRanking: ({
    userLevelRanking,
  }: {
    userLevelRanking: { topRows: unknown[] };
  }) =>
    React.createElement(
      "div",
      { "data-testid": "ranking-section", "data-rows": userLevelRanking.topRows.length },
      userLevelRanking.topRows.length === 0 ? "Classement vide" : "Classement chargé",
    ),
}));

import { DashboardCollectivePanel } from "./dashboard-collective-panel";
import { DashboardEngagementPanel } from "./dashboard-engagement-panel";

describe("Dashboard selective panels behavioral consumption", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders partial/truncated source notice and empty/error states in DashboardCollectivePanel", async () => {
    mocks.loadDashboardOverviewResult.mockResolvedValueOnce({
      status: "ok",
      overview: {
        contracts: [],
        dataAvailability: { isTruncated: true, sourceHealth: { partial: true } },
      },
    });
    const partialMarkup = renderToStaticMarkup(
      await DashboardCollectivePanel({ locale: "fr", profile: "benevole" }),
    );
    expect(partialMarkup).toContain("Indicateurs collectifs");
    expect(partialMarkup).toContain("Source partielle ou tronquée : interprétez les indicateurs avec prudence.");
    expect(partialMarkup).toContain('data-testid="overview-section"');

    mocks.loadDashboardOverviewResult.mockResolvedValueOnce({
      status: "error",
      reason: "timeout",
    });
    const errorMarkup = renderToStaticMarkup(
      await DashboardCollectivePanel({ locale: "fr", profile: "benevole" }),
    );
    expect(errorMarkup).toContain('data-testid="overview-section"');
    expect(errorMarkup).not.toContain("Source partielle ou tronquée");
  });

  it("isolates referral and ranking errors independently in DashboardEngagementPanel", async () => {
    mocks.loadDashboardEngagementData.mockResolvedValueOnce({
      referralSummary: null,
      userLevelRanking: { topRows: [{ userId: "u1" }], currentUserRow: null },
    });
    const referralErrMarkup = renderToStaticMarkup(
      await DashboardEngagementPanel({ userId: "u1", profile: "benevole", locale: "fr" }),
    );
    expect(referralErrMarkup).toContain("Les données de parrainage sont momentanément indisponibles.");
    expect(referralErrMarkup).toContain("Classement chargé");

    mocks.loadDashboardEngagementData.mockResolvedValueOnce({
      referralSummary: {
        referralCode: "ABC",
        inviteUrl: "/sign-up?ref=ABC",
        invitedUsersCount: 3,
        invitedBy: null,
        badgeUnlocked: true,
        referralAwardedXp: 3,
      },
      userLevelRanking: null,
    });
    const rankingErrMarkup = renderToStaticMarkup(
      await DashboardEngagementPanel({ userId: "u1", profile: "benevole", locale: "fr" }),
    );
    expect(rankingErrMarkup).toContain("3");
    expect(rankingErrMarkup).toContain("Classement momentanément indisponible.");

    mocks.loadDashboardEngagementData.mockResolvedValueOnce({
      referralSummary: {
        referralCode: "ABC",
        inviteUrl: "/sign-up?ref=ABC",
        invitedUsersCount: 0,
        invitedBy: null,
        badgeUnlocked: false,
        referralAwardedXp: 0,
      },
      userLevelRanking: { topRows: [], currentUserRow: null },
    });
    const emptyRankingMarkup = renderToStaticMarkup(
      await DashboardEngagementPanel({ userId: "u1", profile: "benevole", locale: "fr" }),
    );
    expect(emptyRankingMarkup).toContain("Classement vide");
  });
});
