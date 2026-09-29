import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PublicLeaderboardResponseDto } from "@/lib/gamification/progression-types";

const swrState = vi.hoisted(() => ({
  current: {
    data: undefined as PublicLeaderboardResponseDto | undefined,
    error: undefined as Error | undefined,
    isLoading: false,
  },
}));

vi.mock("swr", () => ({
  default: () => swrState.current,
}));

import { LeaderboardPanel } from "./leaderboard-panel";

type MockSwrState = {
  data: PublicLeaderboardResponseDto | undefined;
  error: Error | undefined;
  isLoading: boolean;
};

describe("LeaderboardPanel", () => {
  it("renders user metrics and never renders private identifiers", () => {
    swrState.current = {
      data: {
        scope: "user",
        metric: "badges",
        generatedAt: "2026-09-30T00:00:00.000Z",
        items: [
          {
            rank: 1,
            publicLabel: "Alice",
            level: 4,
            xpValidated: 42,
            badgeTotal: 9,
            gradeCount: 7,
            oneShotCount: 2,
          },
        ],
      },
      error: undefined,
      isLoading: false,
    };

    const html = renderToStaticMarkup(<LeaderboardPanel />);
    expect(html).toContain("Alice");
    expect(html).toContain("9 badges (7 grades + 2 one-shot)");
    expect(html).toContain("Utilisateur");
    expect(html).not.toContain("userId");
    expect(html).not.toContain("clerk");
  });

  it("renders structure type and collective level without an organizer id", () => {
    swrState.current = {
      data: {
        scope: "structure",
        metric: "level",
        generatedAt: "2026-09-30T00:00:00.000Z",
        items: [
          {
            rank: 1,
            publicLabel: "Les Rives",
            structureType: "association",
            level: 3,
            xpValidated: 18,
            badgeTotal: 4,
            gradeCount: 4,
            oneShotCount: 0,
          },
        ],
      },
      error: undefined,
      isLoading: false,
    };

    const html = renderToStaticMarkup(<LeaderboardPanel initialScope="structure" />);
    expect(html).toContain("Les Rives");
    expect(html).toContain("Association");
    expect(html).toContain("Niveau collectif");
    expect(html).not.toContain("organizerId");
    expect(html).not.toContain("structure-a");
  });

  const states: Array<[string, MockSwrState, string]> = [
    ["loading", { data: undefined, error: undefined, isLoading: true }, "Chargement du classement"],
    ["empty", { data: { scope: "user", metric: "level", generatedAt: "now", items: [] }, error: undefined, isLoading: false }, "Aucun utilisateur"],
    ["error", { data: undefined, error: new Error("API indisponible"), isLoading: false }, "API indisponible"],
  ];

  it.each(states)("renders the %s state without fake rows", (_name, state, text) => {
    swrState.current = state;
    const html = renderToStaticMarkup(<LeaderboardPanel />);
    expect(html).toContain(text);
    expect(html).not.toContain("Alice");
  });
});
