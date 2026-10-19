import { act, create } from "react-test-renderer";
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
const swrCalls = vi.hoisted(() => [] as Array<{ key: string; options: Record<string, unknown> }>);

vi.mock("swr", () => ({
  default: (key: string, _fetcher: unknown, options: Record<string, unknown>) => {
    swrCalls.push({ key, options });
    return swrState.current;
  },
}));

import { LeaderboardPanel } from "./leaderboard-panel";

type MockSwrState = {
  data: PublicLeaderboardResponseDto | undefined;
  error: Error | undefined;
  isLoading: boolean;
};

describe("LeaderboardPanel", () => {
  it("loads each selected view through the recent-view cache contract", () => {
    swrCalls.length = 0;
    swrState.current = { data: undefined, error: undefined, isLoading: true };

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<LeaderboardPanel />);
    });

    const structureButton = renderer.root.findAllByType("button").find((button) => String(button.props.children).includes("Structures"));
    const userButton = renderer.root.findAllByType("button").find((button) => String(button.props.children).includes("Utilisateurs"));
    act(() => structureButton?.props.onClick());
    act(() => userButton?.props.onClick());

    expect(swrCalls.map(({ key }) => key)).toEqual([
      "/api/gamification/leaderboard/public?scope=user&metric=level",
      "/api/gamification/leaderboard/public?scope=structure&metric=level",
      "/api/gamification/leaderboard/public?scope=user&metric=level",
    ]);
    expect(swrCalls[0]?.options).toMatchObject({
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
      dedupingInterval: 60_000,
    });
  });

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
    expect(html).toContain("9 badges");
    expect(html).toContain("(7 grades + 2 one-shot)");
    expect(html).not.toContain("9 badges (7 grades + 2 one-shot)");
    expect(html).toContain('data-disclosure-tone="rose"');
    expect(html).toContain("Utilisateur");
    expect(html).not.toContain("userId");
    expect(html).not.toContain("clerk");
    expect(html).not.toMatch(/email|metadata|xpPending|contributions|impact|history|moderation/iu);
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
