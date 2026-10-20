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
      code: "butts",
      label: "Mégots",
      measurementKind: "count",
      unit: "objet",
      coefficient: 1,
      coefficientStatus: "confirmed",
      environmentalCategorySlug: "cigarette_butt",
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
  it.each([
    { mode: "half_up" as const, expected: 1.3 },
    { mode: "down" as const, expected: 1.2 },
    { mode: "up" as const, expected: 1.3 },
  ])("applies the configured $mode rounding rule without changing gram precision", ({ mode, expected }) => {
    const regulation = { ...completeRegulation, rounding: { decimals: 1, mode } };
    const result = calculateSpogomiCompetitionResult({
      regulation,
      presentParticipants: 1,
      submissionStatus: "certified",
      items: [
        { categoryCode: "bottles", measurementKind: "count", unit: "objet", quantity: 0, objectCount: 0, massGrams: null, provenance: "counted" },
        { categoryCode: "butts", measurementKind: "count", unit: "objet", quantity: 0, objectCount: 0, massGrams: null, provenance: "counted" },
        { categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 2.5, massGrams: 2.5, objectCount: null, provenance: "weighed" },
      ],
    });
    expect(result.officialScore).toBe(expected);
    expect(result.physicalTotals.massGrams).toBe(2.5);
    expect(result.scoreStatus).toBe("official");
  });

  it("rounds half_up away from zero when penalties exceed the synthetic score", () => {
    const regulation = { ...completeRegulation, rounding: { decimals: 1, mode: "half_up" as const } };
    const result = calculateSpogomiCompetitionResult({
      regulation,
      presentParticipants: 1,
      submissionStatus: "certified",
      appliedPenalties: [{ code: "synthetic", label: "Synthetic penalty", points: 2.5 }],
      items: [
        { categoryCode: "bottles", measurementKind: "count", unit: "objet", quantity: 0, objectCount: 0, massGrams: null, provenance: "counted" },
        { categoryCode: "butts", measurementKind: "count", unit: "objet", quantity: 0, objectCount: 0, massGrams: null, provenance: "counted" },
        { categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 1.25, massGrams: 1.25, objectCount: null, provenance: "weighed" },
      ],
    });
    expect(result.officialScore).toBe(-1.9);
  });

  it.each([
    ["status", { status: "incomplete" as const }],
    ["source", { sourceReference: null }],
    ["rounding", { rounding: undefined }],
    ["eligibility", { eligibility: undefined }],
    ["tiebreakers", { tiebreakers: undefined }],
    ["category completeness", { categories: completeRegulation.categories.map((category) => ({ ...category, isComplete: false })) }],
    ["coefficient confirmation", { categories: completeRegulation.categories.map((category) => ({ ...category, coefficientStatus: "unknown" as const })) }],
    ["penalty definition", { penalties: [{ code: "late", label: "Retour tardif", points: Number.NaN }] }],
  ])("keeps the official score unavailable when the regulation %s is incomplete", (_name, change) => {
    const result = calculateSpogomiCompetitionResult({
      regulation: { ...completeRegulation, ...change },
      presentParticipants: 1,
      submissionStatus: "certified",
      items: [{ categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 12.75, massGrams: 12.75, provenance: "weighed" }],
    });
    expect(result.officialScore).toBeNull();
    expect(result.scoreStatus).toBe("unavailable");
  });

  it("does not certify a result when every configured category is not measured", () => {
    const result = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 1,
      submissionStatus: "certified",
      items: [{ categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 12.75, massGrams: 12.75, provenance: "weighed" }],
    });
    expect(result).toMatchObject({ officialScore: null, scoreStatus: "unavailable", ineligibleReason: "all_categories_required" });
  });

  it.each([
    [{ categoryCode: "mixed", measurementKind: "mass" as const, unit: "kg", quantity: 1, provenance: "weighed" }, "measurement_unit_must_match_category"],
    [{ categoryCode: "bottles", measurementKind: "count" as const, unit: "objet", quantity: 1.5, provenance: "counted" }, "count_must_be_an_integer"],
    [{ categoryCode: "mixed", measurementKind: "mass" as const, unit: "g", quantity: Number.NaN, provenance: "weighed" }, "quantity_must_be_a_non_negative_finite_number"],
    [{ categoryCode: "mixed", measurementKind: "mass" as const, unit: "g", quantity: 1, massGrams: Number.POSITIVE_INFINITY, provenance: "weighed" }, "mass_grams_must_be_non_negative_and_bounded"],
    [{ categoryCode: "mixed", measurementKind: "mass" as const, unit: "g", quantity: 1, objectCount: 1.5, provenance: "weighed" }, "object_count_must_be_a_non_negative_integer"],
  ])("rejects invalid measured values before an official score can be produced", (item, reason) => {
    expect(validateCompetitionItems({ regulation: completeRegulation, presentParticipants: 1, items: [item] })).toEqual({ ok: false, reason });
  });

  it("keeps physical totals separate from the official score and preserves gram precision", () => {
    const result = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 2,
      items: [
        { categoryCode: "bottles", measurementKind: "count", unit: "objet", quantity: 4, objectCount: 4, massGrams: null, provenance: "counted" },
        { categoryCode: "butts", measurementKind: "count", unit: "objet", quantity: 3, objectCount: 3, massGrams: null, provenance: "counted" },
        { categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 12.75, massGrams: 12.75, objectCount: null, provenance: "weighed" },
      ],
      appliedPenalties: [{ code: "late", label: "Retour tardif", points: 2 }],
    });

    expect(result.officialScore).toBe(19.4);
    expect(result.physicalTotals).toEqual({ massGrams: 12.75, countedObjects: 7, countedButts: 3, buttMassGrams: null, presentParticipants: 2 });
    expect(result.buttsPerParticipant).toBe(1.5);
    expect(result.scoreStatus).toBe("preview");
  });

  it("counts only the canonical cigarette-butt category in the butt ratio", () => {
    const result = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 2,
      items: [
        { categoryCode: "bottles", measurementKind: "count", unit: "objet", quantity: 4, objectCount: 4, provenance: "counted" },
        { categoryCode: "butts", measurementKind: "count", unit: "objet", quantity: 2, objectCount: 2, provenance: "counted" },
      ],
    });
    expect(result.physicalTotals.countedObjects).toBe(6);
    expect(result.physicalTotals.countedButts).toBe(2);
    expect(result.buttsPerParticipant).toBe(1);
  });

  it("marks a score as official only for a certified submission", () => {
    const result = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 1,
      submissionStatus: "certified",
      items: [
        { categoryCode: "bottles", measurementKind: "count", unit: "objet", quantity: 0, objectCount: 0, provenance: "counted" },
        { categoryCode: "butts", measurementKind: "count", unit: "objet", quantity: 2, objectCount: 2, provenance: "counted" },
        { categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 0, massGrams: 0, provenance: "weighed" },
      ],
    });
    expect(result.scoreStatus).toBe("official");
  });

  it("does not treat non-butt objects as butts and marks an absent butt measure non-comparable", () => {
    const result = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 2,
      items: [{ categoryCode: "bottles", measurementKind: "count", unit: "objet", quantity: 4, objectCount: 4, provenance: "counted" }],
    });
    expect(result.physicalTotals.countedObjects).toBe(4);
    expect(result.physicalTotals.countedButts).toBeNull();
    expect(result.buttsPerParticipant).toBeNull();
  });

  it("marks the ratio non-comparable when verified attendance is not strictly positive", () => {
    const result = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 0,
      items: [{ categoryCode: "butts", measurementKind: "count", unit: "objet", quantity: 4, objectCount: 4, provenance: "counted" }],
    });
    expect(result.physicalTotals.countedButts).toBe(4);
    expect(result.buttsPerParticipant).toBeNull();
    expect(result.comparableForButtsPerParticipant).toBe(false);
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
        { categoryCode: "butts", measurementKind: "count", unit: "objet", quantity: 0, objectCount: 0, massGrams: 0, provenance: "counted" },
        { categoryCode: "mixed", measurementKind: "mass", unit: "g", quantity: 0, massGrams: 0, objectCount: 0, provenance: "weighed" },
      ],
    });
    expect(result.physicalTotals).toEqual({ massGrams: 0, countedObjects: 0, countedButts: 0, buttMassGrams: 0, presentParticipants: 1 });
    expect(result.buttsPerParticipant).toBe(0);
    expect(result.officialScore).toBe(0);
  });

  it("keeps an unknown butt count distinct from an observed zero", () => {
    const unknown = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 1,
      items: [{ categoryCode: "butts", measurementKind: "count", unit: "objet", quantity: null, objectCount: null, provenance: "not counted" }],
    });
    const zero = calculateSpogomiCompetitionResult({
      regulation: completeRegulation,
      presentParticipants: 1,
      items: [{ categoryCode: "butts", measurementKind: "count", unit: "objet", quantity: 0, objectCount: 0, massGrams: 0, provenance: "counted" }],
    });
    expect(unknown.physicalTotals.countedButts).toBeNull();
    expect(unknown.buttsPerParticipant).toBeNull();
    expect(zero.physicalTotals.countedButts).toBe(0);
    expect(zero.buttsPerParticipant).toBe(0);
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
