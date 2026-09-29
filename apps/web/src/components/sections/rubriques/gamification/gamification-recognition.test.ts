import { describe, expect, it } from "vitest";
import type { MeResponse } from "./gamification-types";
import { buildPersonalRecognitionCards } from "./gamification-recognition";

describe("personal gamification recognition", () => {
  it("has an explicit empty state when no contributor is available", () => {
    expect(buildPersonalRecognitionCards(undefined, true)).toEqual([]);
  });

  it("keeps lifetime and annual recognition visibly distinct", () => {
    const progression = {
      recognition: {
        currentContributor: {
          userId: "user-1",
          actorName: "Alice",
          associationName: "Les Rives",
          verifiedContributions: 8,
          qualityAverage: 90,
          topZone: "Paris 12e",
          contributionType: "terrain",
          regularityLabel: "Régulier",
          activeMonths: 4,
          mentorEligible: true,
          lastContributionDate: "2026-09-20",
          highlight: "Contribution vérifiée.",
          thanksMessage: "Merci.",
          badges: ["Terrain vérifié"],
          score: 90,
        },
      },
      annualRecognition: {
        currentContributor: {
          userId: "user-1",
          actorName: "Alice",
          associationName: "Les Rives",
          verifiedContributions: 3,
          qualityAverage: 82,
          topZone: "Paris 12e",
          contributionType: "coordination",
          regularityLabel: "En continuité",
          activeMonths: 2,
          mentorEligible: false,
          lastContributionDate: "2026-09-20",
          highlight: "Contribution annuelle.",
          thanksMessage: "Merci encore.",
          badges: ["Coordination vérifiée"],
          score: 70,
        },
      },
    } as unknown as MeResponse["progression"];

    const cards = buildPersonalRecognitionCards(progression, true);
    expect(cards.map((entry) => entry.label)).toEqual(["Depuis toujours", "Année en cours"]);
    expect(cards[0]?.card.mentorEligible).toBe(true);
    expect(cards[1]?.card.mentorEligible).toBe(false);
  });
});
