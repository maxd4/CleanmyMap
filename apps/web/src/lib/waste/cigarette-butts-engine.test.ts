import { describe, expect, it } from "vitest";
import {
  CIGARETTE_BUTTS_PER_VOLUME_LITER,
  CIGARETTE_BUTTS_PER_VOLUME_LITER_V1,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
  aggregateCigaretteButtsLots,
  normalizeCigaretteButtsMeasurements,
} from "./cigarette-butts";

describe("cigarette-butt lot engine", () => {
  it("aggregates distinct count, mass, and volume lots once", () => {
    const measurement = normalizeCigaretteButtsMeasurements({
      cigaretteButtsLots: [
        { id: "count-1", source: "count", value: 100, condition: "propre" },
        { id: "mass-1", source: "mass_kg", value: 1.2, condition: "humide" },
        { id: "volume-1", source: "volume_l", value: 0.5, condition: "mouille" },
      ],
    });

    expect(measurement.cigaretteButtsCount).toBe(2_850);
    expect(measurement.cigaretteButtsMassKg).toBeCloseTo(1.2 + 100 * 0.22 / 1_000 + 350 * 0.5 / 1_000, 10);
    expect(measurement.cigaretteButtsVolumeLiters).toBe(0.5);
    expect(measurement.cigaretteButtsLotsSummary).toMatchObject({
      totalCount: 2_850,
      countedCount: 100,
      estimatedCount: 2_750,
      measuredMassKg: 1.2,
    });
    expect(measurement.cigaretteButtsLotResults?.map((lot) => lot.count)).toEqual([100, 2_400, 350]);
    expect(measurement.cigaretteButtsLotResults?.[1]?.massKg).toBe(1.2);
    expect(measurement.cigaretteButtsLotResults?.[2]?.volumeConversionFormulaVersion).toBe(
      CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
    );
  });

  it("rounds each derived lot before aggregation and preserves measured precision", () => {
    const aggregated = aggregateCigaretteButtsLots([
      { id: "volume-a", source: "volume_l", value: 1.234, condition: "propre" },
      { id: "mass-a", source: "mass_kg", value: 0.123456, condition: "humide" },
    ]);

    expect(aggregated.results[0]?.count).toBe(Math.round(1.234 * CIGARETTE_BUTTS_PER_VOLUME_LITER));
    expect(aggregated.results[1]?.massKg).toBe(0.123456);
    expect(aggregated.summary.totalCount).toBe(864 + Math.round(0.123456 * 1_000 / 0.5));
    expect(aggregated.summary.measuredMassKg).toBe(0.123456);
  });

  it("does not double count a repeated lot identifier in the domain projection", () => {
    const aggregated = aggregateCigaretteButtsLots([
      { id: "same", source: "count", value: 500, condition: "propre" },
      { id: "same", source: "count", value: 700, condition: "propre" },
    ]);

    expect(aggregated.lots).toHaveLength(1);
    expect(aggregated.summary.totalCount).toBe(500);
  });

  it("changes only the volume lot when the versioned proxy moves from v1 to v2", () => {
    const lots = [
      { id: "count", source: "count" as const, value: 100, condition: "propre" as const },
      { id: "mass", source: "mass_kg" as const, value: 1, condition: "humide" as const },
      { id: "volume", source: "volume_l" as const, value: 1, condition: "mouille" as const },
    ];
    const historical = aggregateCigaretteButtsLots(lots, {
      volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
    });
    const current = aggregateCigaretteButtsLots(lots);

    expect(current.lots).toEqual(historical.lots);
    expect(current.results[0]?.count).toBe(historical.results[0]?.count);
    expect(current.results[1]?.count).toBe(historical.results[1]?.count);
    expect(historical.results[2]?.count).toBe(CIGARETTE_BUTTS_PER_VOLUME_LITER_V1);
    expect(current.results[2]?.count).toBe(700);
    expect(current.summary.totalCount - historical.summary.totalCount).toBe(100);
    expect(current.results[2]?.volumeConversionFormulaVersion).toBe(
      CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
    );
  });
});
