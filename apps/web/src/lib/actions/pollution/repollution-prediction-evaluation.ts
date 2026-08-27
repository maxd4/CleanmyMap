import type { PollutionScoreReferences } from "./pollution-score";
import {
  ACTION_POLLUTION_PROJECTION_CONSTANTS,
  presentActionPollutionProjection,
  type ActionPollutionProjectionCalibration,
} from "./revisit-priority";
import {
  deriveLocalRepollutionHistories,
  canMergeDerivedPlaceObservations,
  distanceBetweenCoordinatesMeters,
  LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS,
  normalizeDerivedPlaceLabel,
  selectLocalActionProjectionCalibration,
  type DerivedPlaceObservation,
  type DerivedPlaceHistory,
  type DeriveLocalRepollutionHistoriesOptions,
  type LocalRepollutionScoreResolver,
  type RepollutionDatasetCompleteness,
} from "./local-repollution-calibration";
import type { ActionDataContract } from "../contracts/contract-model";

const DAY_MS = 24 * 60 * 60 * 1000;

export const REPOLLUTION_EVALUATION_MODEL_VERSION =
  "action-repollution-projection-v1";

export type RepollutionEvaluationMode =
  | "online_frozen"
  | "retrospective_replay";

export type RepollutionEvaluationModelConfiguration = {
  version?: string;
  snapshot?: Record<string, unknown>;
};

export type RepollutionPredictionEvaluationMetrics = {
  signedError: number;
  absoluteError: number;
  squaredError: number;
};

export type RepollutionPredictionEvaluationRecord =
  RepollutionPredictionEvaluationMetrics & {
    evaluationObservationType: "action" | "spot";
    evaluationObservationId: string;
    evaluationObservedAt: string;
    previousObservationType: "action" | "spot";
    previousObservationId: string;
    previousObservedAt: string;
    historicalScore: number;
    postActionScore: number;
    postActionScoreSource: "measured" | "model_baseline";
    t80Days: number;
    projectionProvenance: "generic" | "local_history";
    calibrationConfidence: "insufficient" | "low" | "medium" | "high";
    projectedScore: number;
    observedScore: number;
    elapsedDays: number;
    modelVersion: string;
    modelSnapshot: Record<string, unknown>;
    spatialMatchDistanceM: number;
    spatialMatchMethod: "distance_only" | "distance_and_label";
    evaluationMode: RepollutionEvaluationMode;
    derivedPlaceKeySnapshot: string | null;
  };

export type RepollutionPredictionNotEvaluableReason =
  | "observation_unscored"
  | "observation_not_completed"
  | "observation_data_quality_blocking"
  | "observation_invalid_coordinates"
  | "observation_invalid_date"
  | "observation_unsupported_geometry"
  | "insufficient_history"
  | "place_not_matchable";

export type RepollutionPredictionEvaluation =
  | {
      status: "evaluable";
      evaluation: RepollutionPredictionEvaluationRecord;
    }
  | {
      status: "not_evaluable";
      observationType: ActionDataContract["type"];
      observationId: string;
      observedAt: string;
      reason: RepollutionPredictionNotEvaluableReason;
    };

export type EvaluateRepollutionPredictionBeforeObservationOptions = {
  newObservation: ActionDataContract;
  previousObservations: readonly ActionDataContract[];
  historyCompleteness: RepollutionDatasetCompleteness;
  pollutionScoreReferences?: PollutionScoreReferences | null;
  historicalScoreResolver?: LocalRepollutionScoreResolver;
  /** Future seam for a canonical quantitative Trash Spotter contract. */
  quantitativeScoreResolver?: (observation: ActionDataContract) => number | null;
  model?: RepollutionEvaluationModelConfiguration;
  evaluationMode?: RepollutionEvaluationMode;
};

export type RepollutionEvaluationAggregate = {
  status: "ok" | "insufficient_data";
  sampleCount: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
};

function deriveOptions(
  options: EvaluateRepollutionPredictionBeforeObservationOptions,
): DeriveLocalRepollutionHistoriesOptions {
  return {
    sourceCompleteness: options.historyCompleteness,
    pollutionScoreReferences: options.pollutionScoreReferences,
    historicalScoreResolver: options.historicalScoreResolver,
  };
}

function resolveObservationTimestamp(observation: ActionDataContract): number | null {
  const timestamp = new Date(observation.dates.observedAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function clampScore(value: number): number {
  return Math.max(
    0,
    Math.min(ACTION_POLLUTION_PROJECTION_CONSTANTS.maxScore, value),
  );
}

function buildQuantitativeSpotObservation(
  observation: ActionDataContract,
  scoreResolver: ((observation: ActionDataContract) => number | null) | undefined,
): DerivedPlaceObservation | null {
  const score = scoreResolver?.(observation);
  const observedAtMs = resolveObservationTimestamp(observation);
  const latitude = observation.location.latitude;
  const longitude = observation.location.longitude;
  const normalizedLabel = normalizeDerivedPlaceLabel(observation.location.label);
  if (
    observation.type !== "spot" ||
    observation.status !== "approved" ||
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    observedAtMs === null ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !normalizedLabel ||
    observation.geometry.kind === "polyline" ||
    observation.dataQuality?.status === "blocking"
  ) {
    return null;
  }

  return {
    action: observation,
    actionId: observation.id,
    observedAt: observation.dates.observedAt,
    observedAtMs,
    latitude,
    longitude,
    normalizedLabel,
    geometryKind: observation.geometry.kind === "polygon" ? "polygon" : "point",
    historicalScore: clampScore(score),
    postActionScore: 0,
    postActionScoreSource: "model_baseline",
  };
}

function resolveNotEvaluableReason(
  observation: ActionDataContract,
  exclusions: Array<{ actionId: string; reason: string }>,
): RepollutionPredictionNotEvaluableReason {
  if (observation.type !== "action") {
    return "observation_unscored";
  }

  const reason = exclusions.find(
    (exclusion) => exclusion.actionId === observation.id,
  )?.reason;
  switch (reason) {
    case "not_completed":
      return "observation_not_completed";
    case "data_quality_blocking":
      return "observation_data_quality_blocking";
    case "invalid_coordinates":
      return "observation_invalid_coordinates";
    case "invalid_observed_at":
      return "observation_invalid_date";
    case "unsupported_geometry":
      return "observation_unsupported_geometry";
    default:
      return "place_not_matchable";
  }
}

function findPreviousPlace(
  previousPlaces: DerivedPlaceHistory[],
  augmentedPlace: {
    observations: DerivedPlaceObservation[];
  },
  newObservationId: string,
): DerivedPlaceHistory | null {
  const previousIds = new Set(
    augmentedPlace.observations
      .filter((observation) => observation.actionId !== newObservationId)
      .map((observation) => observation.actionId),
  );

  return (
    previousPlaces.find((place) =>
      place.observations.some((observation) => previousIds.has(observation.actionId)),
    ) ?? null
  );
}

function buildModelSnapshot(params: {
  model: RepollutionEvaluationModelConfiguration | undefined;
  projection: {
    t80Days: number;
    projectionProvenance: "generic" | "local_history";
    calibrationConfidence: "insufficient" | "low" | "medium" | "high";
  };
}): Record<string, unknown> {
  return {
    modelVersion:
      params.model?.version ?? REPOLLUTION_EVALUATION_MODEL_VERSION,
    ...params.model?.snapshot,
    genericProjection: { ...ACTION_POLLUTION_PROJECTION_CONSTANTS },
    localCalibration: { ...LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS },
    used: {
      t80Days: params.projection.t80Days,
      projectionProvenance: params.projection.projectionProvenance,
      calibrationConfidence: params.projection.calibrationConfidence,
    },
  };
}

function resolveSpatialMatch(
  previous: DerivedPlaceObservation,
  current: DerivedPlaceObservation,
): {
  distanceM: number;
  method: "distance_only" | "distance_and_label";
} {
  const distanceM = distanceBetweenCoordinatesMeters(previous, current);
  return {
    distanceM,
    method:
      distanceM <= LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters
        ? "distance_only"
        : "distance_and_label",
  };
}

/**
 * Evaluate a projection at a new observation without allowing that
 * observation (or any later observation) into the historical projection.
 */
export function evaluateRepollutionPredictionBeforeObservation(
  options: EvaluateRepollutionPredictionBeforeObservationOptions,
): RepollutionPredictionEvaluation {
  const { newObservation } = options;
  const evaluationObservedAt = newObservation.dates.observedAt;
  const targetTimestamp = resolveObservationTimestamp(newObservation);

  if (newObservation.type !== "action") {
    if (newObservation.type === "spot" && options.quantitativeScoreResolver) {
      const quantitativeSpot = buildQuantitativeSpotObservation(
        newObservation,
        options.quantitativeScoreResolver,
      );
      if (quantitativeSpot) {
        // Continue below with the same historical action matching rules.
      } else {
        return {
          status: "not_evaluable",
          observationType: newObservation.type,
          observationId: newObservation.id,
          observedAt: evaluationObservedAt,
          reason: "observation_unscored",
        };
      }
    } else {
      return {
        status: "not_evaluable",
        observationType: newObservation.type,
        observationId: newObservation.id,
        observedAt: evaluationObservedAt,
        reason: "observation_unscored",
      };
    }
  }

  if (targetTimestamp === null) {
    return {
      status: "not_evaluable",
      observationType: newObservation.type,
      observationId: newObservation.id,
      observedAt: evaluationObservedAt,
      reason: "observation_invalid_date",
    };
  }

  const priorObservations = options.previousObservations.filter((observation) => {
    const timestamp = resolveObservationTimestamp(observation);
    return (
      observation.id !== newObservation.id &&
      timestamp !== null &&
      timestamp < targetTimestamp
    );
  });
  const derivationOptions = deriveOptions(options);
  const previousHistories = deriveLocalRepollutionHistories(
    priorObservations,
    derivationOptions,
  );
  let currentDerivedObservation: DerivedPlaceObservation | null = null;
  let previousPlace: (typeof previousHistories.places)[number] | null = null;

  if (newObservation.type === "action") {
    const augmented = deriveLocalRepollutionHistories(
      [...priorObservations, newObservation],
      derivationOptions,
    );
    const currentPlace = augmented.places.find((place) =>
      place.observations.some((observation) => observation.actionId === newObservation.id),
    );
    if (!currentPlace) {
      return {
        status: "not_evaluable",
        observationType: newObservation.type,
        observationId: newObservation.id,
        observedAt: evaluationObservedAt,
        reason: resolveNotEvaluableReason(
          newObservation,
          augmented.excludedActions,
        ),
      };
    }
    currentDerivedObservation = currentPlace.observations.find(
      (observation) => observation.actionId === newObservation.id,
    ) ?? null;
    previousPlace = findPreviousPlace(
      previousHistories.places,
      currentPlace,
      newObservation.id,
    );
  } else {
    const currentSpotObservation = buildQuantitativeSpotObservation(
      newObservation,
      options.quantitativeScoreResolver,
    );
    currentDerivedObservation = currentSpotObservation;
    if (currentSpotObservation) {
      previousPlace =
        previousHistories.places.find((place) =>
          place.observations.every((observation) =>
            canMergeDerivedPlaceObservations(observation, currentSpotObservation),
          ),
        ) ?? null;
    }
  }

  if (!currentDerivedObservation) {
    return {
      status: "not_evaluable",
      observationType: newObservation.type,
      observationId: newObservation.id,
      observedAt: evaluationObservedAt,
      reason: "observation_unscored",
    };
  }

  const previousObservation = previousPlace?.observations.at(-1) ?? null;
  if (!previousPlace || !previousObservation) {
    return {
      status: "not_evaluable",
      observationType: newObservation.type,
      observationId: newObservation.id,
      observedAt: evaluationObservedAt,
      reason:
        previousHistories.places.length > 0
          ? "place_not_matchable"
          : "insufficient_history",
    };
  }

  const selectedCalibration = selectLocalActionProjectionCalibration(
    previousPlace.calibration,
    options.historyCompleteness,
  );
  const projection = presentActionPollutionProjection(
    previousObservation.historicalScore,
    previousObservation.observedAt,
    evaluationObservedAt,
    {
      postActionScore: previousObservation.postActionScore,
      calibration: selectedCalibration.calibration as ActionPollutionProjectionCalibration | null,
    },
  );
  const spatialMatch = resolveSpatialMatch(
    previousObservation,
    currentDerivedObservation,
  );
  const signedError =
    currentDerivedObservation.historicalScore - projection.projectedPollutionScore;

  return {
    status: "evaluable",
    evaluation: {
      evaluationObservationType:
        newObservation.type === "spot" ? "spot" : "action",
      evaluationObservationId: newObservation.id,
      evaluationObservedAt,
      previousObservationType: "action",
      previousObservationId: previousObservation.actionId,
      previousObservedAt: previousObservation.observedAt,
      historicalScore: previousObservation.historicalScore,
      postActionScore: projection.postActionScore,
      postActionScoreSource: projection.postActionScoreSource,
      t80Days: projection.t80Days,
      projectionProvenance: selectedCalibration.provenance,
      calibrationConfidence: selectedCalibration.confidence,
      projectedScore: projection.projectedPollutionScore,
      observedScore: currentDerivedObservation.historicalScore,
      signedError,
      absoluteError: Math.abs(signedError),
      squaredError: signedError ** 2,
      elapsedDays: (targetTimestamp - previousObservation.observedAtMs) / DAY_MS,
      modelVersion:
        options.model?.version ?? REPOLLUTION_EVALUATION_MODEL_VERSION,
      modelSnapshot: buildModelSnapshot({
        model: options.model,
        projection: {
          t80Days: projection.t80Days,
          projectionProvenance: selectedCalibration.provenance,
          calibrationConfidence: selectedCalibration.confidence,
        },
      }),
      spatialMatchDistanceM: spatialMatch.distanceM,
      spatialMatchMethod: spatialMatch.method,
      evaluationMode: options.evaluationMode ?? "online_frozen",
      derivedPlaceKeySnapshot: previousPlace.derivedPlaceKey,
    },
  };
}

export function summarizeRepollutionPredictionEvaluations(
  evaluations: readonly RepollutionPredictionEvaluation[],
): RepollutionEvaluationAggregate {
  const valid = evaluations.flatMap((result) =>
    result.status === "evaluable" ? [result.evaluation] : [],
  );
  if (valid.length === 0) {
    return {
      status: "insufficient_data",
      sampleCount: 0,
      mae: null,
      rmse: null,
      bias: null,
    };
  }

  const absoluteErrorSum = valid.reduce(
    (sum, evaluation) => sum + evaluation.absoluteError,
    0,
  );
  const squaredErrorSum = valid.reduce(
    (sum, evaluation) => sum + evaluation.squaredError,
    0,
  );
  const signedErrorSum = valid.reduce(
    (sum, evaluation) => sum + evaluation.signedError,
    0,
  );

  return {
    status: "ok",
    sampleCount: valid.length,
    mae: absoluteErrorSum / valid.length,
    rmse: Math.sqrt(squaredErrorSum / valid.length),
    bias: signedErrorSum / valid.length,
  };
}
