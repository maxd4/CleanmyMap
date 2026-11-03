import { describe, expect, it } from "vitest";

import { buildTerritorialLegendPage, buildTerritorialLegendWinnerSnapshots } from "./engine";
import type {
  TerritorialActionFact,
  TerritorialLegendConsent,
  TerritorialParticipationFact,
  TerritorialPublicProfile,
} from "./types";

const now = new Date("2026-11-03T12:00:00.000Z");

function action(actionId: string, actionDate: string, overrides: Partial<TerritorialActionFact["territory"]> = {}): TerritorialActionFact {
  return {
    actionId,
    actionDate,
    territory: {
      country: { code: "FR", name: "France" },
      region: { code: "11", name: "Île-de-France" },
      department: { code: "75", name: "Paris" },
      commune: { code: "75056", name: "Paris" },
      arrondissement: { code: "75105", name: "Paris 5e arrondissement" },
      ...overrides,
    },
  };
}

const actions = [
  action("a-1", "2026-10-01"),
  action("a-2", "2026-10-02"),
  action("a-3", "2026-10-03"),
  action("a-old", "2026-08-05"),
  action("a-overseas", "2026-10-04", {
    region: { code: "04", name: "La Réunion" },
    department: { code: "974", name: "La Réunion" },
    commune: { code: "97411", name: "Saint-Denis" },
    arrondissement: null,
  }),
];

const participations: TerritorialParticipationFact[] = [
  { actionId: "a-1", userId: "u-a", joinedAt: "2026-09-20T10:00:00.000Z" },
  { actionId: "a-1", userId: "u-a", joinedAt: "2026-09-20T10:00:00.000Z" },
  { actionId: "a-2", userId: "u-a", joinedAt: "2026-10-01T10:00:00.000Z" },
  { actionId: "a-3", userId: "u-b", joinedAt: "2026-09-20T10:00:00.000Z" },
  { actionId: "a-2", userId: "u-b", joinedAt: "2026-10-01T10:00:00.000Z" },
  { actionId: "a-3", userId: "u-c", joinedAt: "2026-09-20T10:00:00.000Z" },
  { actionId: "a-old", userId: "u-a", joinedAt: "2026-08-05T10:00:00.000Z" },
  { actionId: "a-overseas", userId: "u-a", joinedAt: "2026-10-04T10:00:00.000Z" },
];

const consents: TerritorialLegendConsent[] = [
  { userId: "u-a", enabled: true, activatedAt: "2026-09-01T00:00:00.000Z" },
  { userId: "u-b", enabled: true, activatedAt: "2026-09-01T00:00:00.000Z" },
  { userId: "u-c", enabled: true, activatedAt: "2026-09-01T00:00:00.000Z" },
  { userId: "u-private", enabled: false, activatedAt: null },
];

const profiles: TerritorialPublicProfile[] = [
  { userId: "u-a", publicLabel: "Alice" },
  { userId: "u-b", publicLabel: "Bob" },
  { userId: "u-c", publicLabel: "Chloé" },
  { userId: "u-private", publicLabel: "Privé" },
];

describe("territorial legend engine", () => {
  it("projects the five COG parent levels without sharing action identity", () => {
    for (const [level, territoryCode] of [
      ["arrondissement", "75105"],
      ["commune", "75056"],
      ["department", "75"],
      ["region", "11"],
      ["country", "FR"],
    ] as const) {
      const page = buildTerritorialLegendPage({
        level,
        territoryCode,
        territoryLabel: "Paris",
        now,
        actions,
        participations,
        consents,
        profiles,
      });
      expect(page.items.map((item) => item.publicLabel)).toEqual(["Alice", "Bob", "Chloé"]);
      expect(page.items.every((item) => !Object.hasOwn(item, "userId"))).toBe(true);
    }
  });

  it("deduplicates one action per user and level, excludes old and revoked users, and makes ties explicit", () => {
    const page = buildTerritorialLegendPage({
      level: "arrondissement",
      territoryCode: "75105",
      territoryLabel: "Paris 5e arrondissement",
      now,
      actions,
      participations,
      consents,
      profiles,
    });
    expect(page.items).toEqual([
      { rank: 1, publicLabel: "Alice", score: 2, distinctActions: 2, tied: true, tieSize: 2 },
      { rank: 1, publicLabel: "Bob", score: 2, distinctActions: 2, tied: true, tieSize: 2 },
      { rank: 3, publicLabel: "Chloé", score: 1, distinctActions: 1, tied: false, tieSize: 1 },
    ]);
    expect(page.titleEligible).toBe(true);
    expect(page.title).toBe("Légende de Paris 5e arrondissement");
  });

  it("does not make one competitor or one action a title", () => {
    const page = buildTerritorialLegendPage({
      level: "arrondissement",
      territoryCode: "75105",
      territoryLabel: "Paris 5e arrondissement",
      now,
      actions: actions.slice(0, 1),
      participations: participations.filter((row) => row.actionId === "a-1"),
      consents,
      profiles,
    });
    expect(page.competitorCount).toBe(1);
    expect(page.maxScore).toBe(1);
    expect(page.titleEligible).toBe(false);
    expect(page.title).toBeNull();
  });

  it("keeps pagination after the full rank calculation", () => {
    const first = buildTerritorialLegendPage({
      level: "arrondissement",
      territoryCode: "75105",
      now,
      actions,
      participations,
      consents,
      profiles,
      limit: 2,
    });
    expect(first.items.map((item) => item.rank)).toEqual([1, 1]);
    expect(first.nextCursor).toBeTruthy();
    const second = buildTerritorialLegendPage({
      level: "arrondissement",
      territoryCode: "75105",
      now,
      actions,
      participations,
      consents,
      profiles,
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(second.items.map((item) => item.rank)).toEqual([3]);
    expect(second.nextCursor).toBeNull();
  });

  it("supports an overseas department and region as first-class parents", () => {
    const page = buildTerritorialLegendPage({
      level: "department",
      territoryCode: "974",
      now,
      actions,
      participations,
      consents,
      profiles,
    });
    expect(page.items).toEqual([
      { rank: 1, publicLabel: "Alice", score: 1, distinctActions: 1, tied: false, tieSize: 1 },
    ]);
  });

  it("returns all tied title holders and no revoked competitor for reward reconciliation", () => {
    const winners = buildTerritorialLegendWinnerSnapshots({
      now,
      actions,
      participations,
      consents: consents.map((consent) => consent.userId === "u-b"
        ? { ...consent, enabled: false, activatedAt: null }
        : consent),
      profiles,
    });
    const arrondissementWinners = winners.filter((winner) => winner.level === "arrondissement" && winner.territoryCode === "75105");
    expect(arrondissementWinners).toHaveLength(1);
    expect(arrondissementWinners[0]).toMatchObject({ userId: "u-a", rank: 1, score: 2, tieSize: 1 });
  });
});
