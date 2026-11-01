import { describe, expect, it } from "vitest";
import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
  aggregateCigaretteButtsLots,
  calculateCigaretteButtsLot,
  getCigaretteButtsVolumeFactor,
  normalizeCigaretteButtsMeasurements,
  normalizeCigaretteButtsMeasurementsFromUserInput,
  projectCurrentCigaretteButts,
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
    ...overrides,
  };
}

function measurementsFromLots(lots: Parameters<typeof aggregateCigaretteButtsLots>[0]) {
  const aggregate = aggregateCigaretteButtsLots(lots);
  return normalizeCigaretteButtsMeasurements({
    cigaretteButtsLots: aggregate.lots,
    cigaretteButtsLotResults: aggregate.results,
    cigaretteButtsLotsSummary: aggregate.summary,
  });
}

describe("cigarette-butt raw and derived measurements", () => {
  it("refuses explicit unknown conversion versions instead of using the current factors", () => {
    expect(() => getCigaretteButtsVolumeFactor("historical-volume-unknown"))
      .toThrow("historical-volume-unknown");
    expect(() => calculateCigaretteButtsLot(
      { id: "volume", source: "volume_l", value: 1, condition: "propre" },
      { volumeConversionVersion: "historical-volume-unknown" },
    )).toThrow("historical-volume-unknown");
    expect(() => calculateCigaretteButtsLot(
      { id: "mass", source: "mass_kg", value: 1, condition: "propre" },
      { massConversionVersion: "historical-mass-unknown" },
    )).toThrow("historical-mass-unknown");
  });

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
    expect(measurement.cigaretteButtsRecalculationStatus).toBe("not_applicable");
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

  it("derives lot mass provenance from the source even when the value is zero", () => {
    const measuredZero = measurementsFromLots([{
      id: "measured-zero", source: "mass_kg", value: 0, condition: "propre",
    }]);
    const countedZero = measurementsFromLots([{
      id: "counted-zero", source: "count", value: 0, condition: "propre",
    }]);

    expect(measuredZero.cigaretteButtsMassProvenance).toBe("measured");
    expect(countedZero.cigaretteButtsMassProvenance).toBe("weight_converted");
  });

  it("derives count from mass with the versioned canonical formula", () => {
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsMassKg: 1.2,
      cigaretteButtsCondition: "propre",
      deriveMissingFromMassOrCount: true,
    });

    expect(measurement.cigaretteButtsCount).toBe(5_455);
    expect(measurement.cigaretteButtsMassKg).toBe(1.2);
    expect(measurement.cigaretteButtsCountProvenance).toBe("weight_converted");
    expect(measurement.cigaretteButtsMassProvenance).toBe("measured");
    expect(measurement.cigaretteButtsRecalculationStatus).toBe("recalculable");
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
    expect(measurement.cigaretteButtsMassKg).toBeCloseTo(3_000 * 0.5 / 1_000, 10);
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
    expect(measurement.cigaretteButtsCount).toBe(2_000);
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
    expect(measurement.cigaretteButtsMassKg).toBe(0.875);
    expect(measurement.cigaretteButtsCountProvenance).toBe("counted");
    expect(measurement.cigaretteButtsMassProvenance).toBe("weight_converted");
  });

  it("keeps legacy payloads deriving a missing value when no source hint exists", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
    });

    expect(measurement.cigaretteButtsCount).toBe(2_000);
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

  it("preserves volume provenance when count or mass is cleared", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1,
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
    }, {
      existingMeasurements: buildExistingMeasurements({
        cigaretteButtsVolumeLiters: 2.5,
        cigaretteButtsVolumeProvenance: "volume_converted",
      }),
    });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1,
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsVolumeProvenance: "volume_converted",
    });
  });

  it.each([
    ["unknown", "count edit", { cigaretteButtsCount: 2_000 }],
    ["volume_converted", "mass edit", { cigaretteButtsMassKg: 1.2 }],
    ["measured", "condition edit", { cigaretteButtsCondition: "propre" }],
  ] as const)("preserves %s volume provenance after a %s", (provenance, _label, patch) => {
    const existing = buildExistingMeasurements({
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsVolumeProvenance: provenance,
      cigaretteButtsCountProvenance: "counted",
      cigaretteButtsMassProvenance: "measured",
    });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: 1,
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
      ...patch,
    }, { existingMeasurements: existing });

    expect(measurement.cigaretteButtsVolumeLiters).toBe(2.5);
    expect(measurement.cigaretteButtsVolumeProvenance).toBe(provenance);
  });

  it("preserves volume provenance when a partial patch omits the volume", () => {
    const existing = buildExistingMeasurements({
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsVolumeProvenance: "volume_converted",
    });

    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_800,
    }, { existingMeasurements: existing });

    expect(measurement.cigaretteButtsVolumeLiters).toBe(2.5);
    expect(measurement.cigaretteButtsVolumeProvenance).toBe("volume_converted");
  });

  it("clears volume with the canonical unknown provenance", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsVolumeLiters: null,
    }, {
      existingMeasurements: buildExistingMeasurements({
        cigaretteButtsVolumeLiters: 2.5,
        cigaretteButtsVolumeProvenance: "volume_converted",
      }),
    });

    expect(measurement.cigaretteButtsVolumeLiters).toBeNull();
    expect(measurement.cigaretteButtsVolumeProvenance).toBe("unknown");
  });

  it("qualifies a genuinely new volume as measured without accepting a client provenance hint", () => {
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsVolumeLiters: 3.5,
      cigaretteButtsVolumeProvenance: "unknown",
    } as never, {
      existingMeasurements: buildExistingMeasurements({
        cigaretteButtsVolumeLiters: 2.5,
        cigaretteButtsVolumeProvenance: "volume_converted",
      }),
    });

    expect(measurement.cigaretteButtsVolumeLiters).toBe(3.5);
    expect(measurement.cigaretteButtsVolumeProvenance).toBe("measured");
  });

  it("clears volume explicitly without changing the independent pair or formula", () => {
    const existing = buildExistingMeasurements({
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsVolumeProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
    });
    const measurement = normalizeCigaretteButtsMeasurementsFromUserInput({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: 1,
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsCondition: "humide",
      cigaretteButtsInputSource: "unknown",
    }, { existingMeasurements: existing });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: 1,
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsVolumeProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
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
    expect(measurement.cigaretteButtsRecalculationStatus).toBe("not_applicable");
  });

  it("signals an ambiguous historical pair as unchanged and not recalculable", () => {
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: 1_750,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: null,
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: null,
    });

    expect(measurement).toMatchObject({
      cigaretteButtsCount: 1_750,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsRecalculationStatus: "not_recalculable",
    });
  });

});

describe("historical cigarette-butt lot snapshots", () => {
  it("keeps a known historical volume version eligible for explicit recalculation", () => {
    const lot = {
      id: "legacy-volume",
      source: "volume_l" as const,
      value: 1,
      condition: "propre" as const,
    };
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: [lot],
      cigaretteButtsLotResults: [{
        ...lot,
        count: 600,
        massKg: 0.132,
        rawMassKg: null,
        rawVolumeLiters: 1,
        countProvenance: "volume_converted",
        massProvenance: "weight_converted",
        massConversionFormulaVersion: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
        volumeConversionFormulaVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
      }],
      cigaretteButtsLotsSummary: {
        totalCount: 600,
        countedCount: 0,
        estimatedCount: 600,
        totalMassKg: 0.132,
        measuredMassKg: 0,
        estimatedMassKg: 0.132,
        totalVolumeLiters: 1,
        countedShare: 0,
        estimatedShare: 1,
      },
    });

    expect(measurement.cigaretteButtsCount).toBe(600);
    expect(measurement.cigaretteButtsRecalculationStatus).toBe("recalculable");
  });

  it("rehydrates a persisted snapshot without recalculating it", () => {
    const historicalLot = {
      id: "legacy-humide",
      source: "mass_kg" as const,
      value: 1,
      condition: "humide" as const,
    };
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: [historicalLot],
      cigaretteButtsLotResults: [{
        ...historicalLot,
        count: 1_750,
        massKg: 1,
        rawMassKg: 1,
        rawVolumeLiters: null,
        countProvenance: "weight_converted",
        massProvenance: "measured",
        massConversionFormulaVersion: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
        volumeConversionFormulaVersion: null,
      }],
      cigaretteButtsLotsSummary: {
        totalCount: 1_750,
        countedCount: 0,
        estimatedCount: 1_750,
        totalMassKg: 1,
        measuredMassKg: 1,
        estimatedMassKg: 0,
        totalVolumeLiters: 0,
        countedShare: 0,
        estimatedShare: 1,
      },
    });

    expect(measurement.cigaretteButtsCount).toBe(1_750);
    expect(measurement.cigaretteButtsConversionFormulaVersion).toBe(
      CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
    );
    expect(measurement.cigaretteButtsLotResults?.[0]?.count).toBe(1_750);
    expect(measurement.cigaretteButtsLotResults?.[0]?.massConversionFormulaVersion).toBe(
      CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
    );
    expect(measurement.cigaretteButtsCount).not.toBe(Math.round(1 / 0.5 * 1_000));
    expect(measurement.cigaretteButtsRecalculationStatus).toBe("recalculable");
  });

  it("retains an unknown historical lot formula and marks it non-recalculable", () => {
    const historicalLot = {
      id: "legacy-unknown",
      source: "volume_l" as const,
      value: 1,
      condition: "propre" as const,
    };
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: [historicalLot],
      cigaretteButtsLotResults: [{
        ...historicalLot,
        count: 600,
        massKg: 0.22,
        rawMassKg: null,
        rawVolumeLiters: 1,
        countProvenance: "volume_converted",
        massProvenance: "weight_converted",
        massConversionFormulaVersion: "historical-unknown",
        volumeConversionFormulaVersion: "historical-unknown",
      }],
      cigaretteButtsLotsSummary: {
        totalCount: 600,
        countedCount: 0,
        estimatedCount: 600,
        totalMassKg: 0.22,
        measuredMassKg: 0,
        estimatedMassKg: 0.22,
        totalVolumeLiters: 1,
        countedShare: 0,
        estimatedShare: 1,
      },
    });

    expect(measurement.cigaretteButtsCount).toBe(600);
    expect(measurement.cigaretteButtsLotResults?.[0]?.massConversionFormulaVersion).toBe(
      "historical-unknown",
    );
    expect(measurement.cigaretteButtsRecalculationStatus).toBe("not_recalculable");
    const currentProjection = projectCurrentCigaretteButts(measurement);
    expect(currentProjection).toMatchObject({
      count: 600,
      status: "not_recalculable",
      source: "historical",
    });
    expect(currentProjection.results?.[0]?.count).toBe(600);
  });
});
