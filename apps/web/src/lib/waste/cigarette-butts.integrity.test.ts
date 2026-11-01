import { describe, expect, it } from "vitest";
import {
  aggregateCigaretteButtsLots,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  hasCigaretteButtsMeasurement,
  normalizeCigaretteButtsMeasurements,
  normalizeCigaretteButtsMeasurementsFromUserInput,
  type CigaretteButtsLotInput,
} from "./cigarette-butts";

const lot = (source: CigaretteButtsLotInput["source"], value: number, id: string): CigaretteButtsLotInput => ({
  id,
  source,
  value,
  condition: "propre",
});

describe("cigarette-butt lot integrity", () => {
  it("distinguishes empty lots, null, and an explicit zero", () => {
    const zero = normalizeCigaretteButtsMeasurements({ cigaretteButtsLots: [lot("count", 0, "zero")] });
    const empty = normalizeCigaretteButtsMeasurements({ cigaretteButtsLots: [] });
    const nullLots = normalizeCigaretteButtsMeasurementsFromUserInput({ cigaretteButtsLots: null });
    expect(hasCigaretteButtsMeasurement({ cigaretteButtsLots: [] })).toBe(false);
    expect(hasCigaretteButtsMeasurement({})).toBe(false);
    expect(hasCigaretteButtsMeasurement(zero)).toBe(true);
    expect(empty.cigaretteButtsCount).toBeNull();
    expect(nullLots.cigaretteButtsCount).toBeNull();
  });

  it("records the effective mass version and marks a new mass lot recalculable", () => {
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: [lot("mass_kg", 1, "mass")],
    });
    expect(measurement.cigaretteButtsLotResults?.[0]?.massConversionFormulaVersion)
      .toBe(CIGARETTE_BUTTS_MASS_CONVERSION_VERSION);
    expect(measurement.cigaretteButtsRecalculationStatus).toBe("recalculable");
  });

  it("rejects an over-capacity total after per-lot conversion without truncation", () => {
    expect(() => aggregateCigaretteButtsLots([
      lot("count", 5_000_000, "first"),
      lot("count", 5_000_000, "second"),
    ])).toThrow(/5 000 000/);
  });
});
