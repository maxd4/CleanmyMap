import { describe, expect, it } from "vitest";
import {
  buildImpactTerrain2026PublicResults,
  buildImpactTerrain2026PublicResultsFromActions,
  buildImpactTerrain2026PublicResultsFromAggregate,
} from "./impact-terrain-2026-results";

describe("Impact terrain 2026 public results", () => {
  it("converts waste into 50 L bags and mechanical Vélib' equivalents", () => {
    expect(
      buildImpactTerrain2026PublicResults({ wasteKg: 10 }),
    ).toMatchObject({
      wasteKg: 10,
      wasteBagsEquivalent: 2,
      wasteMechanicalBicyclesEquivalent: 0.5,
    });
    expect(buildImpactTerrain2026PublicResults({ wasteKg: 0 })).toMatchObject({
      wasteBagsEquivalent: 0,
      wasteMechanicalBicyclesEquivalent: 0,
    });
    expect(
      buildImpactTerrain2026PublicResults({ wasteKg: 2.5 }),
    ).toMatchObject({
      wasteBagsEquivalent: 0.5,
      wasteMechanicalBicyclesEquivalent: 0.125,
    });
  });

  it("keeps only non-zero qualified butt conditions and tracks unqualified data", () => {
    const result = buildImpactTerrain2026PublicResults({
      buttsTotal: 1_000,
      qualifiedButtsByCondition: { propre: 100, humide: 200, mouille: 0 },
    });

    expect(result.buttsByCondition).toEqual([
      expect.objectContaining({ condition: "propre", count: 100 }),
      expect.objectContaining({ condition: "humide", count: 200 }),
    ]);
    expect(result.qualifiedButtsTotal).toBe(300);
    expect(result.unqualifiedButtsTotal).toBe(700);
    expect(result.buttsByCondition.some((entry) => entry.count === 0)).toBe(false);
    expect(result.estimatedButtsWeightKg).toBeCloseTo(
      100 / 2_500 + 200 / (2_500 * 0.7),
      10,
    );
    expect(result.buttsDistanceMeters).toBe(25);
  });

  it("uses the qualified condition in the canonical action mass result", () => {
    const result = buildImpactTerrain2026PublicResultsFromActions([
      {
        wasteKg: 0,
        cigaretteButts: 700,
        wasteBreakdown: { megotsCondition: "mouille" },
      },
      {
        wasteKg: 0,
        cigaretteButts: 300,
        wasteBreakdown: null,
      },
    ]);

    expect(result.buttsTotal).toBe(1_000);
    expect(result.qualifiedButtsTotal).toBe(700);
    expect(result.unqualifiedButtsTotal).toBe(300);
    expect(result.estimatedButtsWeightKg).toBeCloseTo(700 / (2_500 * 0.4), 10);
  });

  it("normalizes the structured RPC result without inventing a condition", () => {
    const result = buildImpactTerrain2026PublicResultsFromAggregate({
      wasteKg: "20",
      cigaretteButts: "500",
      buttsByCondition: [
        { condition: "propre", count: 100 },
        { condition: "unknown", count: 400 },
        { condition: "humide", count: 0 },
      ],
    });

    expect(result.buttsByCondition).toEqual([
      expect.objectContaining({ condition: "propre", count: 100 }),
    ]);
    expect(result.unqualifiedButtsTotal).toBe(400);
    expect(result.estimatedButtsWeightKg).toBeCloseTo(100 / 2_500, 10);
    expect(
      buildImpactTerrain2026PublicResultsFromAggregate({
        cigaretteButts: "400",
        buttsByCondition: [{ condition: "unknown", count: 400 }],
      }).estimatedButtsWeightKg,
    ).toBeNull();
  });
});
