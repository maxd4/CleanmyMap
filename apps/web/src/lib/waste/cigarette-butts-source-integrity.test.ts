import { describe, expect, it } from "vitest";
import {
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
  calculateCigaretteButtsMeasurementFromSource,
  normalizeCigaretteButtsMeasurementsFromUserInput,
  type ActionCigaretteButtsMeasurements,
} from "./cigarette-butts";
import { CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1 } from "@/lib/impact/impact-terrain-2026";

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
    cigaretteButtsVolumeConversionFormulaVersion: null,
    ...overrides,
  };
}

const SOURCE_REPLACEMENT_CASES = [
  {
    name: "count to mass",
    existingInput: {
      cigaretteButtsCount: 1_750,
      cigaretteButtsCondition: "propre" as const,
      cigaretteButtsInputSource: "count" as const,
    },
    replacementInput: {
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1,
      cigaretteButtsInputSource: "mass_kg" as const,
    },
    source: "mass_kg" as const,
    value: 1,
    condition: "propre" as const,
  },
  {
    name: "count to volume",
    existingInput: {
      cigaretteButtsCount: 1_750,
      cigaretteButtsCondition: "propre" as const,
      cigaretteButtsInputSource: "count" as const,
    },
    replacementInput: {
      cigaretteButtsCount: null,
      cigaretteButtsVolumeLiters: 3,
      cigaretteButtsInputSource: "volume_l" as const,
    },
    source: "volume_l" as const,
    value: 3,
    condition: "propre" as const,
  },
  {
    name: "mass to count",
    existingInput: {
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide" as const,
      cigaretteButtsInputSource: "mass_kg" as const,
    },
    replacementInput: {
      cigaretteButtsCount: 1_750,
      cigaretteButtsMassKg: null,
      cigaretteButtsInputSource: "count" as const,
    },
    source: "count" as const,
    value: 1_750,
    condition: "humide" as const,
  },
  {
    name: "volume to count",
    existingInput: {
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsCondition: "propre" as const,
      cigaretteButtsInputSource: "volume_l" as const,
    },
    replacementInput: {
      cigaretteButtsCount: 1_800,
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsInputSource: "count" as const,
    },
    source: "count" as const,
    value: 1_800,
    condition: "propre" as const,
  },
  {
    name: "volume to mass",
    existingInput: {
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsCondition: "propre" as const,
      cigaretteButtsInputSource: "volume_l" as const,
    },
    replacementInput: {
      cigaretteButtsMassKg: 1,
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsInputSource: "mass_kg" as const,
    },
    source: "mass_kg" as const,
    value: 1,
    condition: "propre" as const,
  },
] as const;

describe("cigarette-butt source integrity", () => {
  it("keeps the historical volume conversion when the source condition changes", () => {
    const existing = buildExistingMeasurements({
      cigaretteButtsCount: 600,
      cigaretteButtsMassKg: 0.132,
      cigaretteButtsVolumeLiters: 1,
      cigaretteButtsCondition: "propre",
      cigaretteButtsCountProvenance: "volume_converted",
      cigaretteButtsMassProvenance: "weight_converted",
      cigaretteButtsVolumeProvenance: "measured",
      cigaretteButtsInputSource: "volume_l",
      cigaretteButtsConversionFormulaVersion: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
      cigaretteButtsVolumeConversionFormulaVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
    });

    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 600,
      cigaretteButtsMassKg: 0.132,
      cigaretteButtsVolumeLiters: 1,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "volume_l",
    }, { existingMeasurements: existing });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: 600,
      cigaretteButtsVolumeLiters: 1,
      cigaretteButtsVolumeConversionFormulaVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
      cigaretteButtsInputSource: "volume_l",
    });
  });

  it("clears both scalar equivalences when the volume source is cleared", () => {
    const existing = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsCondition: "propre",
      cigaretteButtsInputSource: "volume_l",
    });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsCondition: "propre",
    }, { existingMeasurements: existing });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: null,
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsInputSource: null,
      cigaretteButtsVolumeProvenance: "unknown",
    });
  });

  it.each(SOURCE_REPLACEMENT_CASES)("preserves a new $name source while clearing the old source", ({
    existingInput,
    replacementInput,
    source,
    value,
    condition,
  }) => {
    const existing = normalizeCigaretteButtsMeasurementsFromUserInput(existingInput);
    const expected = calculateCigaretteButtsMeasurementFromSource({ source, value, condition });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      ...replacementInput,
      cigaretteButtsCondition: condition,
    }, { existingMeasurements: existing });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: expected.cigaretteButtsCount,
      cigaretteButtsMassKg: expected.cigaretteButtsMassKg,
      cigaretteButtsVolumeLiters: expected.cigaretteButtsVolumeLiters,
      cigaretteButtsInputSource: source,
      cigaretteButtsCountProvenance: expected.cigaretteButtsCountProvenance,
      cigaretteButtsMassProvenance: expected.cigaretteButtsMassProvenance,
      cigaretteButtsVolumeProvenance: expected.cigaretteButtsVolumeProvenance,
    });
  });

  it.each(SOURCE_REPLACEMENT_CASES)("resolves a non-ambiguous legacy $name replacement without a source indicator", ({
    existingInput,
    replacementInput,
    source,
    value,
    condition,
  }) => {
    const existing = normalizeCigaretteButtsMeasurementsFromUserInput(existingInput);
    const expected = calculateCigaretteButtsMeasurementFromSource({ source, value, condition });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      ...replacementInput,
      cigaretteButtsInputSource: undefined,
      cigaretteButtsCondition: condition,
    }, { existingMeasurements: existing });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: expected.cigaretteButtsCount,
      cigaretteButtsMassKg: expected.cigaretteButtsMassKg,
      cigaretteButtsVolumeLiters: expected.cigaretteButtsVolumeLiters,
      cigaretteButtsInputSource: source,
      cigaretteButtsCountProvenance: expected.cigaretteButtsCountProvenance,
      cigaretteButtsMassProvenance: expected.cigaretteButtsMassProvenance,
      cigaretteButtsVolumeProvenance: expected.cigaretteButtsVolumeProvenance,
    });
  });

  it("preserves an explicit zero as a new mass source without an indicator", () => {
    const existing = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_750,
      cigaretteButtsCondition: "propre",
      cigaretteButtsInputSource: "count",
    });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 0,
      cigaretteButtsCondition: "propre",
    }, { existingMeasurements: existing });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: 0,
      cigaretteButtsMassKg: 0,
      cigaretteButtsInputSource: "mass_kg",
      cigaretteButtsMassProvenance: "measured",
    });
  });

  it("does not invent a source when two replacement values are submitted", () => {
    const existing = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_750,
      cigaretteButtsCondition: "propre",
      cigaretteButtsInputSource: "count",
    });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1,
      cigaretteButtsVolumeLiters: 3,
      cigaretteButtsCondition: "propre",
      cigaretteButtsInputSource: "volume_l",
    }, { existingMeasurements: existing });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: null,
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsInputSource: null,
    });
  });

  it("does not invent a replacement source when the remaining value only equals an old estimate", () => {
    const existing = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_750,
      cigaretteButtsCondition: "propre",
      cigaretteButtsInputSource: "count",
    });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: existing.cigaretteButtsMassKg,
      cigaretteButtsCondition: "propre",
    }, { existingMeasurements: existing });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: null,
      cigaretteButtsInputSource: null,
    });
  });

  it("recognizes an explicitly submitted replacement even when it equals the old estimate", () => {
    const existing = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_750,
      cigaretteButtsCondition: "propre",
      cigaretteButtsInputSource: "count",
    });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: existing.cigaretteButtsMassKg,
      cigaretteButtsCondition: "propre",
      cigaretteButtsInputSource: "mass_kg",
    }, { existingMeasurements: existing });

    expect(measurement).toMatchObject({
      cigaretteButtsMassKg: existing.cigaretteButtsMassKg,
      cigaretteButtsMassProvenance: "measured",
      cigaretteButtsInputSource: "mass_kg",
    });
  });
});
