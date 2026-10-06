import { computePollutionScoresRelativeToReferences } from "./pollution-score";
import { auditActionContract } from "../quality/data-quality";
import type { ActionDataContract } from "../contracts/contract-model";
import {
  buildLocalRepollutionCalibration,
  buildLocalRepollutionInterval,
} from "./local-repollution-calibration-core";
import {
  canMergeDerivedPlaceObservations,
  normalizeDerivedPlaceLabel,
} from "./local-repollution-matching";
import { ACTION_POLLUTION_PROJECTION_CONSTANTS } from "./revisit-priority";
import type {
  DerivedLocalRepollutionResult,
  DerivedPlaceHistory,
  DerivedPlaceObservation,
  DeriveLocalRepollutionHistoriesOptions,
  LocalRepollutionExcludedAction,
} from "./local-repollution-types";

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

function resolveHistoricalScore(
  action: ActionDataContract,
  options: DeriveLocalRepollutionHistoriesOptions,
): number | null {
  if (options.historicalScoreResolver) {
    const score = options.historicalScoreResolver(action);
    return score === null ? null : clampScore(score);
  }

  const inputs = {
    wasteKg: action.metadata.wasteKg,
    cigaretteButts: action.metadata.cigaretteButts,
  };
  if (options.pollutionScoreReferences) {
    const score = computePollutionScoresRelativeToReferences(
      {
        ...inputs,
        volunteersCount: action.metadata.volunteersCount,
        durationMinutes: action.metadata.durationMinutes,
        actionType: action.type,
        status: action.status,
        actionPhase: action.metadata.actionPhase,
      },
      options.pollutionScoreReferences.global,
    ).severityScore;
    return score === null ? null : clampScore(score);
  }
  return null;
}

type ObservationEligibility =
  | {
      status: "eligible";
      observedAtMs: number;
      latitude: number;
      longitude: number;
      normalizedLabel: string;
    }
  | { status: "rejected"; rejection: LocalRepollutionExcludedAction };

function resolveObservationEligibility(action: ActionDataContract): ObservationEligibility {
  if (action.type !== "action") {
    return { status: "rejected", rejection: { actionId: action.id, reason: "not_action" } };
  }
  if (
    action.status !== "approved" ||
    action.metadata.actionPhase !== "post_action_complete"
  ) {
    return { status: "rejected", rejection: { actionId: action.id, reason: "not_completed" } };
  }
  const quality = action.dataQuality ?? auditActionContract(action);
  if (quality.status === "blocking") {
    return {
      status: "rejected",
      rejection: { actionId: action.id, reason: "data_quality_blocking" },
    };
  }
  const { latitude, longitude } = action.location;
  if (
    !isValidCoordinate(latitude ?? Number.NaN, -90, 90) ||
    !isValidCoordinate(longitude ?? Number.NaN, -180, 180)
  ) {
    return { status: "rejected", rejection: { actionId: action.id, reason: "invalid_coordinates" } };
  }
  const observedAtMs = new Date(action.dates.observedAt).getTime();
  if (!Number.isFinite(observedAtMs)) {
    return { status: "rejected", rejection: { actionId: action.id, reason: "invalid_observed_at" } };
  }
  const normalizedLabel = normalizeDerivedPlaceLabel(action.location.label);
  if (!normalizedLabel) {
    return { status: "rejected", rejection: { actionId: action.id, reason: "missing_label" } };
  }
  if (action.geometry.kind === "polyline") {
    return { status: "rejected", rejection: { actionId: action.id, reason: "unsupported_geometry" } };
  }
  return {
    status: "eligible",
    observedAtMs,
    latitude: latitude as number,
    longitude: longitude as number,
    normalizedLabel,
  };
}

function toDerivedObservation(
  action: ActionDataContract,
  options: DeriveLocalRepollutionHistoriesOptions,
): { observation: DerivedPlaceObservation | null; rejection: LocalRepollutionExcludedAction | null } {
  const eligibility = resolveObservationEligibility(action);
  if (eligibility.status === "rejected") {
    return { observation: null, rejection: eligibility.rejection };
  }

  const postActionScore = action.metadata.postActionPollutionScore;
  const hasMeasuredPostActionScore =
    typeof postActionScore === "number" && Number.isFinite(postActionScore);
  const historicalScore = resolveHistoricalScore(action, options);
  if (historicalScore === null) {
    return {
      observation: null,
      rejection: { actionId: action.id, reason: "pollution_score_unavailable" },
    };
  }

  return {
    rejection: null,
    observation: {
      action,
      actionId: action.id,
      observedAt: action.dates.observedAt,
      observedAtMs: eligibility.observedAtMs,
      latitude: eligibility.latitude,
      longitude: eligibility.longitude,
      normalizedLabel: eligibility.normalizedLabel,
      geometryKind: action.geometry.kind === "polygon" ? "polygon" : "point",
      historicalScore,
      postActionScore: clampScore(hasMeasuredPostActionScore ? postActionScore : 0),
      postActionScoreSource: hasMeasuredPostActionScore
        ? "measured"
        : "model_baseline",
    },
  };
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

function buildDerivedPlaceKey(observations: DerivedPlaceObservation[]): string {
  const memberIds = observations
    .map((observation) => observation.actionId)
    .sort((left, right) => left.localeCompare(right));
  return `derived-place:${memberIds.join(",")}`;
}

function buildPlaceHistory(
  observations: DerivedPlaceObservation[],
  sourceCompleteness: DeriveLocalRepollutionHistoriesOptions["sourceCompleteness"],
): DerivedPlaceHistory {
  const sortedObservations = [...observations].sort(compareObservations);
  const intervals = sortedObservations.slice(1).map((observation, index) =>
    buildLocalRepollutionInterval(
      sortedObservations[index]!,
      observation,
      sourceCompleteness,
    ),
  );
  const derivedPlaceKey = buildDerivedPlaceKey(sortedObservations);

  return {
    derivedPlaceKey,
    observations: sortedObservations,
    intervals,
    calibration: buildLocalRepollutionCalibration(
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
