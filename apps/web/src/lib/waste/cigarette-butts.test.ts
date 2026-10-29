import { describe, expect, it } from "vitest";
import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  normalizeCigaretteButtsMeasurements,
  normalizeCigaretteButtsMeasurementsFromUserInput,
  type ActionCigaretteButtsMeasurements,
} from "./cigarette-butts";

function buildExistingMeasurements(
  overrides: Partial<ActionCigaretteButtsMeasurements> = {},
): ActionCigaretteButtsMeasurements {
  return {
    cigaretteButtsCount: 1_700,
    cigaretteButtsMassKg: 1,
    cigaretteButtsVolumeLiters: null,
    cigaretteButtsCondition: "humide",
    cigaretteButtsCountProvenance: "unknown",
    cigaretteButtsMassProvenance: "unknown",
    cigaretteButtsVolumeProvenance: "unknown",
    cigaretteButtsConversionFormulaVersion: null,
    ...overrides,
  };
}

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

  it("treats the mass as the sole observed source when the form says mass", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_750,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "mass",
    });

    expect(measurement.cigaretteButtsMassKg).toBe(1);
    expect(measurement.cigaretteButtsCount).toBe(1_750);
    expect(measurement.cigaretteButtsMassProvenance).toBe("measured");
    expect(measurement.cigaretteButtsCountProvenance).toBe("weight_converted");
    expect(measurement.cigaretteButtsConversionFormulaVersion).toBe(
      CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
    );
  });

  it("treats the count as the sole observed source when the form says count", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_750,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "count",
    });

    expect(measurement.cigaretteButtsCount).toBe(1_750);
    expect(measurement.cigaretteButtsMassKg).toBe(1);
    expect(measurement.cigaretteButtsCountProvenance).toBe("counted");
    expect(measurement.cigaretteButtsMassProvenance).toBe("weight_converted");
  });

  it("keeps legacy payloads deriving a missing value when no source hint exists", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
    });

    expect(measurement.cigaretteButtsCount).toBe(1_750);
    expect(measurement.cigaretteButtsCountProvenance).toBe("weight_converted");
    expect(measurement.cigaretteButtsMassProvenance).toBe("measured");
  });

  it("preserves an indeterminate historical pair without converting it", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
    });

    expect(measurement.cigaretteButtsCount).toBe(1_700);
    expect(measurement.cigaretteButtsMassKg).toBe(1);
    expect(measurement.cigaretteButtsCountProvenance).toBe("unknown");
    expect(measurement.cigaretteButtsMassProvenance).toBe("unknown");
    expect(measurement.cigaretteButtsConversionFormulaVersion).toBeNull();
  });

  it("preserves the independent mass when only an unknown count is cleared", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
    }, { existingMeasurements: buildExistingMeasurements() });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: null,
    });
  });

  it("preserves the independent count when only an unknown mass is cleared", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: null,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
    }, { existingMeasurements: buildExistingMeasurements() });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: null,
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: null,
    });
  });

  it("preserves a measured mass when a counted field is cleared independently", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
    }, {
      existingMeasurements: buildExistingMeasurements({
        cigaretteButtsCountProvenance: "counted",
        cigaretteButtsMassProvenance: "measured",
      }),
    });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "measured",
    });
  });

  it("preserves a counted value when a measured mass is cleared independently", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: null,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
    }, {
      existingMeasurements: buildExistingMeasurements({
        cigaretteButtsCountProvenance: "counted",
        cigaretteButtsMassProvenance: "measured",
      }),
    });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: null,
      cigaretteButtsCountProvenance: "counted",
      cigaretteButtsMassProvenance: "unknown",
    });
  });

  it("does not keep a derived mass when its counted source is cleared", () => {
    const existing = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: 1_700,
      cigaretteButtsCondition: "humide",
      deriveMissingFromMassOrCount: true,
    });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: existing.cigaretteButtsMassKg,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "count",
    }, { existingMeasurements: existing });

    expect(measurement.cigaretteButtsCount).toBeNull();
    expect(measurement.cigaretteButtsMassKg).toBeNull();
  });

  it("does not keep a derived count when its mass source is cleared", () => {
    const existing = normalizeCigaretteButtsMeasurements({
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
      deriveMissingFromMassOrCount: true,
    });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: existing.cigaretteButtsCount,
      cigaretteButtsMassKg: null,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "mass",
    }, { existingMeasurements: existing });

    expect(measurement.cigaretteButtsCount).toBeNull();
    expect(measurement.cigaretteButtsMassKg).toBeNull();
  });

  it("preserves a source when only its derived counterpart is cleared", () => {
    const countSource = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: 1_700,
      cigaretteButtsCondition: "humide",
      deriveMissingFromMassOrCount: true,
    });
    const massSource = normalizeCigaretteButtsMeasurements({
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
      deriveMissingFromMassOrCount: true,
    });

    const afterMassClear = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: countSource.cigaretteButtsCount,
      cigaretteButtsMassKg: null,
      cigaretteButtsCondition: "humide",
    }, { existingMeasurements: countSource });
    const afterCountClear = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: massSource.cigaretteButtsMassKg,
      cigaretteButtsCondition: "humide",
    }, { existingMeasurements: massSource });

    expect(afterMassClear).toMatchObject({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: null,
      cigaretteButtsCountProvenance: "counted",
    });
    expect(afterCountClear).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1,
      cigaretteButtsMassProvenance: "measured",
    });
  });

  it("persists two explicit nulls without converting them to zero", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: null,
      cigaretteButtsCondition: null,
      cigaretteButtsInputSource: "count",
    }, { existingMeasurements: buildExistingMeasurements() });

    expect(measurement.cigaretteButtsCount).toBeNull();
    expect(measurement.cigaretteButtsMassKg).toBeNull();
    expect(measurement.cigaretteButtsCount).not.toBe(0);
    expect(measurement.cigaretteButtsMassKg).not.toBe(0);
  });
});
