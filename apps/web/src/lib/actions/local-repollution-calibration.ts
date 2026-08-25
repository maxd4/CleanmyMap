import type { PollutionScoreReferences } from "./pollution-score";
import {
  computePollutionScores,
  computePollutionScoresRelativeToReferences,
} from "./pollution-score";
import {
  ACTION_POLLUTION_PROJECTION_CONSTANTS,
  presentActionPollutionProjection,
  projectedPollutionScore,
  resolveActionProjectionDecayRate,
  type ActionPollutionProjectionCalibration,
  type ActionPollutionProjectionPresentation,
  type ProjectedPollutionScoreOptions,
} from "./revisit-priority";
import { auditActionContract } from "./data-quality";
import type { ActionDataContract } from "./contract-model";

const DAY_MS = 24 * 60 * 60 * 1000;
const SCORE_EPSILON = 1e-9;

export const LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS = {
  nearDistanceMeters: 20,
  labelRequiredDistanceMeters: 60,
  minimumIntervalDays: 7,
  minimumT80Days: 7,
  maximumT80Days: 365,
  minimumIntervalsForOverride: 2,
  mediumConfidenceIntervals: 2,
  highConfidenceIntervals: 4,
} as const;

export type RepollutionDatasetCompleteness = "complete" | "partial";

export type DerivedPlaceObservation = {
  action: ActionDataContract;
  actionId: string;
  observedAt: string;
  observedAtMs: number;
  latitude: number;
  longitude: number;
  normalizedLabel: string;
  geometryKind: "point" | "polygon";
  historicalScore: number;
  postActionScore: number;
  postActionScoreSource: "measured" | "model_baseline";
};

export type LocalRepollutionIntervalStatus =
  | "valid"
  | "rejected"
  | "rapid_repollution";

export type LocalRepollutionIntervalRejectionReason =
  | "source_incomplete"
  | "delta_days_too_short"
  | "denominator_unusable"
  | "fraction_out_of_range"
  | "t80_out_of_bounds";

export type LocalRepollutionInterval = {
  previousActionId: string;
  nextActionId: string;
  deltaDays: number;
  previousScore: number;
  nextScore: number;
  postActionScore: number;
  postActionScoreSource: "measured" | "model_baseline";
  fraction: number | null;
  observedT80Days: number | null;
  status: LocalRepollutionIntervalStatus;
  rejectionReason: LocalRepollutionIntervalRejectionReason | null;
};

export type LocalRepollutionConfidence =
  | "insufficient"
  | "low"
  | "medium"
  | "high";

export type LocalRepollutionCalibration = {
  derivedPlaceKey: string;
  observationsCount: number;
  validIntervalsCount: number;
  localT80Days: number | null;
  confidence: LocalRepollutionConfidence;
  provenance: "generic" | "local_history";
  sourceCompleteness: RepollutionDatasetCompleteness;
  rejectedIntervals: LocalRepollutionInterval[];
  rapidRepollutionIntervals: LocalRepollutionInterval[];
};

export type DerivedPlaceHistory = {
  derivedPlaceKey: string;
  observations: DerivedPlaceObservation[];
  intervals: LocalRepollutionInterval[];
  calibration: LocalRepollutionCalibration;
};

export type LocalRepollutionExcludedAction = {
  actionId: string;
  reason:
    | "not_action"
    | "not_completed"
    | "data_quality_blocking"
    | "invalid_coordinates"
    | "invalid_observed_at"
    | "missing_label"
    | "unsupported_geometry";
};

export type LocalRepollutionScoreResolver = (
  action: ActionDataContract,
) => number;

export type DeriveLocalRepollutionHistoriesOptions = {
  sourceCompleteness: RepollutionDatasetCompleteness;
  pollutionScoreReferences?: PollutionScoreReferences | null;
  historicalScoreResolver?: LocalRepollutionScoreResolver;
};

export type DerivedLocalRepollutionResult = {
  places: DerivedPlaceHistory[];
  excludedActions: LocalRepollutionExcludedAction[];
};

export type LocalProjectionSelection = {
  calibration: ActionPollutionProjectionCalibration | null;
  confidence: LocalRepollutionConfidence;
  localT80Days: number | null;
  provenance: "generic" | "local_history";
};

export type LocalProjectionOptions = ProjectedPollutionScoreOptions & {
  sourceCompleteness: RepollutionDatasetCompleteness;
  localCalibration?: LocalRepollutionCalibration | null;
};

export type LocalProjectionPresentation = ActionPollutionProjectionPresentation &
  LocalProjectionSelection;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(
    0,
    Math.min(ACTION_POLLUTION_PROJECTION_CONSTANTS.maxScore, value),
  );
}

function isValidCoordinate(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function resolveNormalizedLabel(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeDerivedPlaceLabel(label: string): string {
  return resolveNormalizedLabel(label);
}

function resolveLabelTokens(label: string): Set<string> {
  const ignored = new Set(["a", "au", "aux", "de", "des", "du", "la", "le", "les"]);
  return new Set(
    resolveNormalizedLabel(label)
      .split(" ")
      .filter((token) => token.length > 1 && !ignored.has(token)),
  );
}

export function areDerivedPlaceLabelsCompatible(left: string, right: string): boolean {
  const leftTokens = resolveLabelTokens(left);
  const rightTokens = resolveLabelTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return false;
  }

  const [smaller, larger] =
    leftTokens.size <= rightTokens.size
      ? [leftTokens, rightTokens]
      : [rightTokens, leftTokens];
  return [...smaller].every((token) => larger.has(token));
}

export function distanceBetweenCoordinatesMeters(
  left: Pick<DerivedPlaceObservation, "latitude" | "longitude">,
  right: Pick<DerivedPlaceObservation, "latitude" | "longitude">,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function canMergeDerivedPlaceObservations(
  left: Pick<DerivedPlaceObservation, "latitude" | "longitude" | "normalizedLabel">,
  right: Pick<DerivedPlaceObservation, "latitude" | "longitude" | "normalizedLabel">,
): boolean {
  const distance = distanceBetweenCoordinatesMeters(left, right);
  if (distance <= LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters) {
    return true;
  }
  if (distance > LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.labelRequiredDistanceMeters) {
    return false;
  }
  return areDerivedPlaceLabelsCompatible(left.normalizedLabel, right.normalizedLabel);
}

function compareObservations(
  left: DerivedPlaceObservation,
  right: DerivedPlaceObservation,
): number {
  return (
    left.observedAtMs - right.observedAtMs ||
    left.actionId.localeCompare(right.actionId)
  );
}

function resolveHistoricalScore(
  action: ActionDataContract,
  options: DeriveLocalRepollutionHistoriesOptions,
): number {
  if (options.historicalScoreResolver) {
    return clampScore(options.historicalScoreResolver(action));
  }

  const inputs = {
    wasteKg: action.metadata.wasteKg,
    cigaretteButts: action.metadata.cigaretteButts,
  };
  if (options.pollutionScoreReferences) {
    return clampScore(
      computePollutionScoresRelativeToReferences(
        {
          ...inputs,
          volunteersCount: action.metadata.volunteersCount,
        },
        options.pollutionScoreReferences,
      ).severityScore,
    );
  }
  return clampScore(computePollutionScores(inputs).severityScore);
}

function toDerivedObservation(
  action: ActionDataContract,
  options: DeriveLocalRepollutionHistoriesOptions,
): { observation: DerivedPlaceObservation | null; rejection: LocalRepollutionExcludedAction | null } {
  if (action.type !== "action") {
    return { observation: null, rejection: { actionId: action.id, reason: "not_action" } };
  }
  if (
    action.status !== "approved" ||
    action.metadata.actionPhase !== "post_action_complete"
  ) {
    return { observation: null, rejection: { actionId: action.id, reason: "not_completed" } };
  }

  const quality = action.dataQuality ?? auditActionContract(action);
  if (quality.status === "blocking") {
    return {
      observation: null,
      rejection: { actionId: action.id, reason: "data_quality_blocking" },
    };
  }

  const { latitude, longitude } = action.location;
  if (
    !isValidCoordinate(latitude ?? Number.NaN, -90, 90) ||
    !isValidCoordinate(longitude ?? Number.NaN, -180, 180)
  ) {
    return {
      observation: null,
      rejection: { actionId: action.id, reason: "invalid_coordinates" },
    };
  }

  const observedAtMs = new Date(action.dates.observedAt).getTime();
  if (!Number.isFinite(observedAtMs)) {
    return {
      observation: null,
      rejection: { actionId: action.id, reason: "invalid_observed_at" },
    };
  }

  const normalizedLabel = resolveNormalizedLabel(action.location.label);
  if (!normalizedLabel) {
    return {
      observation: null,
      rejection: { actionId: action.id, reason: "missing_label" },
    };
  }

  if (action.geometry.kind === "polyline") {
    return {
      observation: null,
      rejection: { actionId: action.id, reason: "unsupported_geometry" },
    };
  }

  const postActionScore = action.metadata.postActionPollutionScore;
  const hasMeasuredPostActionScore =
    typeof postActionScore === "number" && Number.isFinite(postActionScore);

  return {
    rejection: null,
    observation: {
      action,
      actionId: action.id,
      observedAt: action.dates.observedAt,
      observedAtMs,
      latitude: latitude as number,
      longitude: longitude as number,
      normalizedLabel,
      geometryKind: action.geometry.kind === "polygon" ? "polygon" : "point",
      historicalScore: resolveHistoricalScore(action, options),
      postActionScore: clampScore(hasMeasuredPostActionScore ? postActionScore : 0),
      postActionScoreSource: hasMeasuredPostActionScore
        ? "measured"
        : "model_baseline",
    },
  };
}

function buildDerivedPlaceKey(observations: DerivedPlaceObservation[]): string {
  const memberIds = observations
    .map((observation) => observation.actionId)
    .sort((left, right) => left.localeCompare(right));
  return `derived-place:${memberIds.join(",")}`;
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function buildInterval(
  previous: DerivedPlaceObservation,
  next: DerivedPlaceObservation,
  sourceCompleteness: RepollutionDatasetCompleteness,
): LocalRepollutionInterval {
  const deltaDays = (next.observedAtMs - previous.observedAtMs) / DAY_MS;
  const base = {
    previousActionId: previous.actionId,
    nextActionId: next.actionId,
    deltaDays,
    previousScore: previous.historicalScore,
    nextScore: next.historicalScore,
    postActionScore: previous.postActionScore,
    postActionScoreSource: previous.postActionScoreSource,
  } as const;

  if (sourceCompleteness === "partial") {
    return {
      ...base,
      fraction: null,
      observedT80Days: null,
      status: "rejected",
      rejectionReason: "source_incomplete",
    };
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
    return {
      ...base,
      fraction: null,
      observedT80Days: null,
      status: "rejected",
      rejectionReason: "delta_days_too_short",
    };
  }

  const denominator = previous.historicalScore - previous.postActionScore;
  if (Math.abs(denominator) <= SCORE_EPSILON) {
    return {
      ...base,
      fraction: null,
      observedT80Days: null,
      status: "rejected",
      rejectionReason: "denominator_unusable",
    };
  }

  const fraction =
    (next.historicalScore - previous.postActionScore) / denominator;
  if (!(fraction > 0 && fraction < 1)) {
    return {
      ...base,
      fraction,
      observedT80Days: null,
      status: "rejected",
      rejectionReason: "fraction_out_of_range",
    };
  }

  const observedT80Days =
    (resolveActionProjectionDecayRate() * deltaDays) / -Math.log(1 - fraction);
  if (
    !Number.isFinite(observedT80Days) ||
    observedT80Days < LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumT80Days ||
    observedT80Days > LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.maximumT80Days
  ) {
    return {
      ...base,
      fraction,
      observedT80Days: null,
      status: "rejected",
      rejectionReason: "t80_out_of_bounds",
    };
  }

  return {
    ...base,
    fraction,
    observedT80Days,
    status: "valid",
    rejectionReason: null,
  };
}

function buildCalibration(
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

function buildPlaceHistory(
  observations: DerivedPlaceObservation[],
  sourceCompleteness: RepollutionDatasetCompleteness,
): DerivedPlaceHistory {
  const sortedObservations = [...observations].sort(compareObservations);
  const intervals = sortedObservations.slice(1).map((observation, index) =>
    buildInterval(sortedObservations[index], observation, sourceCompleteness),
  );
  const derivedPlaceKey = buildDerivedPlaceKey(sortedObservations);

  return {
    derivedPlaceKey,
    observations: sortedObservations,
    intervals,
    calibration: buildCalibration(
      derivedPlaceKey,
      sortedObservations.length,
      intervals,
      sourceCompleteness,
    ),
  };
}

export function deriveLocalRepollutionHistories(
  actions: readonly ActionDataContract[],
  options: DeriveLocalRepollutionHistoriesOptions,
): DerivedLocalRepollutionResult {
  const excludedActions: LocalRepollutionExcludedAction[] = [];
  const eligibleObservations = actions
    .map((action) => toDerivedObservation(action, options))
    .flatMap(({ observation, rejection }) => {
      if (rejection) {
        excludedActions.push(rejection);
      }
      return observation ? [observation] : [];
    })
    .sort(compareObservations);

  const groups: DerivedPlaceObservation[][] = [];
  for (const observation of eligibleObservations) {
    const group = groups.find((candidate) =>
      candidate.every((existing) =>
        canMergeDerivedPlaceObservations(existing, observation),
      ),
    );
    if (group) {
      group.push(observation);
    } else {
      groups.push([observation]);
    }
  }

  const places = groups
    .map((group) => buildPlaceHistory(group, options.sourceCompleteness))
    .sort((left, right) => left.derivedPlaceKey.localeCompare(right.derivedPlaceKey));

  return {
    places,
    excludedActions: excludedActions.sort((left, right) =>
      left.actionId.localeCompare(right.actionId),
    ),
  };
}

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

export function projectActionPollutionScoreWithLocalHistory(
  historicalScore: number,
  elapsedDays: number,
  options: LocalProjectionOptions,
): number {
  const selection = selectLocalActionProjectionCalibration(
    options.localCalibration,
    options.sourceCompleteness,
  );
  return projectedPollutionScore(historicalScore, elapsedDays, {
    ...options,
    calibration: selection.calibration ?? options.calibration,
  });
}

export function presentActionPollutionProjectionWithLocalHistory(
  historicalScore: number,
  actionAt: string | Date | number,
  now: string | Date | number,
  options: LocalProjectionOptions,
): LocalProjectionPresentation {
  const selection = selectLocalActionProjectionCalibration(
    options.localCalibration,
    options.sourceCompleteness,
  );
  const projection = presentActionPollutionProjection(
    historicalScore,
    actionAt,
    now,
    {
      ...options,
      calibration: selection.calibration ?? options.calibration,
    },
  );

  return {
    ...projection,
    ...selection,
  };
}
