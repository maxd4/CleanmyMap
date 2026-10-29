import {
  deriveVolunteerParticipationFromTotal,
  getVolunteerActionCompositionValidationMessage,
  normalizeVolunteerParticipation,
  resolveEffectiveVolunteerUnits,
  type ActionVolunteerParticipation,
} from "./volunteer-participation";

export const CLEANWALK_YIELD_RESEARCH_STATUS = "RESEARCH / NON NORMATIF" as const;
export const CLEANWALK_YIELD_RESEARCH_VERSION =
  "cleanwalk-yield-research-a-b-c-v1" as const;

export type CleanwalkResearchConfiguration = "ordinary" | "family" | "school";
export type CleanwalkResearchModel = "A" | "B" | "C";
export type CleanwalkResearchTask = "waste" | "cigaretteButts";
export type ResearchAssignmentBasis = "OBSERVED" | "HYPOTHESIS";

export type CigaretteButtCollectorAssignment = {
  count: number;
  basis: ResearchAssignmentBasis;
  hypothesis?: "ALL_ADULTS" | "EXPLICIT";
};

export type CleanwalkYieldReferenceRates = {
  wasteKgPerUnitHour?: number | null;
  cigaretteButtsPerUnitHour?: number | null;
};

export type CleanwalkYieldSimulationInput = {
  volunteersCount: number;
  childrenCount: number;
  retiredCount: number;
  configuration: CleanwalkResearchConfiguration;
  model: CleanwalkResearchModel;
  cigaretteButtCollectors?: CigaretteButtCollectorAssignment | null;
  effectiveCollectionHours?: number | null;
  referenceRates?: CleanwalkYieldReferenceRates | null;
};

type ResearchComposition = {
  volunteersCount: number;
  childrenCount: number;
  adultCount: number;
  retiredCount: number;
  currentEffectiveVolunteerUnits: number;
};

type CapacityAvailability =
  | "AVAILABLE"
  | "MISSING_ASSIGNMENT"
  | "NOT_APPLICABLE"
  | "INVALID_INPUT";

export type ResearchCapacity = {
  value: number | null;
  availability: CapacityAvailability;
  unit: "adult-equivalent-units";
  coefficients: {
    adult: number;
    children: number | null;
    retired: number | null;
  };
  basis: "CURRENT" | "EXPERIMENTAL" | "ASSIGNED" | null;
};

export type ResearchProjection = {
  value: number | null;
  availability:
    | "AVAILABLE"
    | "MISSING_REFERENCE_RATE"
    | "MISSING_DURATION"
    | "MISSING_CAPACITY"
    | "INVALID_REFERENCE_RATE"
    | "INVALID_DURATION"
    | "NOT_APPLICABLE";
  unit: "kg" | "cigarette-butts";
  formula: string;
};

export type CleanwalkYieldSimulationResult = {
  status: typeof CLEANWALK_YIELD_RESEARCH_STATUS;
  version: typeof CLEANWALK_YIELD_RESEARCH_VERSION;
  model: CleanwalkResearchModel;
  configuration: CleanwalkResearchConfiguration;
  availability: "AVAILABLE" | "NOT_APPLICABLE" | "INVALID_INPUT";
  reason: string | null;
  composition: ResearchComposition | null;
  participation: ActionVolunteerParticipation | null;
  capacities: {
    waste: ResearchCapacity;
    cigaretteButts: ResearchCapacity;
  };
  projections: {
    waste: ResearchProjection;
    cigaretteButts: ResearchProjection;
  };
  assumptions: {
    status: typeof CLEANWALK_YIELD_RESEARCH_STATUS;
    model: CleanwalkResearchModel;
    configuration: CleanwalkResearchConfiguration;
    cigaretteButtCollectors: CigaretteButtCollectorAssignment | null;
    notes: readonly string[];
  };
};

export type ResearchComparisonEntry = {
  model: CleanwalkResearchModel;
  value: number | null;
  absoluteDifferenceFromA: number | null;
  relativeDifferenceFromA: number | null;
};

export type CleanwalkYieldModelComparison = {
  status: typeof CLEANWALK_YIELD_RESEARCH_STATUS;
  version: typeof CLEANWALK_YIELD_RESEARCH_VERSION;
  results: Record<CleanwalkResearchModel, CleanwalkYieldSimulationResult>;
  capacities: {
    waste: readonly ResearchComparisonEntry[];
    cigaretteButts: readonly ResearchComparisonEntry[];
  };
};

export type RetiredWasteSensitivityResult = {
  status: typeof CLEANWALK_YIELD_RESEARCH_STATUS;
  version: typeof CLEANWALK_YIELD_RESEARCH_VERSION;
  model: "A" | "B";
  task: "waste";
  coefficientValues: readonly number[];
  results: readonly {
    retiredCoefficient: number;
    value: number | null;
    availability: "AVAILABLE" | "INVALID_COEFFICIENT" | "INVALID_INPUT";
  }[];
};

const MODEL_COEFFICIENTS = {
  A: {
    waste: { adult: 1, children: 0.5, retired: 0.5 },
    cigaretteButts: { adult: 1, children: 0.5, retired: 0.5 },
  },
  B: {
    waste: { adult: 1, children: 0.6, retired: 0.8 },
    cigaretteButts: { adult: 1, children: 0.4, retired: 0.5 },
  },
  C: {
    waste: { adult: 1, children: 0.45, retired: null },
    cigaretteButts: { adult: 1, children: null, retired: null },
  },
} as const;

export const DEFAULT_RETIRED_WASTE_SENSITIVITY = [0.5, 0.8, 1] as const;

function unavailableCapacity(
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

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isModel(value: string): value is CleanwalkResearchModel {
  return value === "A" || value === "B" || value === "C";
}

function isConfiguration(
  value: string,
): value is CleanwalkResearchConfiguration {
  return value === "ordinary" || value === "family" || value === "school";
}

function getComposition(input: CleanwalkYieldSimulationInput): {
  message: string | null;
  participation: ActionVolunteerParticipation | null;
  composition: ResearchComposition | null;
} {
  const message = getVolunteerActionCompositionValidationMessage({
    volunteersCount: input.volunteersCount,
    childrenCount: input.childrenCount,
    retiredCount: input.retiredCount,
  });

  if (message) {
    return { message, participation: null, composition: null };
  }

  const participation = normalizeVolunteerParticipation(
    deriveVolunteerParticipationFromTotal({
      volunteersCount: input.volunteersCount,
      childrenCount: input.childrenCount,
      retiredCount: input.retiredCount,
    }),
  );
  const currentEffectiveVolunteerUnits = resolveEffectiveVolunteerUnits(
    participation,
  );

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

function projection(
  capacity: ResearchCapacity,
  durationHours: number | null | undefined,
  referenceRate: number | null | undefined,
  unit: ResearchProjection["unit"],
  formula: string,
): ResearchProjection {
  if (capacity.availability === "NOT_APPLICABLE") {
    return {
      value: null,
      availability: "NOT_APPLICABLE",
      unit,
      formula,
    };
  }
  if (capacity.value === null) {
    return {
      value: null,
      availability: "MISSING_CAPACITY",
      unit,
      formula,
    };
  }
  if (durationHours === null || durationHours === undefined) {
    return {
      value: null,
      availability: "MISSING_DURATION",
      unit,
      formula,
    };
  }
  if (!isNonNegativeFinite(durationHours)) {
    return {
      value: null,
      availability: "INVALID_DURATION",
      unit,
      formula,
    };
  }
  if (referenceRate === null || referenceRate === undefined) {
    return {
      value: null,
      availability: "MISSING_REFERENCE_RATE",
      unit,
      formula,
    };
  }
  if (!isNonNegativeFinite(referenceRate)) {
    return {
      value: null,
      availability: "INVALID_REFERENCE_RATE",
      unit,
      formula,
    };
  }
  return {
    value: referenceRate * durationHours * capacity.value,
    availability: "AVAILABLE",
    unit,
    formula,
  };
}

function compareValues(
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

export function simulateCleanwalkYield(
  input: CleanwalkYieldSimulationInput,
): CleanwalkYieldSimulationResult {
  const modelIsValid = isModel(input.model);
  const configurationIsValid = isConfiguration(input.configuration);
  const model = modelIsValid ? input.model : "A";
  const configuration = configurationIsValid ? input.configuration : "ordinary";
  const coefficients = MODEL_COEFFICIENTS[model];
  const compositionResult = getComposition(input);
  const notes = [
    "Résultat de recherche RESEARCH / NON NORMATIF; aucune performance terrain n'est mesurée.",
    "Les capacités sont des unités relatives hypothétiques et ne remplacent ni volunteersCount ni une quantité collectée.",
  ];
  const assignment = input.cigaretteButtCollectors ?? null;

  const invalidInputReason = !modelIsValid
    ? "Le modèle expérimental est inconnu."
    : !configurationIsValid
      ? "La configuration est inconnue."
      : compositionResult.message;

  if (invalidInputReason) {
    return {
      status: CLEANWALK_YIELD_RESEARCH_STATUS,
      version: CLEANWALK_YIELD_RESEARCH_VERSION,
      model,
      configuration,
      availability: "INVALID_INPUT",
      reason: invalidInputReason,
      composition: null,
      participation: null,
      capacities: {
        waste: unavailableCapacity("INVALID_INPUT", coefficients.waste),
        cigaretteButts: unavailableCapacity(
          "INVALID_INPUT",
          coefficients.cigaretteButts,
        ),
      },
      projections: {
        waste: projection(
          unavailableCapacity("INVALID_INPUT", coefficients.waste),
          input.effectiveCollectionHours,
          input.referenceRates?.wasteKgPerUnitHour,
          "kg",
          "R_D × T_eff × U_D",
        ),
        cigaretteButts: projection(
          unavailableCapacity("INVALID_INPUT", coefficients.cigaretteButts),
          input.effectiveCollectionHours,
          input.referenceRates?.cigaretteButtsPerUnitHour,
          "cigarette-butts",
          "R_M × T_eff × U_M",
        ),
      },
      assumptions: {
        status: CLEANWALK_YIELD_RESEARCH_STATUS,
        model,
        configuration,
        cigaretteButtCollectors: assignment,
        notes,
      },
    };
  }

  const composition = compositionResult.composition as ResearchComposition;
  const participation = compositionResult.participation as ActionVolunteerParticipation;
  const isSchoolConfiguration = configuration === "school";
  const modelNotApplicable =
    (model === "B" && isSchoolConfiguration) ||
    (model === "C" && (!isSchoolConfiguration || composition.retiredCount > 0));

  if (modelNotApplicable) {
    const reason =
      model === "B"
        ? "Le modèle B est défini pour les configurations ordinaire et familiale."
        : isSchoolConfiguration
          ? "Le modèle C ne définit aucun coefficient scolaire en présence de retraités."
          : "Le modèle C est défini uniquement pour une configuration scolaire.";
    return {
      status: CLEANWALK_YIELD_RESEARCH_STATUS,
      version: CLEANWALK_YIELD_RESEARCH_VERSION,
      model,
      configuration,
      availability: "NOT_APPLICABLE",
      reason,
      composition,
      participation,
      capacities: {
        waste: unavailableCapacity("NOT_APPLICABLE", coefficients.waste),
        cigaretteButts: unavailableCapacity(
          "NOT_APPLICABLE",
          coefficients.cigaretteButts,
        ),
      },
      projections: {
        waste: projection(
          unavailableCapacity("NOT_APPLICABLE", coefficients.waste),
          input.effectiveCollectionHours,
          input.referenceRates?.wasteKgPerUnitHour,
          "kg",
          "R_D × T_eff × U_D",
        ),
        cigaretteButts: projection(
          unavailableCapacity("NOT_APPLICABLE", coefficients.cigaretteButts),
          input.effectiveCollectionHours,
          input.referenceRates?.cigaretteButtsPerUnitHour,
          "cigarette-butts",
          "R_M × T_eff × U_M",
        ),
      },
      assumptions: {
        status: CLEANWALK_YIELD_RESEARCH_STATUS,
        model,
        configuration,
        cigaretteButtCollectors: assignment,
        notes: [...notes, reason],
      },
    };
  }

  const wasteValue =
    model === "A"
      ? composition.currentEffectiveVolunteerUnits
      : composition.adultCount * coefficients.waste.adult +
        composition.childrenCount * (coefficients.waste.children ?? 0) +
        composition.retiredCount * (coefficients.waste.retired ?? 0);
  const wasteCapacity: ResearchCapacity = {
    value: wasteValue,
    availability: "AVAILABLE",
    unit: "adult-equivalent-units",
    coefficients: coefficients.waste,
    basis: model === "A" ? "CURRENT" : "EXPERIMENTAL",
  };

  let cigaretteButtCapacity: ResearchCapacity;
  if (model === "C") {
    if (!assignment) {
      cigaretteButtCapacity = unavailableCapacity(
        "MISSING_ASSIGNMENT",
        coefficients.cigaretteButts,
      );
    } else if (
      !Number.isInteger(assignment.count) ||
      !isNonNegativeFinite(assignment.count) ||
      assignment.count > composition.adultCount
    ) {
      cigaretteButtCapacity = unavailableCapacity(
        "INVALID_INPUT",
        coefficients.cigaretteButts,
      );
    } else {
      cigaretteButtCapacity = {
        value: assignment.count,
        availability: "AVAILABLE",
        unit: "adult-equivalent-units",
        coefficients: coefficients.cigaretteButts,
        basis: "ASSIGNED",
      };
    }
  } else {
    cigaretteButtCapacity = {
      value:
        composition.adultCount * coefficients.cigaretteButts.adult +
        composition.childrenCount * (coefficients.cigaretteButts.children ?? 0) +
        composition.retiredCount * (coefficients.cigaretteButts.retired ?? 0),
      availability: "AVAILABLE",
      unit: "adult-equivalent-units",
      coefficients: coefficients.cigaretteButts,
      basis: model === "A" ? "CURRENT" : "EXPERIMENTAL",
    };
  }

  const assignmentNote = assignment
    ? `L'affectation des mégots est ${assignment.basis.toLowerCase()}${assignment.hypothesis ? ` (${assignment.hypothesis})` : ""}.`
    : "Aucune affectation effective des adultes aux mégots n'est inventée.";
  return {
    status: CLEANWALK_YIELD_RESEARCH_STATUS,
    version: CLEANWALK_YIELD_RESEARCH_VERSION,
    model,
    configuration,
    availability: "AVAILABLE",
    reason: null,
    composition,
    participation,
    capacities: {
      waste: wasteCapacity,
      cigaretteButts: cigaretteButtCapacity,
    },
    projections: {
      waste: projection(
        wasteCapacity,
        input.effectiveCollectionHours,
        input.referenceRates?.wasteKgPerUnitHour,
        "kg",
        "R_D × T_eff × U_D",
      ),
      cigaretteButts: projection(
        cigaretteButtCapacity,
        input.effectiveCollectionHours,
        input.referenceRates?.cigaretteButtsPerUnitHour,
        "cigarette-butts",
        "R_M × T_eff × U_M",
      ),
    },
    assumptions: {
      status: CLEANWALK_YIELD_RESEARCH_STATUS,
      model,
      configuration,
      cigaretteButtCollectors: assignment,
      notes: [...notes, assignmentNote],
    },
  };
}

export function compareCleanwalkYieldModels(
  input: Omit<CleanwalkYieldSimulationInput, "model">,
): CleanwalkYieldModelComparison {
  const results = {
    A: simulateCleanwalkYield({ ...input, model: "A" }),
    B: simulateCleanwalkYield({ ...input, model: "B" }),
    C: simulateCleanwalkYield({ ...input, model: "C" }),
  } satisfies Record<CleanwalkResearchModel, CleanwalkYieldSimulationResult>;

  return {
    status: CLEANWALK_YIELD_RESEARCH_STATUS,
    version: CLEANWALK_YIELD_RESEARCH_VERSION,
    results,
    capacities: {
      waste: compareValues([
        results.A.capacities.waste.value,
        results.B.capacities.waste.value,
        results.C.capacities.waste.value,
      ]),
      cigaretteButts: compareValues([
        results.A.capacities.cigaretteButts.value,
        results.B.capacities.cigaretteButts.value,
        results.C.capacities.cigaretteButts.value,
      ]),
    },
  };
}

export function compareRetiredWasteCoefficientSensitivity(
  input: Omit<CleanwalkYieldSimulationInput, "model"> & {
    model: "A" | "B";
    retiredCoefficients?: readonly number[];
  },
): RetiredWasteSensitivityResult {
  const base = simulateCleanwalkYield(input);
  const coefficientValues =
    input.retiredCoefficients ?? DEFAULT_RETIRED_WASTE_SENSITIVITY;
  const childCoefficient = input.model === "A" ? 0.5 : 0.6;
  const results = coefficientValues.map((retiredCoefficient) => {
    if (!isNonNegativeFinite(retiredCoefficient)) {
      return {
        retiredCoefficient,
        value: null,
        availability: "INVALID_COEFFICIENT" as const,
      };
    }
    if (!base.composition) {
      return {
        retiredCoefficient,
        value: null,
        availability: "INVALID_INPUT" as const,
      };
    }
    return {
      retiredCoefficient,
      value:
        base.composition.adultCount +
        childCoefficient * base.composition.childrenCount +
        retiredCoefficient * base.composition.retiredCount,
      availability: "AVAILABLE" as const,
    };
  });

  return {
    status: CLEANWALK_YIELD_RESEARCH_STATUS,
    version: CLEANWALK_YIELD_RESEARCH_VERSION,
    model: input.model,
    task: "waste",
    coefficientValues,
    results,
  };
}
