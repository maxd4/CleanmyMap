import { describe, expect, it } from "vitest";
import {
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
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
});
