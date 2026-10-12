import { describe, expect, it } from "vitest";
import { calculateSpogomiCompetitionResult, validateCompetitionItems } from "./scoring";
import type { SpogomiRegulation } from "./types";

const completeRegulation: SpogomiRegulation = {
  version: "fr-2026-validated",
  sourceReference: "partner://spogomi/fr-2026",
  status: "complete",
  teamSize: { casual: { minMembers: 2, maxMembers: 5 } },
  rounding: { decimals: 1, mode: "half_up" },
  eligibility: { minimumPresentParticipants: 1, requiresAllCategories: true },
  tiebreakers: ["sporting_score", "mass_grams"],
  penalties: [{ code: "late", label: "Retour tardif", points: 2 }],
  categories: [
    {
      code: "bottles",
      label: "Bouteilles",
      measurementKind: "count",
      unit: "objet",
      coefficient: 3,
      coefficientStatus: "confirmed",
      environmentalCategorySlug: null,
      isComplete: true,
    },
    {
      code: "mixed",
      label: "Déchets mélangés",
      measurementKind: "mass",
      unit: "g",
      coefficient: 0.5,
      coefficientStatus: "confirmed",
      environmentalCategorySlug: null,
      isComplete: true,
    },
  ],
};

describe("SPOGOMI competition engine", () => {
  it("keeps physical totals separate from the official score and preserves gram precision", () => {
    const result = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 2,
      items: [
        { categoryCode: "bottles", measurementKind: "count", unit: "objet", quantity: 4, objectCount: 4, massGrams: null, provenance: "counted" },
        { categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 12.75, massGrams: 12.75, objectCount: null, provenance: "weighed" },
      ],
      appliedPenalties: [{ code: "late", label: "Retour tardif", points: 2 }],
    });

    expect(result.officialScore).toBe(16.4);
    expect(result.physicalTotals).toEqual({ massGrams: 12.75, countedObjects: 4, presentParticipants: 2 });
    expect(result.buttsPerParticipant).toBe(2);
  });

  it("does not invent an official score without a complete validated regulation", () => {
    const result = calculateSpogomiCompetitionResult({
      regulation: { ...completeRegulation, status: "incomplete", sourceReference: null },
      presentParticipants: 2,
      items: [{ categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 12.75, massGrams: 12.75, provenance: "weighed" }],
    });
    expect(result.officialScore).toBeNull();
    expect(result.physicalTotals.massGrams).toBe(12.75);
    expect(result.scoreStatus).toBe("unavailable");
  });

  it("marks the butt ratio as non-comparable when the direct count or attendance is missing", () => {
    const result = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 0,
      items: [{ categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 10, massGrams: 10, objectCount: null, provenance: "weighed" }],
    });
    expect(result.buttsPerParticipant).toBeNull();
    expect(result.comparableForButtsPerParticipant).toBe(false);
    expect(result.officialScore).toBeNull();
  });

  it("keeps an explicit zero distinct from an unknown value", () => {
    const result = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 1,
      items: [
        { categoryCode: "bottles", measurementKind: "count", unit: "objet", quantity: 0, objectCount: 0, massGrams: 0, provenance: "counted" },
        { categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 0, massGrams: 0, objectCount: 0, provenance: "weighed" },
      ],
    });
    expect(result.physicalTotals).toEqual({ massGrams: 0, countedObjects: 0, presentParticipants: 1 });
    expect(result.buttsPerParticipant).toBe(0);
    expect(result.officialScore).toBe(0);
  });

  it("rejects unknown categories and negative physical values before persistence", () => {
    expect(validateCompetitionItems({
      regulation: completeRegulation,
      presentParticipants: 1,
      items: [{ categoryCode: "unknown", measurementKind: "mass", unit: "g", quantity: 1, provenance: "weighed" }],
    })).toEqual({ ok: false, reason: "unknown_category" });
    expect(validateCompetitionItems({
      regulation: completeRegulation,
      presentParticipants: 1,
      items: [{ categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: -1, provenance: "weighed" }],
    })).toEqual({ ok: false, reason: "quantity_must_be_a_non_negative_finite_number" });
  });
});
