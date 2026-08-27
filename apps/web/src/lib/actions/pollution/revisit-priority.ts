import {
  resolveProjectionConfidence,
  type ProjectionConfidence,
  type ProjectionConfidenceInput,
  type ProjectionConfidenceLocalCalibration,
} from "./projection-confidence";

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

export function resolveActionProjectionDecayRate(): number {
  return -Math.log(
    1 - ACTION_POLLUTION_PROJECTION_CONSTANTS.targetFraction,
  );
}

export type ProjectedPollutionScoreOptions = {
  /** Explicit residual pollution measurement; null/undefined means model baseline 0. */
  postActionScore?: number | null;
  /** Future local calibration hook; absent means the generic score-based T80 curve. */
  calibration?: ActionPollutionProjectionCalibration | null;
  /** Evidence used only to describe projection robustness; it never changes the score. */
  geometryConfidence?: ProjectionConfidenceInput["geometryConfidence"];
  localCalibration?: ProjectionConfidenceLocalCalibration | null;
  sourceCompleteness?: ProjectionConfidenceInput["sourceCompleteness"];
};

export type ActionPollutionProjectionPresentation = {
  historicalScore: number;
  postActionScore: number;
  postActionScoreSource: "measured" | "model_baseline";
  elapsedDays: number;
  t80Days: number;
  projectedPollutionScore: number;
  isEstimate: boolean;
  projectionConfidence: ProjectionConfidence;
};

export type ActionPollutionProjectionMethodology = {
  constants: typeof ACTION_POLLUTION_PROJECTION_CONSTANTS;
  t80Formula: string;
  projectionFormula: string;
  decayConstantFormula: string;
  orderOfMagnitude: Array<{
    historicalScore: number;
    t80Days: number;
  }>;
  modelBaselinePostActionScore: number;
};

/**
 * Builds the public-facing explanation from the same projection constants
 * and resolver used by the action map. Keep presentation derived here so the
 * methodology page cannot silently drift from the runtime model.
 */
export function buildActionPollutionProjectionMethodology(): ActionPollutionProjectionMethodology {
  const { t80BaseDays, t80ScoreRangeDays, targetFraction, maxScore } =
    ACTION_POLLUTION_PROJECTION_CONSTANTS;
  const decayConstant = -Math.log(1 - targetFraction);
  const decayConstantLabel =
    Math.abs(decayConstant - Math.log(5)) < Number.EPSILON
      ? "ln(5)"
      : decayConstant.toPrecision(6);

  return {
    constants: ACTION_POLLUTION_PROJECTION_CONSTANTS,
    t80Formula: `T80(S) = ${t80BaseDays} + ${t80ScoreRangeDays} × (1 - S / ${maxScore})²`,
    projectionFormula:
      `P(t) = S_post + (S - S_post) × (1 - exp(-${decayConstantLabel} × t / T80(S)))`,
    decayConstantFormula: `λ = -ln(1 - ${targetFraction}) = ${decayConstantLabel}`,
    orderOfMagnitude: [20, 50, 80, 100].map((historicalScore) => ({
      historicalScore,
      t80Days: resolveActionT80Days(historicalScore),
    })),
    modelBaselinePostActionScore: 0,
  };
}

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
  const decayRate = resolveActionProjectionDecayRate();
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
  const projectionConfidence = resolveProjectionConfidence({
    geometryConfidence: options.geometryConfidence,
    postActionScoreSource: hasMeasuredPostActionScore
      ? "measured"
      : "model_baseline",
    localCalibration: options.localCalibration,
    sourceCompleteness: options.sourceCompleteness ?? "partial",
  });

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
    projectionConfidence,
  };
}
