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

export type PersistedVolunteerComposition = {
  children_count: number | null;
  adult_count: number | null;
  retired_count: number | null;
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

  if (!isValidVolunteerTotal(volunteersCount)) {
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

  if (!areValidVolunteerCategories(childrenCount, retiredCount)) {
    return "Les nombres d’enfants et de retraités doivent être des entiers positifs ou nuls.";
  }

  if (childrenCount + retiredCount > volunteersCount) {
    return "Le nombre d’enfants et de retraités ne peut pas dépasser le total des participants.";
  }

  return null;
}

function isValidVolunteerTotal(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isInteger(value) && value >= 1 && value <= 500;
}

function areValidVolunteerCategories(
  childrenCount: number,
  retiredCount: number,
): boolean {
  return Number.isInteger(childrenCount) && Number.isInteger(retiredCount) &&
    childrenCount >= 0 && retiredCount >= 0 && childrenCount <= 500 && retiredCount <= 500;
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

/**
 * Projects the complete, validated composition to the typed action columns.
 * Incomplete or inconsistent legacy/form states remain NULL instead of
 * inventing an adult count from the total.
 */
export function resolvePersistedVolunteerComposition(params: {
  participation: ActionVolunteerParticipation | null | undefined;
  volunteersCount: number | null | undefined;
}): PersistedVolunteerComposition {
  const participation = params.participation
    ? normalizeVolunteerParticipation(params.participation)
    : null;
  const volunteersCount = normalizeIntegerCount(params.volunteersCount);
  if (
    !participation ||
    participation.childrenCount === null ||
    participation.adultCount === null ||
    participation.retiredCount === null ||
    volunteersCount === null
  ) {
    return { children_count: null, adult_count: null, retired_count: null };
  }

  const childrenCount = participation.childrenCount as number;
  const adultCount = participation.adultCount as number;
  const retiredCount = participation.retiredCount as number;
  if (childrenCount + adultCount + retiredCount !== volunteersCount) {
    return { children_count: null, adult_count: null, retired_count: null };
  }

  return {
    children_count: childrenCount,
    adult_count: adultCount,
    retired_count: retiredCount,
  };
}

export function normalizePersistedVolunteerComposition(params: {
  childrenCount: number | null | undefined;
  adultCount: number | null | undefined;
  retiredCount: number | null | undefined;
}): ActionVolunteerParticipation | null {
  const childrenCount = normalizeIntegerCount(params.childrenCount);
  const adultCount = normalizeIntegerCount(params.adultCount);
  const retiredCount = normalizeIntegerCount(params.retiredCount);
  if (childrenCount === null || adultCount === null || retiredCount === null) {
    return null;
  }
  return normalizeVolunteerParticipation({ childrenCount, adultCount, retiredCount });
}

/**
 * Resolves a final composition from the typed action columns, with a bounded
 * compatibility fallback for historical rows that have no typed values.
 * Present but incomplete or incoherent typed values fail closed and never
 * fall back to divergent historical metadata.
 */
export function resolvePersistedVolunteerParticipation(params: {
  childrenCount: number | null | undefined;
  adultCount: number | null | undefined;
  retiredCount: number | null | undefined;
  volunteersCount: number | null | undefined;
  legacyParticipation?: ActionVolunteerParticipation | null;
}): ActionVolunteerParticipation | null {
  const hasTypedValue = [
    params.childrenCount,
    params.adultCount,
    params.retiredCount,
  ].some((value) => value !== null && value !== undefined);
  const typedParticipation = normalizePersistedVolunteerComposition({
    childrenCount: params.childrenCount,
    adultCount: params.adultCount,
    retiredCount: params.retiredCount,
  });

  if (hasTypedValue) {
    const persisted = resolvePersistedVolunteerComposition({
      participation: typedParticipation,
      volunteersCount: params.volunteersCount,
    });
    return persisted.children_count === null
      ? null
      : normalizePersistedVolunteerComposition({
          childrenCount: persisted.children_count,
          adultCount: persisted.adult_count,
          retiredCount: persisted.retired_count,
        });
  }

  const legacyParticipation = params.legacyParticipation
    ? normalizeVolunteerParticipation(params.legacyParticipation)
    : null;
  const persisted = resolvePersistedVolunteerComposition({
    participation: legacyParticipation,
    volunteersCount: params.volunteersCount,
  });
  return persisted.children_count === null
    ? null
    : normalizePersistedVolunteerComposition({
        childrenCount: persisted.children_count,
        adultCount: persisted.adult_count,
        retiredCount: persisted.retired_count,
      });
}
