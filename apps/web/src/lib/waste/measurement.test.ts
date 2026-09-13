import { describe, expect, it } from "vitest";
import {
  ACTION_WASTE_MASS_RESOLUTION_KG,
  ACTION_WASTE_MEASUREMENT_METHODS,
  compareWasteBreakdownToTotal,
} from "./measurement";

describe("canonical waste measurement contract", () => {
  it("exposes the five optional field measurement methods", () => {
    expect(ACTION_WASTE_MEASUREMENT_METHODS).toEqual([
      "balance_suspendue",
      "balance_au_sol",
      "estimation_visuelle",
      "autre",
      "inconnue",
    ]);
  });

  it("keeps NULL distinct from an explicit zero", () => {
    expect(
      compareWasteBreakdownToTotal(0, {
        recyclablesKg: 0,
        glassKg: 0,
        householdWasteKg: 0,
        otherWasteKg: 0,
      }).status,
    ).toBe("coherent");
    expect(
      compareWasteBreakdownToTotal(0, {
        recyclablesKg: null,
        glassKg: 0,
        householdWasteKg: 0,
        otherWasteKg: 0,
      }).status,
    ).toBe("not_comparable");
  });

  it("does not compare a partial breakdown or turn unknown categories into zero", () => {
    expect(
      compareWasteBreakdownToTotal(10, {
        recyclablesKg: 10,
        glassKg: null,
        householdWasteKg: null,
        otherWasteKg: null,
      }),
    ).toEqual({
      status: "not_comparable",
      totalBreakdownKg: null,
      differenceKg: null,
      differencePercent: null,
    });
  });

  it("uses overlapping quantification intervals instead of a percentage threshold", () => {
    expect(
      compareWasteBreakdownToTotal(0.1, {
        recyclablesKg: 0.2,
        glassKg: 0,
        householdWasteKg: 0,
        otherWasteKg: 0,
      }),
    ).toEqual({
      status: "coherent",
      totalBreakdownKg: 0.2,
      differenceKg: 0.1,
      differencePercent: 100,
    });
    expect(
      compareWasteBreakdownToTotal(10, {
        recyclablesKg: 8.8,
        glassKg: 0,
        householdWasteKg: 0,
        otherWasteKg: 0,
      }).status,
    ).toBe("warning");
  });

  it("keeps a small exact discrepancy coherent when the declared precision permits it", () => {
    const result = compareWasteBreakdownToTotal(10, {
      recyclablesKg: 9.9,
      glassKg: 0,
      householdWasteKg: 0,
      otherWasteKg: 0,
    });

    expect(result.status).toBe("coherent");
    expect(result.totalBreakdownKg).toBe(9.9);
    expect(result.differenceKg).toBeCloseTo(0.1, 10);
    expect(result.differencePercent).toBeCloseTo(1, 10);
  });

  it("adapts when the declared resolution changes without introducing a percentage rule", () => {
    expect(
      compareWasteBreakdownToTotal(10, {
        recyclablesKg: 9.9,
        glassKg: 0,
        householdWasteKg: 0,
        otherWasteKg: 0,
      }, { resolutionKg: 0.01 }).status,
    ).toBe("warning");
    expect(ACTION_WASTE_MASS_RESOLUTION_KG).toBe(0.1);
  });

  it("keeps the relative difference informative without using it as the status rule", () => {
    const result = compareWasteBreakdownToTotal(100, {
      recyclablesKg: 99,
      glassKg: 0,
      householdWasteKg: 0,
      otherWasteKg: 0,
    });

    expect(result.differencePercent).toBe(1);
    expect(result.status).toBe("warning");
  });
});
