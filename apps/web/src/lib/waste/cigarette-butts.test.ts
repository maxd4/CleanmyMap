import { describe, expect, it } from "vitest";
import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  normalizeCigaretteButtsMeasurements,
} from "./cigarette-butts";

describe("cigarette-butt raw and derived measurements", () => {
  it("keeps a counted value and a raw mass distinct", () => {
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: 3_000,
      cigaretteButtsMassKg: 1.2,
      cigaretteButtsCondition: "propre",
      deriveMissingFromMassOrCount: true,
    });

    expect(measurement.cigaretteButtsCount).toBe(3_000);
    expect(measurement.cigaretteButtsMassKg).toBe(1.2);
    expect(measurement.cigaretteButtsCountProvenance).toBe("counted");
    expect(measurement.cigaretteButtsMassProvenance).toBe("measured");
    expect(measurement.cigaretteButtsConversionFormulaVersion).toBeNull();
  });

  it("keeps NULL distinct from an explicitly measured zero", () => {
    const unknown = normalizeCigaretteButtsMeasurements({});
    const zero = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: 0,
      cigaretteButtsMassKg: 0,
      cigaretteButtsVolumeLiters: 0,
      cigaretteButtsCondition: "propre",
    });

    expect(unknown.cigaretteButtsCount).toBeNull();
    expect(unknown.cigaretteButtsMassKg).toBeNull();
    expect(unknown.cigaretteButtsVolumeLiters).toBeNull();
    expect(zero.cigaretteButtsCount).toBe(0);
    expect(zero.cigaretteButtsMassKg).toBe(0);
    expect(zero.cigaretteButtsVolumeLiters).toBe(0);
  });

  it("derives count from mass with the versioned canonical formula", () => {
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsMassKg: 1.2,
      cigaretteButtsCondition: "propre",
      deriveMissingFromMassOrCount: true,
    });

    expect(measurement.cigaretteButtsCount).toBe(3_000);
    expect(measurement.cigaretteButtsMassKg).toBe(1.2);
    expect(measurement.cigaretteButtsCountProvenance).toBe("weight_converted");
    expect(measurement.cigaretteButtsMassProvenance).toBe("measured");
    expect(measurement.cigaretteButtsConversionFormulaVersion).toBe(
      CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
    );
  });

  it("derives mass from count without replacing the raw count", () => {
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: 3_000,
      cigaretteButtsCondition: "humide",
      deriveMissingFromMassOrCount: true,
    });

    expect(measurement.cigaretteButtsCount).toBe(3_000);
    expect(measurement.cigaretteButtsMassKg).toBeCloseTo(3_000 / 1_750, 10);
    expect(measurement.cigaretteButtsCountProvenance).toBe("counted");
    expect(measurement.cigaretteButtsMassProvenance).toBe("weight_converted");
  });

  it("stores volume without inventing a volume conversion", () => {
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsCondition: "mouille",
      deriveMissingFromMassOrCount: true,
    });

    expect(measurement.cigaretteButtsVolumeLiters).toBe(2.5);
    expect(measurement.cigaretteButtsVolumeProvenance).toBe("measured");
    expect(measurement.cigaretteButtsMassKg).toBeNull();
    expect(measurement.cigaretteButtsCount).toBeNull();
    expect(measurement.cigaretteButtsConversionFormulaVersion).toBeNull();
  });
});
