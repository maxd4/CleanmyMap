export type PollutionScoreScope = "global" | "department";

export type PollutionScoreReference = {
  wastePerVolunteer: number | null;
  buttsPerVolunteer: number | null;
  wasteSourceCount: number;
  buttsSourceCount: number;
};

export type DepartmentPollutionScoreReference = PollutionScoreReference & {
  departmentName: string | null;
  eligibleActionCount: number;
};

export type PollutionScoreReferences = {
  global: PollutionScoreReference;
  departmentReferences?: Readonly<Record<string, DepartmentPollutionScoreReference>>;
};

export type PollutionScoreBreakdown = {
  wasteScore: number | null;
  buttsScore: number | null;
  severityScore: number | null;
};

export type PollutionScoreInputs = {
  wasteKg?: number | null;
  cigaretteButts?: number | null;
  volunteersCount?: number | null;
  durationMinutes?: number | null;
  actionType?: "action" | "spot" | "clean_place";
  status?: string | null;
  actionPhase?: string | null;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isValidMetric(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0;
}

function resolveVolunteerCount(inputs: PollutionScoreInputs): number {
  const volunteersCount = Math.trunc(Number(inputs.volunteersCount ?? 1) || 1);
  return Math.max(1, volunteersCount);
}

function resolveReference(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function computeComponentScore(
  amount: number | null | undefined,
  volunteerCount: number | null,
  reference: number | null | undefined,
): number | null {
  if (!isValidMetric(amount) || volunteerCount === null) {
    return null;
  }
  const normalizedReference = resolveReference(reference);
  if (normalizedReference === null) {
    return null;
  }

  return clampScore((100 * (amount / volunteerCount)) / normalizedReference);
}

export function computePollutionScoresRelativeToReferences(
  inputs: PollutionScoreInputs,
  references?: PollutionScoreReference | null,
): PollutionScoreBreakdown {
  // The pre-77 scorer is a pure normalization helper. Population selection
  // belongs to the reference RPC/public map boundary, not to this calculation;
  // duration, entity type, status and phase are intentionally not score inputs.
  if (!references) {
    return { wasteScore: null, buttsScore: null, severityScore: null };
  }

  const volunteerCount = resolveVolunteerCount(inputs);
  const wasteScore = computeComponentScore(
    inputs.wasteKg,
    volunteerCount,
    references.wastePerVolunteer,
  );
  const buttsScore = computeComponentScore(
    inputs.cigaretteButts,
    volunteerCount,
    references.buttsPerVolunteer,
  );

  return {
    wasteScore,
    buttsScore,
    severityScore:
      wasteScore === null && buttsScore === null
        ? null
        : Math.max(wasteScore ?? 0, buttsScore ?? 0),
  };
}

export function computePollutionSeverityScoreRelativeToReferences(
  inputs: PollutionScoreInputs,
  references?: PollutionScoreReference | null,
): number | null {
  return computePollutionScoresRelativeToReferences(inputs, references).severityScore;
}

/** Compatibility helper: without a versioned reference it deliberately stays unavailable. */
export function computePollutionScores(
  inputs: PollutionScoreInputs,
  references?: PollutionScoreReference | null,
): PollutionScoreBreakdown {
  return computePollutionScoresRelativeToReferences(inputs, references);
}

export function computePollutionSeverityScore(
  inputs: PollutionScoreInputs,
  references?: PollutionScoreReference | null,
): number | null {
  return computePollutionScores(inputs, references).severityScore;
}

export function computeWasteContributionScore(
  wasteKg: number | null | undefined,
): number | null {
  return isValidMetric(wasteKg) ? wasteKg : null;
}

export function computeButtsContributionScore(
  cigaretteButts: number | null | undefined,
): number | null {
  return isValidMetric(cigaretteButts) ? cigaretteButts : null;
}

export function computePollutionScore(
  inputs: PollutionScoreInputs,
  references?: PollutionScoreReference | null,
): number | null {
  return computePollutionSeverityScore(inputs, references);
}
