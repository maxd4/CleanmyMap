import { describe, expect, it } from "vitest";
import { allocateActionParticipantImpact, toIndividualImpactMeasurement } from "./individual-impact";

function attendee(
  id: string,
  collectionStatus?: "collected" | "not_collected" | null,
  measurement: ReturnType<typeof toIndividualImpactMeasurement> = null,
) {
  return { id, participationStatus: "confirmed", collectionStatus, measurement };
}

function allocate(collectorsCount: number | null, participants: ReturnType<typeof attendee>[]) {
  return allocateActionParticipantImpact({
    totalWasteKg: 100,
    totalCigaretteButts: null,
    collectorsCount,
    collectionAttributionVersion: "collectors-v1",
    participants,
  });
}

describe("collectors-v1 completeness", () => {
  it("does not allocate 100 kg to one identified collector when 12 are declared among 20 attendees", () => {
    const participants = [attendee("identified", "collected"), ...Array.from({ length: 19 }, (_, i) => attendee(`unknown-${i}`))];
    const result = allocate(12, participants);

    expect(result.get("identified")).toMatchObject({ wasteKg: null, wasteKind: "unavailable" });
    expect([...result.values()].every((value) => value.wasteKind !== "quote_part")).toBe(true);
  });

  it("keeps exact measures and leaves quotes unavailable when collector identities are partial or unknown", () => {
    const exact = toIndividualImpactMeasurement({ individual_waste_kg: 7, individual_waste_condition: "sec" });
    for (const collectorsCount of [12, null]) {
      const result = allocate(collectorsCount, [attendee("measured", null, exact), attendee("identified", "collected")]);
      expect(result.get("measured")).toMatchObject({ wasteKg: 7, wasteKind: "individual" });
      expect(result.get("identified")).toMatchObject({ wasteKg: null, wasteKind: "unavailable" });
    }
  });

  it("allocates only when identified collectors equal the known aggregate", () => {
    const attendees = [
      ...Array.from({ length: 12 }, (_, i) => attendee(`collector-${i}`, "collected")),
      ...Array.from({ length: 8 }, (_, i) => attendee(`present-${i}`, "not_collected")),
    ];
    const result = allocate(12, attendees);
    expect(result.get("collector-0")).toMatchObject({ wasteKg: 100 / 12, wasteKind: "quote_part" });
    expect(result.get("present-0")).toMatchObject({ wasteKg: null, wasteKind: "unavailable" });
  });

  it("retains exact values but marks not_collected contradictions and collector overcounts", () => {
    const exact = toIndividualImpactMeasurement({ individual_waste_kg: 5, individual_waste_condition: "sec" });
    const result = allocate(1, [attendee("measured", "not_collected", exact), attendee("overcount", "collected"), attendee("extra", "collected")]);
    expect(result.get("measured")).toMatchObject({ wasteKg: 5, wasteKind: "individual", wasteInconsistent: true, wasteMohsEligible: false });
    expect(result.get("overcount")).toMatchObject({ wasteKg: null, wasteKind: "unavailable", wasteInconsistent: true });
  });

  it("does not issue a waste quote when the contradiction is an exact cigarette measure", () => {
    const buttsOnly = toIndividualImpactMeasurement({ individual_cigarette_butts_count: 4 });
    const result = allocate(1, [
      attendee("contradictory", "not_collected", buttsOnly),
      attendee("identified", "collected"),
    ]);

    expect(result.get("contradictory")).toMatchObject({
      cigaretteButts: 4,
      cigaretteButtsKind: "individual",
      cigaretteButtsInconsistent: true,
      wasteKg: null,
      wasteKind: "unavailable",
      wasteInconsistent: true,
    });
    expect(result.get("identified")).toMatchObject({ wasteKg: null, wasteKind: "unavailable" });
  });
});
