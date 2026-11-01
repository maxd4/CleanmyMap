import { describe, expect, it } from "vitest";
import {
  allocateActionParticipantImpact,
  buildStoredIndividualImpactMeasurement,
  toIndividualImpactMeasurement,
  WASTE_MOISTURE_NORMALIZATION_VERSION,
} from "./individual-impact";
import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
} from "@/lib/impact/impact-terrain-2026";

function participant(
  id: string,
  measurement: ReturnType<typeof toIndividualImpactMeasurement>,
) {
  return { id, participationStatus: "confirmed", measurement };
}

describe("persisted individual scientific versions", () => {
  it("does not invent scientific versions when reading an historical row", () => {
    const measurement = toIndividualImpactMeasurement({
      individual_waste_kg: 10,
      individual_waste_condition: "humide",
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "humide",
      individual_cigarette_butts_provenance: "measured",
      individual_waste_normalization_version: null,
      individual_cigarette_butts_conversion_version: null,
    });

    expect(measurement).toMatchObject({
      wasteNormalizationVersion: null,
      cigaretteButtsConversionVersion: null,
      cigaretteButtsMassKg: 1,
      comparableButtsCount: null,
    });
    expect(measurement?.comparableButtsProvenance).toBeNull();
  });

  it("assigns current versions only while building a new measurement", () => {
    expect(buildStoredIndividualImpactMeasurement({
      wasteKg: 10,
      wasteCondition: "humide",
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
    })).toMatchObject({
      wasteNormalizationVersion: WASTE_MOISTURE_NORMALIZATION_VERSION,
      cigaretteButtsConversionVersion: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
    });
  });

  it("requires an identifiable historical version before recalculating a scalar mass-derived count", () => {
    const unknown = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "humide",
    }, { recalculateDerived: true });
    const derived = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: null,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "humide",
      individual_cigarette_butts_provenance: "measured",
      individual_cigarette_butts_conversion_version: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
    }, { recalculateDerived: true });
    const ambiguous = toIndividualImpactMeasurement({
      individual_cigarette_butts_count: 7,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_condition: "humide",
    }, { recalculateDerived: true });

    expect(unknown?.comparableButtsCount).toBeNull();
    expect(unknown?.cigaretteButtsConversionVersion).toBeNull();
    expect(allocateActionParticipantImpact({
      totalWasteKg: null,
      totalCigaretteButts: null,
      participants: [participant("unknown", unknown)],
    }).get("unknown")).toMatchObject({
      cigaretteButts: null,
      cigaretteButtsMohsEligible: false,
    });
    expect(derived?.comparableButtsCount).toBe(2_000);
    expect(derived?.cigaretteButtsConversionVersion).toBe(CIGARETTE_BUTTS_MASS_CONVERSION_VERSION);
    expect(ambiguous?.comparableButtsCount).toBe(7);
  });
});
