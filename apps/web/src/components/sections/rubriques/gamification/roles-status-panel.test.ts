import { describe, expect, it } from "vitest";
import { buildRoleStatusCards } from "./roles-status-panel";
import type { ContributorRecognitionCard } from "@/lib/gamification/progression-types";

function makeContributor(
  overrides: Partial<ContributorRecognitionCard> = {},
): ContributorRecognitionCard {
  return {
    userId: "user-1",
    actorName: "Alice",
    associationName: "Association Terre",
    verifiedContributions: 1,
    qualityAverage: 78,
    topZone: "12e",
    contributionType: "terrain" as const,
    regularityLabel: "Régulier",
    activeMonths: 1,
    mentorEligible: false,
    lastContributionDate: "2026-01-01",
    highlight: "1 contribution vérifiée",
    thanksMessage: "Merci",
    badges: ["Contributeur utile"],
    score: 12,
    ...overrides,
  };
}

describe("buildRoleStatusCards", () => {
  it("keeps observateur active when there is no contributor profile", () => {
    const cards = buildRoleStatusCards(null);

    expect(cards.find((card) => card.key === "observateur")?.unlocked).toBe(true);
    expect(cards.find((card) => card.key === "contributeur")?.unlocked).toBe(false);
  });

  it("progresses to referent and mentor from contribution data", () => {
    const referentCards = buildRoleStatusCards(
      makeContributor({
        verifiedContributions: 4,
        activeMonths: 2,
        mentorEligible: false,
      }),
    );

    expect(referentCards.find((card) => card.key === "contributeur")?.unlocked).toBe(true);
    expect(referentCards.find((card) => card.key === "referent")?.unlocked).toBe(true);
    expect(referentCards.find((card) => card.key === "mentor")?.unlocked).toBe(false);

    const mentorCards = buildRoleStatusCards(
      makeContributor({
        verifiedContributions: 8,
        activeMonths: 4,
        mentorEligible: true,
      }),
    );

    expect(mentorCards.find((card) => card.key === "mentor")?.unlocked).toBe(true);
    expect(mentorCards.find((card) => card.key === "coordinateur")?.unlocked).toBe(false);
  });

  it("reaches coordinator only on coordination-heavy profiles", () => {
    const cards = buildRoleStatusCards(
      makeContributor({
        contributionType: "coordination",
        verifiedContributions: 14,
        activeMonths: 6,
        mentorEligible: true,
      }),
    );

    expect(cards.find((card) => card.key === "coordinateur")?.unlocked).toBe(true);
    expect(cards.filter((card) => card.unlocked).map((card) => card.key)).toEqual([
      "observateur",
      "contributeur",
      "referent",
      "mentor",
      "coordinateur",
    ]);
  });
});
