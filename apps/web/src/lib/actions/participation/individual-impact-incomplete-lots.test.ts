import { describe, expect, it } from "vitest";
import {
  allocateActionParticipantImpact,
  toIndividualImpactMeasurement,
} from "./individual-impact";
import {
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
  aggregateCigaretteButtsLots,
} from "@/lib/waste/cigarette-butts";

function participant(measurement: ReturnType<typeof toIndividualImpactMeasurement>) {
  return [{ id: "alice", participationStatus: "confirmed" as const, measurement }];
}

function historicalVolumeSnapshot() {
  return aggregateCigaretteButtsLots([
    { id: "historical-volume", source: "volume_l", value: 1, condition: "propre" },
  ], { volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1 });
}

function read(snapshot: ReturnType<typeof historicalVolumeSnapshot>, count = snapshot.summary.totalCount) {
  return toIndividualImpactMeasurement({
    individual_cigarette_butts_count: count,
    individual_cigarette_butts_mass_kg: snapshot.summary.totalMassKg,
    individual_cigarette_butts_provenance: "derived",
    individual_cigarette_butts_lots: snapshot,
  }, { recalculateDerived: true });
}

describe("individual impact incomplete cigarette-butt lots", () => {
  it.each([
    ["empty results", () => ({ ...historicalVolumeSnapshot(), results: [] })],
    ["partial results", () => {
      const snapshot = aggregateCigaretteButtsLots([
        { id: "first", source: "volume_l", value: 1, condition: "propre" },
        { id: "second", source: "volume_l", value: 1, condition: "propre" },
      ], { volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1 });
      return { ...snapshot, results: [snapshot.results[0]!] };
    }],
    ["incompatible results", () => {
      const snapshot = historicalVolumeSnapshot();
      return { ...snapshot, results: [{ ...snapshot.results[0]!, value: 2 }] };
    }],
  ])("keeps %s historical and ineligible for Mohs", (_label, buildSnapshot) => {
    const snapshot = buildSnapshot();
    const measurement = read(snapshot);
    const attribution = allocateActionParticipantImpact({
      totalWasteKg: null,
      totalCigaretteButts: null,
      participants: participant(measurement),
    }).get("alice");

    expect(measurement).toMatchObject({
      cigaretteButtsCount: snapshot.summary.totalCount,
      cigaretteButtsRecalculationStatus: "not_recalculable",
    });
    expect(attribution).toMatchObject({
      cigaretteButts: snapshot.summary.totalCount,
      cigaretteButtsMohsEligible: false,
    });
  });

  it("keeps a genuinely counted lot eligible even when no conversion result is needed", () => {
    const counted = aggregateCigaretteButtsLots([
      { id: "counted", source: "count", value: 7, condition: "propre" },
    ]);
    const measurement = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 7,
      individual_cigarette_butts_provenance: "counted",
      individual_cigarette_butts_lots: { ...counted, results: [] },
    }, { recalculateDerived: true });
    const attribution = allocateActionParticipantImpact({
      totalWasteKg: null,
      totalCigaretteButts: null,
      participants: participant(measurement),
    }).get("alice");

    expect(measurement).toMatchObject({
      cigaretteButtsCount: 7,
      cigaretteButtsRecalculationStatus: "not_applicable",
      comparableButtsProvenance: "counted",
    });
    expect(attribution).toMatchObject({
      cigaretteButts: 7,
      cigaretteButtsMohsEligible: true,
    });
  });

  it("keeps complete v1 historical snapshots recalculable and v2 stable", () => {
    const historical = historicalVolumeSnapshot();
    const recalculated = read(historical);
    const current = aggregateCigaretteButtsLots(historical.lots);
    const replayed = read(current, current.summary.totalCount);

    expect(recalculated).toMatchObject({
      cigaretteButtsCount: 700,
      cigaretteButtsRecalculationStatus: "recalculable",
    });
    expect(recalculated?.cigaretteButtsLots?.results[0]?.volumeConversionFormulaVersion)
      .toBe(CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION);
    expect(replayed).toMatchObject({
      cigaretteButtsCount: 700,
      cigaretteButtsRecalculationStatus: "recalculable",
    });
  });
});
