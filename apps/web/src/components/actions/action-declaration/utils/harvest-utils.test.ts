import { describe, expect, it } from "vitest";

import { deriveWasteComparison } from "./harvest-utils";

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

  it("keeps an explicit zero as a valid comparison value", () => {
    expect(
      deriveWasteComparison({ wasteKg: 0, volunteersCount: 2, ...reference }),
    ).toMatchObject({
      currentPerVolunteer: 0,
      deltaPercent: -100,
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
