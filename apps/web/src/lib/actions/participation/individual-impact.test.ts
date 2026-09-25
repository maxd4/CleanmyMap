import { describe, expect, it } from "vitest";
import {
  allocateActionParticipantImpact,
  buildStoredIndividualImpactMeasurement,
  toIndividualImpactMeasurement,
  WASTE_MOISTURE_NORMALIZATION_VERSION,
} from "./individual-impact";

function participant(id: string, measurement: ReturnType<typeof toIndividualImpactMeasurement> = null) {
  return { id, participationStatus: "confirmed", measurement };
}

describe("individual action impact attribution", () => {
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
  });

  it("distinguishes null from an explicit zero", () => {
    expect(buildStoredIndividualImpactMeasurement({ wasteKg: 0, wasteCondition: "sec" }).wasteKg).toBe(0);
    expect(buildStoredIndividualImpactMeasurement({ wasteKg: null }).wasteKg).toBeNull();
    expect(buildStoredIndividualImpactMeasurement({ cigaretteButtsCount: 0 }).cigaretteButtsCount).toBe(0);
    expect(buildStoredIndividualImpactMeasurement({ cigaretteButtsCount: null }).cigaretteButtsCount).toBeNull();
  });
});
