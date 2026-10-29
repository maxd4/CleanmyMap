export const EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION =
  "effective-volunteer-units-v1" as const;

const VOLUNTEER_CATEGORY_WEIGHTS = {
  children: 0.5,
  adult: 1,
  retired: 0.5,
} as const;

export type ActionVolunteerParticipation = {
  childrenCount: number | null;
  adultCount: number | null;
  retiredCount: number | null;
  participantsCount: number | null;
  effectiveVolunteerUnits: number | null;
  effectiveVolunteerUnitsFormulaVersion: string | null;
};

export type VolunteerParticipationInput = {
  childrenCount?: number | null;
  adultCount?: number | null;
  retiredCount?: number | null;
};

export type VolunteerParticipationFormInput = {
  childrenCount: string;
  adultCount: string;
  retiredCount: string;
};

export type ActionVolunteerCompositionInput = {
  volunteersCount: number | null | undefined;
  childrenCount: number | null | undefined;
  retiredCount: number | null | undefined;
};

export type VolunteerForecastValidationInput = {
  volunteersExpected?: number | null;
  volunteerParticipation?: VolunteerParticipationInput | null;
};

function normalizeCount(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.trunc(value);
}

function normalizeIntegerCount(value: number | null | undefined): number | null {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 500
  ) {
    return null;
  }
  return value;
}

export function deriveAdultCountFromTotal(
  input: ActionVolunteerCompositionInput,
): number | null {
  const volunteersCount = normalizeIntegerCount(input.volunteersCount);
  const childrenCount = normalizeIntegerCount(input.childrenCount);
  const retiredCount = normalizeIntegerCount(input.retiredCount);

  if (
    volunteersCount === null ||
    childrenCount === null ||
    retiredCount === null
  ) {
    return null;
  }

  return volunteersCount - childrenCount - retiredCount;
}

export function deriveVolunteerParticipationFromTotal(
  input: ActionVolunteerCompositionInput,
): VolunteerParticipationInput {
  const childrenCount = normalizeIntegerCount(input.childrenCount);
  const retiredCount = normalizeIntegerCount(input.retiredCount);
  return {
    childrenCount,
    adultCount: deriveAdultCountFromTotal(input),
    retiredCount,
  };
}

export function getVolunteerActionCompositionValidationMessage(
  input: ActionVolunteerCompositionInput,
): string | null {
  const volunteersCount = input.volunteersCount;
  const childrenCount = input.childrenCount;
  const retiredCount = input.retiredCount;

  if (
    volunteersCount === null ||
    volunteersCount === undefined ||
    !Number.isInteger(volunteersCount) ||
    volunteersCount < 1 ||
    volunteersCount > 500
  ) {
    return "Renseignez un nombre total de participants entier compris entre 1 et 500.";
  }

  if (
    childrenCount === null ||
    childrenCount === undefined ||
    retiredCount === null ||
    retiredCount === undefined
  ) {
    return "Renseignez les nombres entiers d’enfants et de retraités présents.";
  }

  if (
    !Number.isInteger(childrenCount) ||
    !Number.isInteger(retiredCount) ||
    childrenCount < 0 ||
    retiredCount < 0 ||
    childrenCount > 500 ||
    retiredCount > 500
  ) {
    return "Les nombres d’enfants et de retraités doivent être des entiers positifs ou nuls.";
  }

  if (childrenCount + retiredCount > volunteersCount) {
    return "Le nombre d’enfants et de retraités ne peut pas dépasser le total des participants.";
  }

  return null;
}

export function normalizeActionVolunteerParticipationFromTotal(input: {
  volunteersCount: number | null | undefined;
  volunteerParticipation: VolunteerParticipationInput | null | undefined;
}): ActionVolunteerParticipation | null {
  if (!input.volunteerParticipation) return null;

  return normalizeVolunteerParticipation(
    deriveVolunteerParticipationFromTotal({
      volunteersCount: input.volunteersCount,
      childrenCount: input.volunteerParticipation.childrenCount,
      retiredCount: input.volunteerParticipation.retiredCount,
    }),
  );
}

export function hasVolunteerCategoryData(
  input: VolunteerParticipationInput | null | undefined,
): boolean {
  return Boolean(
    input &&
      (input.childrenCount != null ||
        input.adultCount != null ||
        input.retiredCount != null),
  );
}

export function hasCompleteVolunteerCategoryData(
  participation: Pick<
    ActionVolunteerParticipation,
    "childrenCount" | "adultCount" | "retiredCount"
  >,
): boolean {
  return (
    participation.childrenCount !== null &&
    participation.adultCount !== null &&
    participation.retiredCount !== null
  );
}

export function getVolunteerForecastValidationMessage(
  input: VolunteerForecastValidationInput,
): string | null {
  const childrenCount = input.volunteerParticipation?.childrenCount ?? null;
  const adultCount = input.volunteerParticipation?.adultCount ?? null;
  const retiredCount = input.volunteerParticipation?.retiredCount ?? null;
  const hasAnyCategory = hasVolunteerCategoryData({
    childrenCount,
    adultCount,
    retiredCount,
  });

  if (!hasAnyCategory) return null;

  if (
    childrenCount === null ||
    adultCount === null ||
    retiredCount === null
  ) {
    return "La répartition facultative doit renseigner Enfants, Adultes et Retraités, ou rester entièrement vide.";
  }

  if (input.volunteersExpected === null || input.volunteersExpected === undefined) {
    return "Renseignez le nombre total de bénévoles attendus pour utiliser la répartition.";
  }

  const categoryTotal = childrenCount + adultCount + retiredCount;
  if (categoryTotal !== input.volunteersExpected) {
    return `La somme de la répartition (${categoryTotal}) doit correspondre au nombre total attendu (${input.volunteersExpected}).`;
  }

  return null;
}

/**
 * Central métier for the new volunteer source contract.
 * Derived totals are recalculated and never accepted as source input.
 */
export function normalizeVolunteerParticipation(
  input: VolunteerParticipationInput | null | undefined,
): ActionVolunteerParticipation {
  const childrenCount = normalizeCount(input?.childrenCount);
  const adultCount = normalizeCount(input?.adultCount);
  const retiredCount = normalizeCount(input?.retiredCount);
  const complete = hasCompleteVolunteerCategoryData({
    childrenCount,
    adultCount,
    retiredCount,
  });

  if (!complete) {
    return {
      childrenCount,
      adultCount,
      retiredCount,
      participantsCount: null,
      effectiveVolunteerUnits: null,
      effectiveVolunteerUnitsFormulaVersion: null,
    };
  }

  const normalizedChildrenCount = childrenCount as number;
  const normalizedAdultCount = adultCount as number;
  const normalizedRetiredCount = retiredCount as number;
  const participantsCount =
    normalizedChildrenCount + normalizedAdultCount + normalizedRetiredCount;
  const effectiveVolunteerUnits =
    normalizedAdultCount * VOLUNTEER_CATEGORY_WEIGHTS.adult +
    normalizedChildrenCount * VOLUNTEER_CATEGORY_WEIGHTS.children +
    normalizedRetiredCount * VOLUNTEER_CATEGORY_WEIGHTS.retired;

  return {
    childrenCount,
    adultCount,
    retiredCount,
    participantsCount,
    effectiveVolunteerUnits,
    effectiveVolunteerUnitsFormulaVersion:
      EFFECTIVE_VOLUNTEER_UNITS_FORMULA_VERSION,
  };
}

export function normalizeVolunteerParticipationFromForm(
  input: VolunteerParticipationFormInput,
): ActionVolunteerParticipation {
  const toCount = (value: string) => value.trim() === "" ? null : Number(value);
  return normalizeVolunteerParticipation({
    childrenCount: toCount(input.childrenCount),
    adultCount: toCount(input.adultCount),
    retiredCount: toCount(input.retiredCount),
  });
}

export function getVolunteerParticipationDisclosureDetail(
  input: VolunteerParticipationFormInput,
): string {
  const hasVolunteerCategoryInput = [
    input.childrenCount,
    input.adultCount,
    input.retiredCount,
  ].some((value) => value.trim() !== "");
  if (!hasVolunteerCategoryInput) return "facultatif";

  const participation = normalizeVolunteerParticipationFromForm(input);
  return participation.participantsCount === null
    ? "à compléter"
    : `${participation.participantsCount} répartis`;
}

export function resolveParticipantsCount(params: {
  volunteerParticipation?: ActionVolunteerParticipation | null;
  legacyVolunteersCount?: number | null;
}): number {
  const normalized = params.volunteerParticipation
    ? normalizeVolunteerParticipation(params.volunteerParticipation)
    : null;
  const derived = normalized?.participantsCount;
  if (typeof derived === "number" && Number.isFinite(derived)) {
    return Math.max(0, Math.trunc(derived));
  }

  const legacy = params.legacyVolunteersCount;
  return typeof legacy === "number" && Number.isFinite(legacy)
    ? Math.max(0, Math.trunc(legacy))
    : 0;
}

export function resolveEffectiveVolunteerUnits(
  participation: ActionVolunteerParticipation | null | undefined,
): number | null {
  const units = participation
    ? normalizeVolunteerParticipation(participation).effectiveVolunteerUnits
    : null;
  return typeof units === "number" && Number.isFinite(units) ? units : null;
}
