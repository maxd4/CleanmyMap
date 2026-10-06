import { resolveActionProjectionDecayRate } from "./revisit-priority";
import { LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS } from "./local-repollution-constants";
import type {
  DerivedPlaceObservation,
  LocalRepollutionCalibration,
  LocalRepollutionInterval,
  RepollutionDatasetCompleteness,
} from "./local-repollution-types";

const DAY_MS = 24 * 60 * 60 * 1000;
const SCORE_EPSILON = 1e-9;

function intervalBase(
  previous: DerivedPlaceObservation,
  next: DerivedPlaceObservation,
  deltaDays: number,
) {
  return {
    previousActionId: previous.actionId,
    nextActionId: next.actionId,
    deltaDays,
    previousScore: previous.historicalScore,
    nextScore: next.historicalScore,
    postActionScore: previous.postActionScore,
    postActionScoreSource: previous.postActionScoreSource,
  } as const;
}

function rejectInterval(
  base: ReturnType<typeof intervalBase>,
  rejectionReason: Exclude<LocalRepollutionInterval["rejectionReason"], null>,
  fraction: number | null = null,
): LocalRepollutionInterval {
  return {
    ...base,
    fraction,
    observedT80Days: null,
    status: "rejected",
    rejectionReason,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

export function buildLocalRepollutionInterval(
  previous: DerivedPlaceObservation,
  next: DerivedPlaceObservation,
  sourceCompleteness: RepollutionDatasetCompleteness,
): LocalRepollutionInterval {
  const deltaDays = (next.observedAtMs - previous.observedAtMs) / DAY_MS;
  const base = intervalBase(previous, next, deltaDays);

  if (sourceCompleteness === "partial") {
    return rejectInterval(base, "source_incomplete");
  }
  if (next.historicalScore >= previous.historicalScore) {
    return {
      ...base,
      fraction: null,
      observedT80Days: null,
      status: "rapid_repollution",
      rejectionReason: null,
    };
  }
  if (deltaDays < LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalDays) {
    return rejectInterval(base, "delta_days_too_short");
  }

  const denominator = previous.historicalScore - previous.postActionScore;
  if (Math.abs(denominator) <= SCORE_EPSILON) {
    return rejectInterval(base, "denominator_unusable");
  }

  const fraction =
    (next.historicalScore - previous.postActionScore) / denominator;
  if (!(fraction > 0 && fraction < 1)) {
    return rejectInterval(base, "fraction_out_of_range", fraction);
  }

  const observedT80Days =
    (resolveActionProjectionDecayRate() * deltaDays) / -Math.log(1 - fraction);
  if (
    !Number.isFinite(observedT80Days) ||
    observedT80Days < LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumT80Days ||
    observedT80Days > LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.maximumT80Days
  ) {
    return rejectInterval(base, "t80_out_of_bounds", fraction);
  }

  return {
    ...base,
    fraction,
    observedT80Days,
    status: "valid",
    rejectionReason: null,
  };
}

export function buildLocalRepollutionCalibration(
  derivedPlaceKey: string,
  observationsCount: number,
  intervals: LocalRepollutionInterval[],
  sourceCompleteness: RepollutionDatasetCompleteness,
): LocalRepollutionCalibration {
  const validIntervals = intervals.filter(
    (interval) => interval.status === "valid" && interval.observedT80Days !== null,
  );
  const localT80Days = median(
    validIntervals.flatMap((interval) =>
      interval.observedT80Days === null ? [] : [interval.observedT80Days],
    ),
  );
  const validIntervalsCount = validIntervals.length;
  const confidence =
    validIntervalsCount >= LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.highConfidenceIntervals
      ? "high"
      : validIntervalsCount >= LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.mediumConfidenceIntervals
        ? "medium"
        : validIntervalsCount === 1
          ? "low"
          : "insufficient";
  const canOverride =
    sourceCompleteness === "complete" &&
    validIntervalsCount >= LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride &&
    localT80Days !== null;

  return {
    derivedPlaceKey,
    observationsCount,
    validIntervalsCount,
    localT80Days,
    confidence,
    provenance: canOverride ? "local_history" : "generic",
    sourceCompleteness,
    rejectedIntervals: intervals.filter((interval) => interval.status === "rejected"),
    rapidRepollutionIntervals: intervals.filter(
      (interval) => interval.status === "rapid_repollution",
    ),
  };
}
