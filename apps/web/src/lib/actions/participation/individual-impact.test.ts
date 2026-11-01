import { describe, expect, it } from "vitest";
import {
  allocateActionParticipantImpact,
  buildStoredIndividualImpactMeasurement,
  toIndividualImpactMeasurement,
  WASTE_MOISTURE_NORMALIZATION_VERSION,
} from "./individual-impact";
import { normalizeVolunteerParticipation } from "../volunteer-participation";
import { aggregateCigaretteButtsLots } from "@/lib/waste/cigarette-butts";
import { CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1 } from "@/lib/impact/impact-terrain-2026";
import { CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION } from "@/lib/waste/cigarette-butts";

function participant(id: string, measurement: ReturnType<typeof toIndividualImpactMeasurement> = null) {
  return { id, participationStatus: "confirmed", measurement };
}

function expectTwoQuoteParts(attribution: Map<string, { wasteKg: number | null }>) {
  expect(attribution.size).toBe(2);
  expect([...attribution.values()].map((value) => value.wasteKg)).toEqual([10, 10]);
}

function allocateForPhysicalCounts(params: {
  childrenCount: number;
  adultCount: number;
  retiredCount: number;
  participants?: ReturnType<typeof participant>[];
}) {
  const physicalParticipation = normalizeVolunteerParticipation(params);
  const attribution = allocateActionParticipantImpact({
    totalWasteKg: 20,
    totalCigaretteButts: null,
    participants: params.participants ?? [participant("alice"), participant("bob")],
  });

  return { attribution, physicalParticipation };
}

describe("individual action impact attribution", () => {
  it("uses confirmed accounts instead of children for a 20 kg quote-part", () => {
    const { attribution, physicalParticipation } = allocateForPhysicalCounts({
      childrenCount: 2,
      adultCount: 2,
      retiredCount: 0,
    });

    expect(physicalParticipation.participantsCount).toBe(4);
    expect(attribution.get("alice")).toMatchObject({ wasteKg: 10, wasteKind: "quote_part" });
    expect(attribution.get("bob")).toMatchObject({ wasteKg: 10, wasteKind: "quote_part" });
  });

  it("keeps two confirmed accounts as the denominator with ten children", () => {
    const { attribution, physicalParticipation } = allocateForPhysicalCounts({
      childrenCount: 10,
      adultCount: 2,
      retiredCount: 0,
    });

    expect(physicalParticipation.participantsCount).toBe(12);
    expectTwoQuoteParts(attribution);
  });

  it("does not change quotes when childrenCount changes and the confirmed roster is stable", () => {
    const withTwoChildren = allocateForPhysicalCounts({
      childrenCount: 2,
      adultCount: 2,
      retiredCount: 0,
    });
    const withTenChildren = allocateForPhysicalCounts({
      childrenCount: 10,
      adultCount: 2,
      retiredCount: 0,
    });

    expect(withTwoChildren.physicalParticipation.participantsCount).not.toBe(
      withTenChildren.physicalParticipation.participantsCount,
    );
    expect(withTwoChildren.attribution).toEqual(withTenChildren.attribution);
  });

  it("does not replace the confirmed roster with adult or retired form counts", () => {
    const { attribution, physicalParticipation } = allocateForPhysicalCounts({
      childrenCount: 0,
      adultCount: 100,
      retiredCount: 50,
    });

    expect(physicalParticipation.participantsCount).toBe(150);
    expectTwoQuoteParts(attribution);
  });

  it("gives Bob the exact remaining 8 kg after Alice measured 12 kg, regardless of children", () => {
    const alice = toIndividualImpactMeasurement({
      individual_waste_kg: 12,
      individual_waste_condition: "sec",
    });
    const participants = [participant("alice", alice), participant("bob")];
    const withTwoChildren = allocateForPhysicalCounts({
      childrenCount: 2,
      adultCount: 2,
      retiredCount: 0,
      participants,
    });
    const withTenChildren = allocateForPhysicalCounts({
      childrenCount: 10,
      adultCount: 2,
      retiredCount: 0,
      participants,
    });

    expect(withTwoChildren.attribution.get("alice")).toMatchObject({ wasteKg: 12, wasteKind: "individual" });
    expect(withTwoChildren.attribution.get("bob")).toMatchObject({ wasteKg: 8, wasteKind: "quote_part" });
    expect(withTenChildren.attribution).toEqual(withTwoChildren.attribution);
  });

  it("allocates the 10 kg individual measure before the conservative remainder of a 20 kg total", () => {
    const alice = toIndividualImpactMeasurement({
      individual_waste_kg: 10,
      individual_waste_condition: "sec",
    });
    const result = allocateActionParticipantImpact({
      totalWasteKg: 20,
      totalCigaretteButts: null,
      participants: [participant("alice", alice), participant("bob"), participant("cara")],
    });

    expect(result.get("alice")).toMatchObject({ wasteKg: 10, wasteKind: "individual" });
    expect(result.get("bob")).toMatchObject({ wasteKg: 5, wasteKind: "quote_part" });
    expect(result.get("cara")).toMatchObject({ wasteKg: 5, wasteKind: "quote_part" });
  });

  it("keeps the existing equal quote-part when no exact measurement exists", () => {
    const result = allocateActionParticipantImpact({
      totalWasteKg: 100,
      totalCigaretteButts: 1_000,
      participants: [participant("a"), participant("b"), participant("c"), participant("d"), participant("e"), participant("f"), participant("g"), participant("h"), participant("i"), participant("j")],
    });
    expect(result.get("a")).toMatchObject({ wasteKg: 10, wasteKind: "quote_part", cigaretteButts: 100 });
  });

  it("uses Alice's exact waste then distributes only the conservative remainder", () => {
    const alice = toIndividualImpactMeasurement({
      individual_waste_kg: 20,
      individual_waste_condition: "sec",
      individual_waste_measurement_method: "balance_au_sol",
    });
    const result = allocateActionParticipantImpact({
      totalWasteKg: 100,
      totalCigaretteButts: null,
      participants: [participant("alice", alice), ...Array.from({ length: 9 }, (_, index) => participant(`p-${index}`))],
    });
    expect(result.get("alice")).toMatchObject({ wasteKg: 20, wasteKind: "individual" });
    expect(result.get("p-0")).toMatchObject({ wasteKg: 80 / 9, wasteKind: "quote_part" });
  });

  it("handles several exact measures and the all-measured case", () => {
    const result = allocateActionParticipantImpact({
      totalWasteKg: 30,
      totalCigaretteButts: null,
      participants: [
        participant("a", toIndividualImpactMeasurement({ individual_waste_kg: 10, individual_waste_condition: "sec" })),
        participant("b", toIndividualImpactMeasurement({ individual_waste_kg: 20, individual_waste_condition: "sec" })),
      ],
    });
    expect(result.get("a")).toMatchObject({ wasteKg: 10, wasteKind: "individual" });
    expect(result.get("b")).toMatchObject({ wasteKg: 20, wasteKind: "individual" });
  });

  it("keeps known measurements and leaves unmeasured participants NA when the total is unknown", () => {
    const result = allocateActionParticipantImpact({
      totalWasteKg: null,
      totalCigaretteButts: null,
      participants: [
        participant("a", toIndividualImpactMeasurement({ individual_waste_kg: 0, individual_waste_condition: "sec" })),
        participant("b"),
      ],
    });
    expect(result.get("a")).toMatchObject({ wasteKg: 0, wasteKind: "individual" });
    expect(result.get("b")).toMatchObject({ wasteKg: null, wasteKind: "unavailable" });
  });

  it("fails closed on an exact total above the collective total", () => {
    const result = allocateActionParticipantImpact({
      totalWasteKg: 10,
      totalCigaretteButts: null,
      participants: [
        participant("a", toIndividualImpactMeasurement({ individual_waste_kg: 20, individual_waste_condition: "sec" })),
        participant("b"),
      ],
    });
    expect(result.get("a")).toMatchObject({ wasteKg: 20, wasteInconsistent: true, wasteMohsEligible: false });
    expect(result.get("b")).toMatchObject({ wasteKg: null, wasteKind: "unavailable" });
  });

  it("also prevents a negative cigarette-butt remainder when exact counts exceed the collective total", () => {
    const result = allocateActionParticipantImpact({
      totalWasteKg: null,
      totalCigaretteButts: 10,
      participants: [
        participant("a", toIndividualImpactMeasurement({ individual_cigarette_butts_count: 20 })),
        participant("b"),
      ],
    });

    expect(result.get("a")).toMatchObject({
      cigaretteButts: 20,
      cigaretteButtsInconsistent: true,
      cigaretteButtsMohsEligible: false,
    });
    expect(result.get("b")).toMatchObject({
      cigaretteButts: null,
      cigaretteButtsKind: "unavailable",
    });
    expect([...result.values()].some((value) => (value.cigaretteButts ?? 0) < 0)).toBe(false);
  });

  it("excludes non-confirmed participants", () => {
    const result = allocateActionParticipantImpact({
      totalWasteKg: 10,
      totalCigaretteButts: null,
      participants: [
        { ...participant("pending"), participationStatus: "pending" },
        { ...participant("cancelled"), participationStatus: "cancelled" },
      ],
    });
    expect(result).toEqual(new Map());
  });

  it("versions waste moisture normalization and preserves raw mass", () => {
    expect(toIndividualImpactMeasurement({
      individual_waste_kg: 10,
      individual_waste_condition: "sec",
    })).toMatchObject({ wasteKg: 10, equivalentSecKg: 10, wasteNormalizationVersion: WASTE_MOISTURE_NORMALIZATION_VERSION });
    expect(toIndividualImpactMeasurement({ individual_waste_kg: 10, individual_waste_condition: "humide" })).toMatchObject({ equivalentSecKg: 7 });
    expect(toIndividualImpactMeasurement({ individual_waste_kg: 10, individual_waste_condition: "mouille" })).toMatchObject({ equivalentSecKg: 4 });
    const attribution = allocateActionParticipantImpact({
      totalWasteKg: 10,
      totalCigaretteButts: null,
      participants: [participant("wet", toIndividualImpactMeasurement({ individual_waste_kg: 10, individual_waste_condition: "humide" }))],
    });
    expect(attribution.get("wet")).toMatchObject({
      wasteKg: 10,
      wasteEquivalentSecKg: 7,
      wasteMohsValue: 7,
      wasteMohsSource: "equivalent_sec",
    });
  });

  it("prefers counted butts over mass conversion and uses the canonical engine otherwise", () => {
    expect(toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 7,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "humide",
    })).toMatchObject({ cigaretteButtsCount: 7, comparableButtsCount: 7, comparableButtsProvenance: "counted", cigaretteButtsConversionVersion: null });
    expect(toIndividualImpactMeasurement({
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "humide",
    })).toMatchObject({ comparableButtsCount: 2_000, comparableButtsProvenance: "derived", cigaretteButtsConversionVersion: "impact-terrain-2026-butts-mass-v2" });
    const counted = allocateActionParticipantImpact({
      totalWasteKg: null,
      totalCigaretteButts: 7,
      participants: [participant("counted", toIndividualImpactMeasurement({
        individual_cigarette_butts_count: 7,
        individual_cigarette_butts_mass_kg: 1,
        individual_cigarette_butts_condition: "humide",
      }))],
    });
    expect(counted.get("counted")).toMatchObject({ cigaretteButts: 7, cigaretteButtsProvenance: "counted" });
  });

  it("distinguishes null from an explicit zero", () => {
    expect(buildStoredIndividualImpactMeasurement({ wasteKg: 0, wasteCondition: "sec" }).wasteKg).toBe(0);
    expect(buildStoredIndividualImpactMeasurement({ wasteKg: null }).wasteKg).toBeNull();
    expect(buildStoredIndividualImpactMeasurement({ cigaretteButtsCount: 0 }).cigaretteButtsCount).toBe(0);
    expect(buildStoredIndividualImpactMeasurement({ cigaretteButtsCount: null }).cigaretteButtsCount).toBeNull();
  });

  it("calculates mixed individual lots once and preserves raw and estimated parts", () => {
    const lots = aggregateCigaretteButtsLots([
      { id: "counted", source: "count", value: 10, condition: "propre" },
      { id: "mass", source: "mass_kg", value: 1, condition: "humide" },
      { id: "volume", source: "volume_l", value: 2, condition: "mouille" },
    ]);
    const measurement = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: lots.summary.totalCount,
      individual_cigarette_butts_mass_kg: lots.summary.totalMassKg,
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_lots: lots,
    });

    expect(lots.results.map((lot) => lot.count)).toEqual([10, 2_000, 1_400]);
    expect(measurement).toMatchObject({
      cigaretteButtsLots: lots,
      comparableButtsCount: 3_410,
      comparableButtsProvenance: "derived",
      cigaretteButtsCount: 3_410,
      cigaretteButtsMassKg: lots.summary.totalMassKg,
    });
    expect(measurement?.cigaretteButtsLots?.summary.measuredMassKg).toBe(1);
    expect(measurement?.cigaretteButtsLots?.results[1]?.countProvenance).toBe("weight_converted");
    expect(measurement?.cigaretteButtsLots?.results[2]?.volumeConversionFormulaVersion).toBe(CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION);
  });

  it("keeps a zero lot distinct from no individual measurement", () => {
    const zero = aggregateCigaretteButtsLots([
      { id: "zero", source: "volume_l", value: 0, condition: "propre" },
    ]);
    expect(toIndividualImpactMeasurement({
      individual_cigarette_butts_lots: zero,
      individual_cigarette_butts_count: 0,
      individual_cigarette_butts_mass_kg: 0,
    })).toMatchObject({ comparableButtsCount: 0, cigaretteButtsLots: zero });
    expect(toIndividualImpactMeasurement({
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: null,
    })).toBeNull();
  });

  it("allocates mixed lots between confirmed participants without adding them to the action total", () => {
    const aliceLots = aggregateCigaretteButtsLots([
      { id: "a-count", source: "count", value: 100, condition: "propre" },
      { id: "a-volume", source: "volume_l", value: 1, condition: "humide" },
    ]);
    const bobLots = aggregateCigaretteButtsLots([
      { id: "b-mass", source: "mass_kg", value: 0.1, condition: "propre" },
    ]);
    const result = allocateActionParticipantImpact({
      totalWasteKg: null,
      totalCigaretteButts: 1_300,
      participants: [
        participant("alice", toIndividualImpactMeasurement({ individual_cigarette_butts_lots: aliceLots })),
        participant("bob", toIndividualImpactMeasurement({ individual_cigarette_butts_lots: bobLots })),
        // The allocator must never include a non-confirmed row.
        { ...participant("pending", toIndividualImpactMeasurement({ individual_cigarette_butts_lots: aliceLots })), participationStatus: "pending" },
      ],
    });

    expect(result.get("alice")).toMatchObject({ cigaretteButts: 800, cigaretteButtsKind: "individual" });
    expect(result.get("bob")).toMatchObject({ cigaretteButts: 455, cigaretteButtsKind: "individual" });
    expect(result.has("pending")).toBe(false);
    expect(result.get("alice")?.cigaretteButtsInconsistent).toBe(false);
  });

  it("keeps legacy count and mass as one scalar measurement", () => {
    expect(toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 7,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "humide",
    })).toMatchObject({ comparableButtsCount: 7, cigaretteButtsLots: null });
  });

  it("recalculates only retained derived sources when explicitly requested", () => {
    const current = aggregateCigaretteButtsLots([
      { id: "mass", source: "mass_kg", value: 1, condition: "humide" },
    ]);
    const historical = {
      ...current,
      results: current.results.map((result) => ({
        ...result,
        count: 1_750,
        massConversionFormulaVersion: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
      })),
      summary: {
        ...current.summary,
        totalCount: 1_750,
        estimatedCount: 1_750,
      },
    };
    const historicalRead = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 1_750,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_lots: historical,
    });
    const recalculatedRead = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 1_750,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_lots: historical,
    }, { recalculateDerived: true });

    expect(historicalRead?.comparableButtsCount).toBe(1_750);
    expect(recalculatedRead?.comparableButtsCount).toBe(2_000);
    expect(recalculatedRead?.cigaretteButtsLots?.results[0]?.rawMassKg).toBe(1);
    expect(recalculatedRead?.cigaretteButtsLots?.results[0]?.massConversionFormulaVersion)
      .not.toBe(CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1);
  });

  it("recalculates a legacy mass-derived count but keeps an ambiguous scalar pair unchanged", () => {
    const derived = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "humide",
    }, { recalculateDerived: true });
    const ambiguous = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 7,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "humide",
    }, { recalculateDerived: true });

    expect(derived?.comparableButtsCount).toBe(2_000);
    expect(ambiguous?.comparableButtsCount).toBe(7);
  });

  it("does not recalculate a lot whose historical formula version is unknown", () => {
    const historical = aggregateCigaretteButtsLots([
      { id: "unknown", source: "volume_l", value: 1, condition: "propre" },
    ]);
    const snapshot = {
      ...historical,
      results: historical.results.map((result) => ({
        ...result,
        count: 600,
        volumeConversionFormulaVersion: "cleanmymap-butts-volume-legacy-unknown",
      })),
      summary: {
        ...historical.summary,
        totalCount: 600,
        estimatedCount: 600,
      },
    };

    const recalculated = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 600,
      individual_cigarette_butts_mass_kg: snapshot.summary.totalMassKg,
      individual_cigarette_butts_condition: "propre",
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_lots: snapshot,
    }, { recalculateDerived: true });

    expect(recalculated?.comparableButtsCount).toBe(600);
    expect(recalculated?.cigaretteButtsLots?.results[0]?.count).toBe(600);
    expect(recalculated?.cigaretteButtsLots?.results[0]?.volumeConversionFormulaVersion)
      .toBe("cleanmymap-butts-volume-legacy-unknown");
  });

  it("preserves scalar derived provenance and refuses an unknown conversion version", () => {
    const measurement = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 600,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "propre",
      individual_cigarette_butts_provenance: "derived",
      individual_cigarette_butts_conversion_version: "historical-formula-unknown",
    }, { recalculateDerived: true });

    expect(measurement).toMatchObject({
      cigaretteButtsProvenance: "derived",
      cigaretteButtsConversionVersion: "historical-formula-unknown",
      comparableButtsCount: 600,
      comparableButtsProvenance: "derived",
    });
  });

  it("fails closed when mixed individual lots exceed the collective total", () => {
    const lots = aggregateCigaretteButtsLots([
      { id: "a", source: "volume_l", value: 2, condition: "propre" },
    ]);
    const result = allocateActionParticipantImpact({
      totalWasteKg: null,
      totalCigaretteButts: 1_000,
      participants: [participant("alice", toIndividualImpactMeasurement({ individual_cigarette_butts_lots: lots }))],
    });
    expect(result.get("alice")).toMatchObject({ cigaretteButts: 1_400, cigaretteButtsInconsistent: true, cigaretteButtsMohsEligible: false });
  });
});
