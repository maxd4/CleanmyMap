import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const swrMock = vi.hoisted(() => vi.fn());

vi.mock("swr", () => ({ default: swrMock }));

import { TerritorialLegendsPanel } from "./territorial-legends-panel";

describe("TerritorialLegendsPanel", () => {
  const fullData = {
    status: "ok" as const,
    campaignYear: 2026,
    windowDays: 90,
    levels: ["arrondissement", "commune", "department", "region", "country"],
    territories: [{
      level: "commune" as const,
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
      rewards: [{ awardKind: "conquest" as const, thresholdDays: 0, validityStatus: "active" }],
    }],
  };

  beforeEach(() => {
    swrMock.mockReset().mockReturnValue({ data: fullData, error: undefined, isLoading: false });
  });

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

  it("renders loading, transport errors and an empty server projection", () => {
    swrMock.mockReturnValueOnce({ data: undefined, error: undefined, isLoading: true });
    expect(renderToStaticMarkup(<TerritorialLegendsPanel />)).toContain("Chargement des Légendes territoriales");

    swrMock.mockReturnValueOnce({ data: { status: "invalid" }, error: undefined, isLoading: false });
    expect(renderToStaticMarkup(<TerritorialLegendsPanel />)).toContain('data-testid="territorial-legends-error"');

    swrMock.mockReturnValueOnce({ data: { ...fullData, territories: [] }, error: undefined, isLoading: false });
    const markup = renderToStaticMarkup(<TerritorialLegendsPanel locale="en" />);
    expect(markup).toContain('data-testid="territorial-legends-empty"');
    expect(swrMock).toHaveBeenCalledWith("territorial-legends-overview", expect.any(Function), expect.any(Object));
  });

  it("keeps partial territories explicit without inventing ranking, dates or rewards", () => {
    swrMock.mockReturnValueOnce({
      data: {
        ...fullData,
        territories: [{
          ...fullData.territories[0],
          territoryLabel: null,
          private: null,
          public: { ...fullData.territories[0].public, competitorCount: 0, items: [] },
          currentHold: null,
          bestHistory: null,
          rewards: [],
        }],
      },
      error: undefined,
      isLoading: false,
    });
    const markup = renderToStaticMarkup(<TerritorialLegendsPanel />);
    expect(markup).toContain("Territoire COG 75056");
    expect(markup).toContain("aucun titre confirmé");
    expect(markup).toContain("Aucun classement public disponible");
    expect(markup).not.toContain("Camille");
    expect(markup).toContain("Non acquis");
  });

  it("validates the real overview fetcher before handing data to SWR", async () => {
    renderToStaticMarkup(<TerritorialLegendsPanel />);
    const fetcher = swrMock.mock.calls.at(-1)?.[1] as (() => Promise<unknown>) | undefined;
    expect(fetcher).toBeTypeOf("function");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: vi.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ status: "invalid" }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(fullData) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetcher!()).rejects.toThrow("unavailable");
    await expect(fetcher!()).rejects.toThrow("invalid");
    await expect(fetcher!()).resolves.toEqual(fullData);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledWith("/api/gamification/territorial-leaderboard/overview", expect.objectContaining({ method: "GET", cache: "no-store" }));
  });
});
