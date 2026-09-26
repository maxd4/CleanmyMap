import { describe, expect, it } from "vitest";
import {
  allocateActionParticipantImpact,
  buildStoredIndividualImpactMeasurement,
  toIndividualImpactMeasurement,
  WASTE_MOISTURE_NORMALIZATION_VERSION,
} from "./individual-impact";
import { normalizeVolunteerParticipation } from "../volunteer-participation";

function participant(id: string, measurement: ReturnType<typeof toIndividualImpactMeasurement> = null) {
  return { id, participationStatus: "confirmed", measurement };
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
    expect(attribution.size).toBe(2);
    expect([...attribution.values()].map((value) => value.wasteKg)).toEqual([10, 10]);
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
    expect(attribution.size).toBe(2);
    expect([...attribution.values()].map((value) => value.wasteKg)).toEqual([10, 10]);
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
    })).toMatchObject({ comparableButtsCount: 1_750, comparableButtsProvenance: "derived", cigaretteButtsConversionVersion: "impact-terrain-2026-butts-mass-v1" });
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
});
