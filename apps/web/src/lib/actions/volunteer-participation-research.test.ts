import { describe, expect, it } from "vitest";
import {
  CLEANWALK_YIELD_RESEARCH_STATUS,
  CLEANWALK_YIELD_RESEARCH_VERSION,
  compareCleanwalkYieldModels,
  compareRetiredWasteCoefficientSensitivity,
  simulateCleanwalkYield,
} from "./volunteer-participation-research";
import {
  EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION,
  normalizeVolunteerParticipation,
} from "./volunteer-participation";

const ordinary = {
  volunteersCount: 5,
  childrenCount: 2,
  retiredCount: 0,
  configuration: "ordinary" as const,
};

const school = {
  volunteersCount: 17,
  childrenCount: 15,
  retiredCount: 0,
  configuration: "school" as const,
};

describe("cleanwalk yield research simulator", () => {
  it("keeps the research status and version explicit", () => {
    const result = simulateCleanwalkYield({ ...ordinary, model: "A" });

    expect(result.status).toBe(CLEANWALK_YIELD_RESEARCH_STATUS);
    expect(result.version).toBe(CLEANWALK_YIELD_RESEARCH_VERSION);
    expect(result.assumptions.status).toBe("RESEARCH / NON NORMATIF");
  });

  it.each([
    { adults: 3, children: 2, retired: 0, wasteA: 4, wasteB: 4.2, buttsB: 3.8 },
    { adults: 3, children: 1, retired: 1, wasteA: 4, wasteB: 4.4, buttsB: 3.9 },
    { adults: 7, children: 2, retired: 1, wasteA: 8.5, wasteB: 9, buttsB: 8.3 },
    { adults: 10, children: 3, retired: 2, wasteA: 12.5, wasteB: 13.4, buttsB: 12.2 },
    { adults: 17, children: 4, retired: 4, wasteA: 21, wasteB: 22.6, buttsB: 20.6 },
    { adults: 16, children: 9, retired: 0, wasteA: 20.5, wasteB: 21.4, buttsB: 19.6 },
  ])("protects ordinary A/B reference compositions", (example) => {
    const input = {
      volunteersCount: example.adults + example.children + example.retired,
      childrenCount: example.children,
      retiredCount: example.retired,
      configuration: "ordinary" as const,
    };
    const result = compareCleanwalkYieldModels(input);

    expect(result.results.A.capacities.waste.value).toBeCloseTo(example.wasteA);
    expect(result.results.A.capacities.cigaretteButts.value).toBeCloseTo(example.wasteA);
    expect(result.results.B.capacities.waste.value).toBeCloseTo(example.wasteB);
    expect(result.results.B.capacities.cigaretteButts.value).toBeCloseTo(example.buttsB);
  });

  it.each([
    { children: 15, adults: 2, a: 9.5, bWaste: 11, cWaste: 8.75, bButts: 8, cButts: 2 },
    { children: 25, adults: 3, a: 15.5, bWaste: 18, cWaste: 14.25, bButts: 11.5, cButts: 3 },
    { children: 30, adults: 3, a: 18, bWaste: 21, cWaste: 16.5, bButts: 13.5, cButts: 3 },
  ])("protects school reference compositions and assignments", (example) => {
    const input = {
      volunteersCount: example.children + example.adults,
      childrenCount: example.children,
      retiredCount: 0,
      configuration: "school" as const,
      cigaretteButtCollectors: {
        count: example.adults,
        basis: "HYPOTHESIS" as const,
        hypothesis: "ALL_ADULTS" as const,
      },
    };
    const result = compareCleanwalkYieldModels(input);

    expect(result.results.A.capacities.waste.value).toBe(example.a);
    expect(result.results.A.capacities.cigaretteButts.value).toBe(example.a);
    expect(result.results.B.availability).toBe("NOT_APPLICABLE");
    expect(result.results.C.capacities.waste.value).toBe(example.cWaste);
    expect(result.results.C.capacities.cigaretteButts.value).toBe(example.cButts);
    expect(result.results.C.assumptions.cigaretteButtCollectors?.basis).toBe(
      "HYPOTHESIS",
    );
  });

  it("does not select a model from group size or configuration implicitly", () => {
    const familyResult = simulateCleanwalkYield({
      volunteersCount: 25,
      childrenCount: 20,
      retiredCount: 0,
      configuration: "family",
      model: "B",
    });
    const schoolResult = simulateCleanwalkYield({
      volunteersCount: 25,
      childrenCount: 20,
      retiredCount: 0,
      configuration: "school",
      model: "C",
    });

    expect(familyResult.availability).toBe("AVAILABLE");
    expect(schoolResult.availability).toBe("AVAILABLE");
    expect(familyResult.model).toBe("B");
    expect(schoolResult.model).toBe("C");
  });

  it("keeps family and school configurations distinct at the same size", () => {
    const family = simulateCleanwalkYield({
      volunteersCount: 25,
      childrenCount: 20,
      retiredCount: 0,
      configuration: "family",
      model: "C",
    });
    const school = simulateCleanwalkYield({
      volunteersCount: 25,
      childrenCount: 20,
      retiredCount: 0,
      configuration: "school",
      model: "C",
    });

    expect(family.availability).toBe("NOT_APPLICABLE");
    expect(school.availability).toBe("AVAILABLE");
  });

  it.each([
    { volunteersCount: 5, childrenCount: 6, retiredCount: 0 },
    { volunteersCount: 5, childrenCount: 1.5, retiredCount: 0 },
    { volunteersCount: 5, childrenCount: Number.NaN, retiredCount: 0 },
    { volunteersCount: 5, childrenCount: 1, retiredCount: Number.POSITIVE_INFINITY },
    { volunteersCount: 5, childrenCount: -1, retiredCount: 0 },
  ])("rejects incoherent, fractional, NaN, infinite and negative compositions", (input) => {
    const result = simulateCleanwalkYield({
      ...input,
      configuration: "ordinary",
      model: "A",
    });

    expect(result.availability).toBe("INVALID_INPUT");
    expect(result.composition).toBeNull();
    expect(result.capacities.waste.value).toBeNull();
  });

  it("keeps explicit zero assignment distinct from missing assignment", () => {
    const missing = simulateCleanwalkYield({ ...school, model: "C" });
    const zero = simulateCleanwalkYield({
      ...school,
      model: "C",
      cigaretteButtCollectors: { count: 0, basis: "OBSERVED" },
      effectiveCollectionHours: 1,
    });

    expect(missing.capacities.cigaretteButts.availability).toBe(
      "MISSING_ASSIGNMENT",
    );
    expect(zero.capacities.cigaretteButts.value).toBe(0);
    expect(zero.projections.cigaretteButts.availability).toBe(
      "MISSING_REFERENCE_RATE",
    );
  });

  it.each([
    { count: 2, basis: "OBSERVED" as const },
    { count: 1, basis: "HYPOTHESIS" as const, hypothesis: "EXPLICIT" as const },
  ])("uses only explicitly assigned adult cigarette collectors", (assignment) => {
    const result = simulateCleanwalkYield({
      ...school,
      model: "C",
      cigaretteButtCollectors: assignment,
    });

    expect(result.capacities.cigaretteButts.value).toBe(assignment.count);
    expect(result.capacities.cigaretteButts.basis).toBe("ASSIGNED");
  });

  it("rejects an assignment above the number of adults", () => {
    const result = simulateCleanwalkYield({
      ...school,
      model: "C",
      cigaretteButtCollectors: { count: 3, basis: "OBSERVED" },
    });

    expect(result.capacities.cigaretteButts.availability).toBe("INVALID_INPUT");
  });

  it("marks school C with retired participants as non-applicable", () => {
    const result = simulateCleanwalkYield({
      volunteersCount: 18,
      childrenCount: 15,
      retiredCount: 1,
      configuration: "school",
      model: "C",
    });

    expect(result.availability).toBe("NOT_APPLICABLE");
    expect(result.reason).toMatch(/retraités/);
  });

  it("projects only with explicit rates and effective duration", () => {
    const result = simulateCleanwalkYield({
      ...ordinary,
      model: "B",
      effectiveCollectionHours: 2,
      referenceRates: {
        wasteKgPerUnitHour: 1.25,
        cigaretteButtsPerUnitHour: 10,
      },
    });

    expect(result.projections.waste.value).toBe(10.5);
    expect(result.projections.cigaretteButts.value).toBe(76);
    expect(result.projections.waste.unit).toBe("kg");
    expect(result.projections.cigaretteButts.unit).toBe("cigarette-butts");
  });

  it.each([
    { effectiveCollectionHours: null, status: "MISSING_DURATION" },
    { effectiveCollectionHours: -1, status: "INVALID_DURATION" },
    { effectiveCollectionHours: Number.NaN, status: "INVALID_DURATION" },
  ])("does not reconstruct an unknown or invalid duration", (example) => {
    const result = simulateCleanwalkYield({
      ...ordinary,
      model: "A",
      effectiveCollectionHours: example.effectiveCollectionHours,
      referenceRates: { wasteKgPerUnitHour: 1 },
    });

    expect(result.projections.waste.availability).toBe(example.status);
    expect(result.projections.waste.value).toBeNull();
  });

  it.each([
    { wasteKgPerUnitHour: null, status: "MISSING_REFERENCE_RATE" },
    { wasteKgPerUnitHour: -1, status: "INVALID_REFERENCE_RATE" },
    { wasteKgPerUnitHour: Number.POSITIVE_INFINITY, status: "INVALID_REFERENCE_RATE" },
  ])("does not invent or accept invalid reference yields", (example) => {
    const result = simulateCleanwalkYield({
      ...ordinary,
      model: "A",
      effectiveCollectionHours: 1,
      referenceRates: { wasteKgPerUnitHour: example.wasteKgPerUnitHour },
    });

    expect(result.projections.waste.availability).toBe(example.status);
    expect(result.projections.waste.value).toBeNull();
  });

  it("keeps explicit zero duration and zero rate as zero projections", () => {
    const result = simulateCleanwalkYield({
      ...ordinary,
      model: "A",
      effectiveCollectionHours: 0,
      referenceRates: { wasteKgPerUnitHour: 0 },
    });

    expect(result.projections.waste.availability).toBe("AVAILABLE");
    expect(result.projections.waste.value).toBe(0);
  });

  it("reports absolute and relative differences from A without dividing by zero", () => {
    const comparison = compareCleanwalkYieldModels({
      ...ordinary,
      effectiveCollectionHours: 1,
      referenceRates: { wasteKgPerUnitHour: 1 },
    });
    const b = comparison.capacities.waste.find((entry) => entry.model === "B");

    expect(b?.model).toBe("B");
    expect(b?.value).toBeCloseTo(4.2);
    expect(b?.absoluteDifferenceFromA).toBeCloseTo(0.2);
    expect(b?.relativeDifferenceFromA).toBeCloseTo(0.05);
  });

  it("keeps unavailable scenario values out of comparisons", () => {
    const comparison = compareCleanwalkYieldModels({ ...school });
    const bWaste = comparison.capacities.waste.find((entry) => entry.model === "B");
    const cButts = comparison.capacities.cigaretteButts.find((entry) => entry.model === "C");

    expect(bWaste?.value).toBeNull();
    expect(bWaste?.absoluteDifferenceFromA).toBeNull();
    expect(cButts?.value).toBeNull();
  });

  it("supports retired-waste sensitivity without applying it to cigarette butts", () => {
    const sensitivity = compareRetiredWasteCoefficientSensitivity({
      volunteersCount: 6,
      childrenCount: 1,
      retiredCount: 2,
      configuration: "ordinary",
      model: "B",
    });

    expect(sensitivity.coefficientValues).toEqual([0.5, 0.8, 1]);
    expect(sensitivity.results.map((entry) => entry.value)).toEqual([4.6, 5.2, 5.6]);
    expect(sensitivity.task).toBe("waste");
  });

  it("marks invalid sensitivity coefficients without changing the model", () => {
    const sensitivity = compareRetiredWasteCoefficientSensitivity({
      ...ordinary,
      model: "A",
      retiredCoefficients: [0.5, Number.NaN, -1],
    });

    expect(sensitivity.model).toBe("A");
    expect(sensitivity.results[0].value).toBe(4);
    expect(sensitivity.results[1].availability).toBe("INVALID_COEFFICIENT");
    expect(sensitivity.results[2].availability).toBe("INVALID_COEFFICIENT");
  });

  it("preserves the canonical CURRENT formula independently of research models", () => {
    const current = normalizeVolunteerParticipation({
      childrenCount: 2,
      adultCount: 3,
      retiredCount: 1,
    });
    const research = simulateCleanwalkYield({
      volunteersCount: 6,
      childrenCount: 2,
      retiredCount: 1,
      configuration: "ordinary",
      model: "A",
    });

    expect(current.effectiveVolunteerUnits).toBe(4.5);
    expect(current.effectiveVolunteerUnitsFormulaVersion).toBe(
      EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION,
    );
    expect(research.capacities.waste.value).toBe(current.effectiveVolunteerUnits);
    expect(research.capacities.cigaretteButts.value).toBe(
      current.effectiveVolunteerUnits,
    );
  });
});
