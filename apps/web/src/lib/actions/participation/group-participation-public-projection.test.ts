import { describe, expect, it } from "vitest";
import { buildPublicActionPracticalInformation } from "./group-participation-public-projection";

describe("public action practical information", () => {
  it("keeps organizer text separate from canonical waste recommendations", () => {
    const result = buildPublicActionPracticalInformation({
      accessibility: "Accès par la rampe nord.",
      accessibilityStatus: "conditions_reported",
      safetyInstructions: "Rester en binôme.",
      recommendedMaterials: "Gants et sacs.",
      materialsProvided: "Pinces disponibles.",
      suggestedMaterials: ["gloves", "grabbers"],
      participantMessage: "Rendez-vous devant la grille.",
      expectedWasteCategories: ["battery"],
      logisticsNotes: "Note privée de l’organisateur.",
      checklistBeforeDeparture: "Checklist interne.",
    });

    expect(result.accessibility).toBe("Accès par la rampe nord.");
    expect(result.safetyInstructions).toBe("Rester en binôme.");
    expect(result.materialsToBring).toBe("Gants et sacs.");
    expect(result.materialsProvided).toBe("Pinces disponibles.");
    expect(result.suggestedMaterials).toEqual(["Gants", "Pinces"]);
    expect(result.accessibilityStatus).toBe("conditions_reported");
    expect(result.participantMessage).toBe("Rendez-vous devant la grille.");
    expect(result.derivedSafetyRecommendations.length).toBeGreaterThan(0);
    expect(result.derivedMaterials.length).toBeGreaterThan(0);
    expect(result).not.toHaveProperty("logisticsNotes");
    expect(result).not.toHaveProperty("checklistBeforeDeparture");
  });

  it("returns explicit empty values for legacy actions without structured preparation", () => {
    expect(buildPublicActionPracticalInformation(undefined)).toEqual({
      accessibility: null,
      accessibilityStatus: null,
      safetyInstructions: null,
      derivedSafetyRecommendations: [],
      materialsToBring: null,
      derivedMaterials: [],
      materialsProvided: null,
      suggestedMaterials: [],
      participantMessage: null,
    });
  });
});
