import {
  deriveVolunteerParticipationFromTotal,
  getVolunteerActionCompositionValidationMessage,
  normalizeVolunteerParticipation,
  resolveEffectiveVolunteerUnits,
  type ActionVolunteerParticipation,
} from "./volunteer-participation";
import type {
  CapacityAvailability,
  CleanwalkResearchConfiguration,
  CleanwalkResearchModel,
  CleanwalkYieldSimulationInput,
  ResearchCapacity,
  ResearchComparisonEntry,
  ResearchComposition,
  ResearchProjection,
} from "./volunteer-participation-research";

export function unavailableCapacity(
  availability: CapacityAvailability,
  coefficients: ResearchCapacity["coefficients"],
  basis: ResearchCapacity["basis"] = null,
): ResearchCapacity {
  return {
    value: null,
    availability,
    unit: "adult-equivalent-units",
    coefficients,
    basis,
  };
}

export function isModel(value: string): value is CleanwalkResearchModel {
  return value === "A" || value === "B" || value === "C";
}

export function isConfiguration(
  value: string,
): value is CleanwalkResearchConfiguration {
  return value === "ordinary" || value === "family" || value === "school";
}

export function getComposition(input: CleanwalkYieldSimulationInput): {
  message: string | null;
  participation: ActionVolunteerParticipation | null;
  composition: ResearchComposition | null;
} {
  const message = getVolunteerActionCompositionValidationMessage({
    volunteersCount: input.volunteersCount,
    childrenCount: input.childrenCount,
    retiredCount: input.retiredCount,
  });

  if (message) return { message, participation: null, composition: null };

  const participation = normalizeVolunteerParticipation(
    deriveVolunteerParticipationFromTotal({
      volunteersCount: input.volunteersCount,
      childrenCount: input.childrenCount,
      retiredCount: input.retiredCount,
    }),
  );
  const currentEffectiveVolunteerUnits = resolveEffectiveVolunteerUnits(participation);

  if (currentEffectiveVolunteerUnits === null) {
    return {
      message: "La composition canonique est indisponible.",
      participation: null,
      composition: null,
    };
  }

  return {
    message: null,
    participation,
    composition: {
      volunteersCount: input.volunteersCount,
      childrenCount: input.childrenCount,
      adultCount: participation.adultCount as number,
      retiredCount: input.retiredCount,
      currentEffectiveVolunteerUnits,
    },
  };
}

export function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function projection(
  capacity: ResearchCapacity,
  durationHours: number | null | undefined,
  referenceRate: number | null | undefined,
  unit: ResearchProjection["unit"],
  formula: string,
): ResearchProjection {
  if (capacity.availability === "NOT_APPLICABLE") {
    return { value: null, availability: "NOT_APPLICABLE", unit, formula };
  }
  if (capacity.value === null) {
    return { value: null, availability: "MISSING_CAPACITY", unit, formula };
  }
  if (durationHours === null || durationHours === undefined) {
    return { value: null, availability: "MISSING_DURATION", unit, formula };
  }
  if (!isNonNegativeFinite(durationHours)) {
    return { value: null, availability: "INVALID_DURATION", unit, formula };
  }
  if (referenceRate === null || referenceRate === undefined) {
    return { value: null, availability: "MISSING_REFERENCE_RATE", unit, formula };
  }
  if (!isNonNegativeFinite(referenceRate)) {
    return { value: null, availability: "INVALID_REFERENCE_RATE", unit, formula };
  }
  return { value: referenceRate * durationHours * capacity.value, availability: "AVAILABLE", unit, formula };
}

export function compareValues(
  values: readonly (number | null)[],
): readonly ResearchComparisonEntry[] {
  const models: readonly CleanwalkResearchModel[] = ["A", "B", "C"];
  const baseline = values[0];
  return models.map((model, index) => {
    const value = values[index];
    const comparable = typeof baseline === "number" && typeof value === "number";
    const difference = comparable ? value - baseline : null;
    return {
      model,
      value,
      absoluteDifferenceFromA: difference,
      relativeDifferenceFromA:
        comparable && baseline !== 0 ? (difference as number) / baseline : null,
    };
  });
}
