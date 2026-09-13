import { describe, expect, it } from "vitest";
import {
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
      differencePercent: null,
    });
  });

  it("accepts twenty percent and warns only above the threshold", () => {
    expect(
      compareWasteBreakdownToTotal(10, {
        recyclablesKg: 8,
        glassKg: 0,
        householdWasteKg: 0,
        otherWasteKg: 0,
      }),
    ).toEqual({
      status: "coherent",
      totalBreakdownKg: 8,
      differencePercent: 20,
    });
    expect(
      compareWasteBreakdownToTotal(10, {
        recyclablesKg: 7,
        glassKg: 0,
        householdWasteKg: 0,
        otherWasteKg: 0,
      }).status,
    ).toBe("warning");
  });
});
