import {
  presentActionPollutionProjection,
  projectedPollutionScore,
  type ActionPollutionProjectionPresentation,
} from "./revisit-priority";
import { LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS } from "./local-repollution-constants";
import type {
  LocalProjectionOptions,
  LocalProjectionPresentation,
  LocalProjectionSelection,
  LocalRepollutionCalibration,
  RepollutionDatasetCompleteness,
} from "./local-repollution-types";

export function selectLocalActionProjectionCalibration(
  calibration: LocalRepollutionCalibration | null | undefined,
  sourceCompleteness: RepollutionDatasetCompleteness,
): LocalProjectionSelection {
  const localT80Days = calibration?.localT80Days ?? null;
  const confidence = calibration?.confidence ?? "insufficient";
  const canOverride =
    sourceCompleteness === "complete" &&
    calibration?.sourceCompleteness === "complete" &&
    calibration.provenance === "local_history" &&
    calibration.validIntervalsCount >=
      LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride &&
    localT80Days !== null;

  return {
    calibration: canOverride ? { t80Days: localT80Days } : null,
    confidence,
    localT80Days,
    provenance: canOverride ? "local_history" : "generic",
  };
}

function resolveProjectionOptions(options: LocalProjectionOptions) {
  const selection = selectLocalActionProjectionCalibration(
    options.localCalibration,
    options.sourceCompleteness,
  );
  return {
    selection,
    options: {
      ...options,
      calibration: selection.calibration ?? options.calibration,
    },
  };
}

export function projectActionPollutionScoreWithLocalHistory(
  historicalScore: number,
  elapsedDays: number,
  options: LocalProjectionOptions,
): number {
  const resolved = resolveProjectionOptions(options);
  return projectedPollutionScore(historicalScore, elapsedDays, {
    ...resolved.options,
    calibration: resolved.options.calibration,
  });
}

export function presentActionPollutionProjectionWithLocalHistory(
  historicalScore: number,
  actionAt: string | Date | number,
  now: string | Date | number,
  options: LocalProjectionOptions,
): LocalProjectionPresentation {
  const resolved = resolveProjectionOptions(options);
  const projection: ActionPollutionProjectionPresentation =
    presentActionPollutionProjection(
      historicalScore,
      actionAt,
      now,
      resolved.options,
    );

  return {
    ...projection,
    ...resolved.selection,
  };
}
