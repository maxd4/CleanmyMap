import { describe, expect, it } from "vitest";
import {
  allocateActionParticipantImpact,
  buildStoredIndividualImpactMeasurement,
  toIndividualImpactMeasurement,
} from "./individual-impact";
import {
  aggregateCigaretteButtsLots,
  CigaretteButtsLotsTotalLimitError,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
} from "@/lib/waste/cigarette-butts";

function participant(id: string, measurement: ReturnType<typeof toIndividualImpactMeasurement>) {
  return { id, participationStatus: "confirmed", measurement };
}

describe("individual impact historical cigarette-butt lot limits", () => {
  it("rejects a new volume lot when its current total exceeds the five-million limit", () => {
    expect(() => buildStoredIndividualImpactMeasurement({
      cigaretteButtsLots: [
        { id: "new-volume", source: "volume_l", value: 8_000, condition: "propre" },
      ],
    })).toThrow(CigaretteButtsLotsTotalLimitError);
  });

  it("keeps an admissible historical v1 snapshot readable when current recalculation exceeds the limit", () => {
    const historical = aggregateCigaretteButtsLots([
      { id: "historical-volume", source: "volume_l", value: 8_000, condition: "propre" },
    ], { volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1 });
    const row = {
      individual_cigarette_butts_count: historical.summary.totalCount,
      individual_cigarette_butts_mass_kg: historical.summary.totalMassKg,
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_lots: historical,
    };

    expect(historical.summary.totalCount).toBe(4_800_000);
    const recalculated = toIndividualImpactMeasurement(row, { recalculateDerived: true });

    expect(recalculated).toMatchObject({
      cigaretteButtsCount: 4_800_000,
      comparableButtsCount: 4_800_000,
      cigaretteButtsRecalculationStatus: "not_recalculable",
    });
    expect(recalculated?.cigaretteButtsLots?.results[0]).toMatchObject({
      count: 4_800_000,
      volumeConversionFormulaVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
    });
    const attribution = allocateActionParticipantImpact({
      totalWasteKg: null,
      totalCigaretteButts: null,
      participants: [participant("alice", recalculated)],
    }).get("alice");
    expect(attribution).toMatchObject({
      cigaretteButts: 4_800_000,
      cigaretteButtsMohsEligible: false,
    });
  });

  it("recalculates a historical v1 volume lot normally while it remains under the limit", () => {
    const historical = aggregateCigaretteButtsLots([
      { id: "historical-volume", source: "volume_l", value: 1, condition: "propre" },
    ], { volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1 });

    const recalculated = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 600,
      individual_cigarette_butts_mass_kg: historical.summary.totalMassKg,
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_lots: historical,
    }, { recalculateDerived: true });

    expect(recalculated).toMatchObject({
      cigaretteButtsCount: 700,
      comparableButtsCount: 700,
      cigaretteButtsRecalculationStatus: "recalculable",
      cigaretteButtsConversionVersion: null,
    });
    expect(recalculated?.cigaretteButtsLots?.results[0]?.count).toBe(700);
    expect(recalculated?.cigaretteButtsLots?.results[0]?.volumeConversionFormulaVersion)
      .toBe(CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION);
  });

  it("recalculates mixed historical lots without double counting or mutating their snapshot", () => {
    const historical = aggregateCigaretteButtsLots([
      { id: "counted", source: "count", value: 10, condition: "propre" },
      { id: "mass", source: "mass_kg", value: 1, condition: "humide" },
      { id: "volume", source: "volume_l", value: 1, condition: "mouille" },
    ], { volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1 });

    const recalculated = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: historical.summary.totalCount,
      individual_cigarette_butts_mass_kg: historical.summary.totalMassKg,
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_lots: historical,
    }, { recalculateDerived: true });

    expect(historical.summary.totalCount).toBe(2_610);
    expect(recalculated).toMatchObject({
      cigaretteButtsCount: 2_710,
      comparableButtsCount: 2_710,
      cigaretteButtsRecalculationStatus: "recalculable",
    });
    expect(recalculated?.cigaretteButtsLots?.lots).toHaveLength(3);
    expect(recalculated?.cigaretteButtsLots?.results.map((result) => result.count))
      .toEqual([10, 2_000, 700]);
    expect(recalculated?.cigaretteButtsLots?.results[2]?.volumeConversionFormulaVersion)
      .toBe(CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION);
    expect(historical.summary.totalCount).toBe(2_610);
    expect(historical.results[2]?.count).toBe(600);
    expect(historical.results[2]?.volumeConversionFormulaVersion)
      .toBe(CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1);
  });
});
