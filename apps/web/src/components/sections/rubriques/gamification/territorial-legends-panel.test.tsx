import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("swr", () => ({
  default: () => ({
    data: {
      status: "ok",
      campaignYear: 2026,
      windowDays: 90,
      levels: ["arrondissement", "commune", "department", "region", "country"],
      territories: [{
        level: "commune",
        territoryCode: "75056",
        territoryLabel: "Paris",
        private: { rank: 1, score: 3, distinctActions: 3, tied: true, tieSize: 2, title: "Légende de Paris" },
        public: {
          competitorCount: 2,
          maxScore: 3,
          titleEligible: true,
          title: "Légende de Paris",
          items: [{ rank: 1, publicLabel: "Camille", score: 3, distinctActions: 3, tied: true, tieSize: 2 }],
        },
        currentHold: { startedOn: "2026-11-01", lastVerifiedOn: "2026-11-04", days: 4 },
        bestHistory: { campaignYear: 2026, startedOn: "2026-10-01", endedOn: "2026-11-04", days: 35 },
        rewards: [{ awardKind: "conquest", thresholdDays: 0, validityStatus: "active" }],
      }],
    },
    error: undefined,
    isLoading: false,
  }),
}));

import { TerritorialLegendsPanel } from "./territorial-legends-panel";

describe("TerritorialLegendsPanel", () => {
  it("renders private rank, territory facts, tie information, six reward states and no raw user id", () => {
    const markup = renderToStaticMarkup(<TerritorialLegendsPanel />);

    expect(markup).toContain("Cinq défis de première conquête");
    expect(markup).toContain("Six récompenses de détention et de saison");
    expect(markup).toContain("Légende de Paris");
    expect(markup).toContain("Rang");
    expect(markup).toContain("90 jours");
    expect(markup).toContain("35 j");
    expect(markup).toContain("égalité à 2");
    expect(markup).toContain("Règles de classement et de détention");
    expect(markup).toContain("participation confirmée");
    expect(markup).toContain("Fin de saison");
    expect(markup).not.toContain("userId");
  });
});
