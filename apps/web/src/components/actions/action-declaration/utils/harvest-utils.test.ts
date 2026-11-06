import { describe, expect, it } from "vitest";

import {
  deriveWasteComparison,
  extendHarvestSliderMax,
  formatSignedPercent,
  resolveHarvestSliderMax,
} from "./harvest-utils";

describe("signed comparison percentages", () => {
  it.each([
    [12, "+12%"],
    [5, "+5%"],
    [5.1, "+5,1%"],
    [5.01, "+5,01%"],
    [-5, "-5%"],
    [-5.1, "-5,1%"],
    [0, "0%"],
  ])("keeps the displayed percentage consistent with the threshold (%s)", (value, expected) => {
    expect(formatSignedPercent(value)).toBe(expected);
  });
});

describe("harvest measurement slider ranges", () => {
  it.each([
    [null, 20],
    [0, 20],
    [20, 20],
    [20.1, 40],
    [40, 40],
    [41, 60],
  ])("keeps a waste value reachable without clipping (%s kg -> %s kg)", (value, expected) => {
    expect(resolveHarvestSliderMax(value, 20, 20, 100_000)).toBe(expected);
  });

  it.each([
    [null, 5_000],
    [5_000, 5_000],
    [5_001, 10_000],
    [10_001, 15_000],
    [5_000_000, 5_000_000],
  ])("keeps a butt count reachable without clipping (%s -> %s)", (value, expected) => {
    expect(resolveHarvestSliderMax(value, 5_000, 5_000, 5_000_000)).toBe(expected);
  });

  it("extends only when the current upper bound is reached", () => {
    expect(extendHarvestSliderMax(20, 19.9, 20, 100_000)).toBe(20);
    expect(extendHarvestSliderMax(20, 20, 20, 100_000)).toBe(40);
    expect(extendHarvestSliderMax(5_000_000, 5_000_000, 5_000, 5_000_000)).toBe(5_000_000);
  });
});

describe("deriveWasteComparison", () => {
  const reference = {
    benchmarkPerVolunteer: 8,
    benchmarkSourceCount: 12,
  };

  it("calculates a negative delta below the observed reference", () => {
    expect(
      deriveWasteComparison({ wasteKg: 4, volunteersCount: 1, ...reference }),
    ).toEqual({
      currentPerVolunteer: 4,
      benchmarkPerVolunteer: 8,
      deltaPercent: -50,
        tone: "slate",
    });
  });

  it("keeps a near-reference result neutral", () => {
    const result = deriveWasteComparison({ wasteKg: 8.1, volunteersCount: 1, ...reference });

    expect(result.currentPerVolunteer).toBe(8.1);
    expect(result.benchmarkPerVolunteer).toBe(8);
    expect(result.deltaPercent).toBeCloseTo(1.25, 10);
    expect(result.tone).toBe("slate");
  });

  it("calculates an above-reference delta after normalizing by volunteers", () => {
    expect(
      deriveWasteComparison({ wasteKg: 24, volunteersCount: 2, ...reference }),
    ).toMatchObject({
      currentPerVolunteer: 12,
      benchmarkPerVolunteer: 8,
      deltaPercent: 50,
      tone: "slate",
    });
  });

  it("uses the contextual operational-unit denominator when provided", () => {
    expect(
      deriveWasteComparison({
        wasteKg: 24,
        volunteersCount: 12,
        operationalUnits: 4,
        ...reference,
      }),
    ).toMatchObject({
      currentPerVolunteer: 6,
      benchmarkPerVolunteer: 8,
      deltaPercent: -25,
    });
  });

  it.each([0.45, 0.5, 1])("accepts a finite fractional or unit denominator (%s)", (operationalUnits) => {
    expect(
      deriveWasteComparison({
        wasteKg: operationalUnits,
        volunteersCount: 12,
        operationalUnits,
        ...reference,
      }),
    ).toMatchObject({ currentPerVolunteer: 1, benchmarkPerVolunteer: 8, deltaPercent: -87.5 });
  });

  it("keeps an explicit zero as a valid comparison value", () => {
    expect(
      deriveWasteComparison({ wasteKg: 0, volunteersCount: 2, ...reference }),
    ).toMatchObject({
      currentPerVolunteer: 0,
      deltaPercent: -100,
      tone: "slate",
    });
  });

  it("keeps a zero contextual reference without inventing a percentage", () => {
    expect(
      deriveWasteComparison({
        wasteKg: 3,
        volunteersCount: 12,
        operationalUnits: 0.5,
        benchmarkPerVolunteer: 0,
        benchmarkSourceCount: 2,
      }),
    ).toEqual({
      currentPerVolunteer: 6,
      benchmarkPerVolunteer: 0,
      deltaPercent: null,
      tone: "slate",
    });
  });

  it("returns unavailable values for missing, invalid, or empty references", () => {
    expect(
      deriveWasteComparison({ wasteKg: null, volunteersCount: 1, ...reference }),
    ).toMatchObject({ currentPerVolunteer: null, deltaPercent: null, tone: "slate" });
    expect(
      deriveWasteComparison({ wasteKg: 8, volunteersCount: 0, ...reference }),
    ).toMatchObject({ currentPerVolunteer: null, deltaPercent: null, tone: "slate" });
    expect(
      deriveWasteComparison({ wasteKg: 8, volunteersCount: 10, operationalUnits: 0, ...reference }),
    ).toMatchObject({ currentPerVolunteer: null, deltaPercent: null, tone: "slate" });
    expect(
      deriveWasteComparison({ wasteKg: 8, volunteersCount: 10, operationalUnits: null, ...reference }),
    ).toMatchObject({ currentPerVolunteer: null, deltaPercent: null, tone: "slate" });
    expect(
      deriveWasteComparison({ wasteKg: 8, volunteersCount: 1, benchmarkPerVolunteer: null, benchmarkSourceCount: 0 }),
    ).toMatchObject({ benchmarkPerVolunteer: null, deltaPercent: null, tone: "slate" });
    expect(
      deriveWasteComparison({ wasteKg: Number.NaN, volunteersCount: 1, ...reference }),
    ).toMatchObject({ currentPerVolunteer: null, deltaPercent: null, tone: "slate" });
    expect(
      deriveWasteComparison({ wasteKg: 8, volunteersCount: 1, benchmarkPerVolunteer: 8, benchmarkSourceCount: 1 }),
    ).toMatchObject({ benchmarkPerVolunteer: null, deltaPercent: null, tone: "slate" });
  });
});
