const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const ACTION_POLLUTION_PROJECTION_CONSTANTS = {
  t80BaseDays: 28,
  t80ScoreRangeDays: 152,
  targetFraction: 0.8,
  maxScore: 100,
} as const;

export type ActionPollutionProjectionCalibration = {
  /** Optional local estimate that replaces the generic T80 fallback. */
  t80Days?: number | null;
};

export type ProjectedPollutionScoreOptions = {
  /** Explicit residual pollution measurement; null/undefined means model baseline 0. */
  postActionScore?: number | null;
  /** Future local calibration hook; absent means the generic score-based T80 curve. */
  calibration?: ActionPollutionProjectionCalibration | null;
};

export type ActionPollutionProjectionPresentation = {
  historicalScore: number;
  postActionScore: number;
  postActionScoreSource: "measured" | "model_baseline";
  elapsedDays: number;
  t80Days: number;
  projectedPollutionScore: number;
  isEstimate: boolean;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(ACTION_POLLUTION_PROJECTION_CONSTANTS.maxScore, value),
  );
}

function toTimestamp(value: string | Date | number): number | null {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function resolveElapsedActionDays(
  actionAt: string | Date | number,
  now: string | Date | number = new Date(),
): number {
  const actionTimestamp = toTimestamp(actionAt);
  const nowTimestamp = toTimestamp(now);

  if (actionTimestamp === null || nowTimestamp === null) {
    return 0;
  }

  return Math.max(0, Math.floor((nowTimestamp - actionTimestamp) / MS_PER_DAY));
}

export function resolveActionT80Days(
  historicalScore: number,
  calibration?: ActionPollutionProjectionCalibration | null,
): number {
  const calibratedT80 = calibration?.t80Days;
  if (typeof calibratedT80 === "number" && Number.isFinite(calibratedT80) && calibratedT80 > 0) {
    return calibratedT80;
  }

  const normalizedScore = clampScore(historicalScore);
  const scoreDistance =
    1 - normalizedScore / ACTION_POLLUTION_PROJECTION_CONSTANTS.maxScore;

  return (
    ACTION_POLLUTION_PROJECTION_CONSTANTS.t80BaseDays +
    ACTION_POLLUTION_PROJECTION_CONSTANTS.t80ScoreRangeDays * scoreDistance ** 2
  );
}

/**
 * Projects the pollution level after an action without changing the historical score.
 * Missing post-action data intentionally uses S_post=0 as a model baseline, never as a measurement.
 */
export function projectedPollutionScore(
  historicalScore: number,
  elapsedDays: number,
  options: ProjectedPollutionScoreOptions = {},
): number {
  const historical = clampScore(historicalScore);
  const postAction = clampScore(options.postActionScore ?? 0);
  const elapsed = Math.max(0, Number.isFinite(elapsedDays) ? elapsedDays : 0);
  const t80Days = resolveActionT80Days(historical, options.calibration);
  const decayRate = -Math.log(
    1 - ACTION_POLLUTION_PROJECTION_CONSTANTS.targetFraction,
  );
  const recovery = 1 - Math.exp((-decayRate * elapsed) / t80Days);

  return Math.max(
    0,
    Math.min(
      ACTION_POLLUTION_PROJECTION_CONSTANTS.maxScore,
      postAction + (historical - postAction) * recovery,
    ),
  );
}

export function presentActionPollutionProjection(
  historicalScore: number,
  actionAt: string | Date | number,
  now: string | Date | number = new Date(),
  options: ProjectedPollutionScoreOptions = {},
): ActionPollutionProjectionPresentation {
  const normalizedHistoricalScore = clampScore(historicalScore);
  const measuredPostActionScore = options.postActionScore;
  const hasMeasuredPostActionScore =
    typeof measuredPostActionScore === "number" &&
    Number.isFinite(measuredPostActionScore);
  const postActionScore = clampScore(
    hasMeasuredPostActionScore ? measuredPostActionScore : 0,
  );
  const elapsedDays = resolveElapsedActionDays(actionAt, now);
  const projectionOptions: ProjectedPollutionScoreOptions = {
    ...options,
    postActionScore,
  };

  return {
    historicalScore: normalizedHistoricalScore,
    postActionScore,
    postActionScoreSource: hasMeasuredPostActionScore
      ? "measured"
      : "model_baseline",
    elapsedDays,
    t80Days: resolveActionT80Days(
      normalizedHistoricalScore,
      options.calibration,
    ),
    projectedPollutionScore: projectedPollutionScore(
      normalizedHistoricalScore,
      elapsedDays,
      projectionOptions,
    ),
    isEstimate: !hasMeasuredPostActionScore,
  };
}
