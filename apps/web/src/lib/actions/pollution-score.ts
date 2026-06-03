export const WASTE_POLLUTION_REFERENCE_KG = 20;
export const BUTTS_POLLUTION_REFERENCE_COUNT = 2000;

export type PollutionScoreReferences = {
  wastePerVolunteer: number;
  buttsPerVolunteer: number;
};

export const DEFAULT_POLLUTION_SCORE_REFERENCES: PollutionScoreReferences = {
  wastePerVolunteer: WASTE_POLLUTION_REFERENCE_KG,
  buttsPerVolunteer: BUTTS_POLLUTION_REFERENCE_COUNT,
};

export type PollutionScoreBreakdown = {
  wasteScore: number;
  buttsScore: number;
  severityScore: number;
};

export type PollutionScoreInputs = {
  wasteKg?: number | null;
  cigaretteButts?: number | null;
  volunteersCount?: number | null;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeScoreFromReference(
  amount: number | null | undefined,
  reference: number,
): number {
  const numericAmount = Number(amount ?? 0);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return 0;
  }

  return clampScore((numericAmount / reference) * 100);
}

function computeScorePerVolunteer(
  amount: number | null | undefined,
  volunteersCount: number | null | undefined,
  referencePerVolunteer: number,
): number {
  const volunteerCount = Math.max(
    1,
    Math.trunc(Number(volunteersCount ?? 1) || 1),
  );
  const numericAmount = Number(amount ?? 0);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return 0;
  }
  const normalizedReference = Number(referencePerVolunteer ?? 0);
  if (!Number.isFinite(normalizedReference) || normalizedReference <= 0) {
    return 0;
  }

  const perVolunteerAmount = numericAmount / volunteerCount;
  return clampScore((perVolunteerAmount / normalizedReference) * 100);
}

export function computeWastePollutionScore(
  wasteKg: number | null | undefined,
): number {
  return computeScoreFromReference(wasteKg, WASTE_POLLUTION_REFERENCE_KG);
}

export function computeButtsPollutionScore(
  cigaretteButts: number | null | undefined,
): number {
  return computeScoreFromReference(
    cigaretteButts,
    BUTTS_POLLUTION_REFERENCE_COUNT,
  );
}

export function computePollutionScores(inputs: {
  wasteKg?: number | null;
  cigaretteButts?: number | null;
}): PollutionScoreBreakdown {
  const wasteScore = computeWastePollutionScore(inputs.wasteKg ?? null);
  const buttsScore = computeButtsPollutionScore(inputs.cigaretteButts ?? null);

  return {
    wasteScore,
    buttsScore,
    severityScore: Math.max(wasteScore, buttsScore),
  };
}

export function computePollutionScoresRelativeToReferences(
  inputs: PollutionScoreInputs,
  references: PollutionScoreReferences = DEFAULT_POLLUTION_SCORE_REFERENCES,
): PollutionScoreBreakdown {
  const wasteScore = computeScorePerVolunteer(
    inputs.wasteKg ?? null,
    inputs.volunteersCount ?? null,
    references.wastePerVolunteer,
  );
  const buttsScore = computeScorePerVolunteer(
    inputs.cigaretteButts ?? null,
    inputs.volunteersCount ?? null,
    references.buttsPerVolunteer,
  );

  return {
    wasteScore,
    buttsScore,
    severityScore: Math.max(wasteScore, buttsScore),
  };
}

export function computePollutionSeverityScoreRelativeToReferences(
  inputs: PollutionScoreInputs,
  references: PollutionScoreReferences = DEFAULT_POLLUTION_SCORE_REFERENCES,
): number {
  return computePollutionScoresRelativeToReferences(inputs, references).severityScore;
}

export function computePollutionSeverityScore(inputs: {
  wasteKg?: number | null;
  cigaretteButts?: number | null;
}): number {
  return computePollutionScores(inputs).severityScore;
}

export function computeWasteContributionScore(
  wasteKg: number | null | undefined,
): number {
  return computeWastePollutionScore(wasteKg);
}

export function computeButtsContributionScore(
  cigaretteButts: number | null | undefined,
): number {
  return computeButtsPollutionScore(cigaretteButts);
}

export function computePollutionScore(inputs: {
  wasteKg?: number | null;
  cigaretteButts?: number | null;
}): number {
  return computePollutionSeverityScore(inputs);
}
