import * as React from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const swrState = vi.hoisted(() => ({ data: undefined as unknown, error: undefined as unknown, isLoading: true }));
vi.mock("swr", () => ({ default: () => swrState }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) }));
vi.mock("lucide-react", () => ({ Award: () => null, CalendarDays: () => null, CheckCircle2: () => null, Flag: () => null, Gavel: () => null, Medal: () => null, Recycle: () => null, Trophy: () => null }));
vi.mock("./gamification-shell", () => ({ GamificationPanelLoading: ({ ariaLabel }: { ariaLabel: string }) => React.createElement("div", { "aria-label": ariaLabel }), SectionLabel: ({ title }: { title: string }) => React.createElement("h2", null, title) }));

import { GamificationSpogomiCollection } from "./gamification-spogomi-collection";

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

const collection = {
  awards: [{ id: "award-1", eventId: "event-1", badgeTypeId: "spogomi_referee", eventYear: 2026, eventLocalDate: "2026-06-01", awardedAt: "2026-06-02T00:00:00Z", rankingVersion: null, status: "active", eventName: "Paris", eventSlug: "paris-2026", eventState: "certified", eventPublic: true }],
  spogomiAwardCount: 1, spogomiDistinctBadgeTypes: 1, spogomiEventsParticipated: 1,
  collectorProgress: { currentValue: 0, lastThreshold: null, nextThreshold: 1, progressPercent: 0 },
  refereeProgress: { currentValue: 1, lastThreshold: 1, nextThreshold: 3, progressPercent: 50 },
};

describe("SPOGOMI gamification collection", () => {
  beforeEach(() => { swrState.data = undefined; swrState.error = undefined; swrState.isLoading = true; });

  it("distinguishes loading, error, empty and populated private states", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<GamificationSpogomiCollection locale="fr" />); });
    expect(renderer.root.findByProps({ "aria-label": "Chargement de la collection SPOGOMI" })).toBeTruthy();
    renderer.unmount();

    swrState.isLoading = false; swrState.error = new Error("private failure");
    act(() => { renderer = create(<GamificationSpogomiCollection locale="fr" />); });
    expect(renderer.root.findByProps({ id: "spogomi-collection" })).toBeTruthy();
    expect(propsOf<{ children?: React.ReactNode }>(renderer.root.findByType("h2")).children).toBe("Collection SPOGOMI indisponible");
    renderer.unmount();

    swrState.error = undefined; swrState.data = { ...collection, awards: [] };
    act(() => { renderer = create(<GamificationSpogomiCollection locale="fr" />); });
    expect(renderer.root.findAll((node) => propsOf<{ children?: React.ReactNode }>(node).children === "Votre collection SPOGOMI est encore vide.")).toHaveLength(1);
    renderer.unmount();

    swrState.data = collection;
    act(() => { renderer = create(<GamificationSpogomiCollection locale="fr" />); });
    expect(renderer.root.findAll((node) => node.type === "h3").map((node) => propsOf<{ children?: React.ReactNode }>(node).children)).toContain("Arbitrage SPOGOMI");
    expect(renderer.root.findAll((node) => node.type === "a" && propsOf<{ href?: string }>(node).href === "/spogomi/paris-2026")).toHaveLength(1);
    renderer.unmount();
  });
});
