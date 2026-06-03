import { describe, expect, it } from "vitest";
import {
  buildExplorerFamily,
  buildFormsBadges,
  buildLegacyBadges,
  buildParticipantBadges,
} from "./families";

describe("gamification badge families", () => {
  it("keeps participant family on an Observateur base tier", () => {
    const badges = buildParticipantBadges(0);

    expect(badges[0]).toMatchObject({
      id: "participant-0",
      name: "Observateur",
      unlocked: true,
      progress: { current: 0, target: 0 },
    });
  });

  it("computes explorer summary from the current place count", () => {
    const family = buildExplorerFamily(0);

    expect(family.summary).toMatchObject({
      currentPlaces: 0,
      zonesToNext: 1,
      nextTier: {
        id: "explorer-wood",
        title: "Promeneur Local",
        min: 1,
      },
    });
  });

  it("keeps the explorer family on its own exploration scale", () => {
    const family = buildExplorerFamily(15);

    expect(family.badges[0]).toMatchObject({
      id: "explorer-observateur",
      name: "Observateur",
    });
    expect(family.badges.find((badge) => badge.id === "explorer-cartographe")).toMatchObject({
      id: "explorer-cartographe",
      name: "Cartographe",
    });
    expect(family.badges.some((badge) => badge.name === "Quartz" || badge.name === "Topaze")).toBe(false);
  });

  it("keeps first trace and legacy badges aligned with the complete action count", () => {
    const badges = buildLegacyBadges(0, 0, 1);

    expect(badges.find((badge) => badge.id === "first_trace_utile")).toMatchObject({
      unlocked: true,
      progress: { current: 1, target: 1 },
    });
    expect(badges.find((badge) => badge.id === "trace_fondatrice")).toMatchObject({
      unlocked: true,
      progress: { current: 1, target: 1 },
    });
  });

  it("keeps forms badges ordered by the configured tiers", () => {
    const badges = buildFormsBadges(3);

    expect(badges.map((badge) => badge.id)).toContain("forms-seed");
    expect(badges.find((badge) => badge.id === "forms-sprout")).toMatchObject({
      unlocked: true,
      progress: { current: 3, target: 3 },
    });
  });
});
