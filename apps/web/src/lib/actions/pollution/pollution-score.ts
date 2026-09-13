export type PollutionScoreScope = "global" | "department";

export type PollutionScoreReference = {
  wastePerVolunteerHour: number | null;
  buttsPerVolunteerHour: number | null;
  wasteSourceCount: number;
  buttsSourceCount: number;
};

export type DepartmentPollutionScoreReference = PollutionScoreReference & {
  eligibleActionCount: number;
};

export type PollutionScoreReferences = {
  global: PollutionScoreReference;
  /** Compatibility seam only: the V2 RPC and snapshot do not populate it. */
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

function resolveWorkHours(inputs: PollutionScoreInputs): number | null {
  const volunteersCount = Number(inputs.volunteersCount);
  const durationMinutes = Number(inputs.durationMinutes);
  if (
    !Number.isInteger(volunteersCount) ||
    volunteersCount < 1 ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return null;
  }

  const workHours = (volunteersCount * durationMinutes) / 60;
  return Number.isFinite(workHours) && workHours > 0 ? workHours : null;
}

function isEligibleAction(inputs: PollutionScoreInputs): boolean {
  return (
    (inputs.actionType ?? "action") === "action" &&
    (inputs.status ?? "approved") === "approved" &&
    (inputs.actionPhase ?? "post_action_complete") === "post_action_complete"
  );
}

function resolveReference(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function computeComponentScore(
  amount: number | null | undefined,
  workHours: number | null,
  reference: number | null | undefined,
): number | null {
  if (!isValidMetric(amount) || workHours === null) {
    return null;
  }
  const normalizedReference = resolveReference(reference);
  if (normalizedReference === null) {
    return null;
  }

  return clampScore((100 * (amount / workHours)) / normalizedReference);
}

export function computePollutionScoresRelativeToReferences(
  inputs: PollutionScoreInputs,
  references?: PollutionScoreReference | null,
): PollutionScoreBreakdown {
  if (!isEligibleAction(inputs) || !references) {
    return { wasteScore: null, buttsScore: null, severityScore: null };
  }

  const workHours = resolveWorkHours(inputs);
  const wasteScore = computeComponentScore(
    inputs.wasteKg,
    workHours,
    references.wastePerVolunteerHour,
  );
  const buttsScore = computeComponentScore(
    inputs.cigaretteButts,
    workHours,
    references.buttsPerVolunteerHour,
  );
  const availableScores = [wasteScore, buttsScore].filter(
    (score): score is number => score !== null,
  );

  return {
    wasteScore,
    buttsScore,
    severityScore:
      availableScores.length === 0
        ? null
        : Math.round(
            availableScores.reduce((total, score) => total + score, 0) /
              availableScores.length,
          ),
  };
}

export function computeAveragePollutionScore(
  scores: Pick<PollutionScoreBreakdown, "wasteScore" | "buttsScore">,
): number | null {
  const availableScores = [scores.wasteScore, scores.buttsScore].filter(
    (score): score is number => score !== null,
  );
  return availableScores.length === 0
    ? null
    : Math.round(
        availableScores.reduce((total, score) => total + score, 0) /
          availableScores.length,
      );
}

export function computePollutionSeverityScoreRelativeToReferences(
  inputs: PollutionScoreInputs,
  references?: PollutionScoreReference | null,
): number | null {
  return computePollutionScoresRelativeToReferences(inputs, references).severityScore;
}

/** Compatibility helper: without a V2 reference it deliberately stays unavailable. */
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
