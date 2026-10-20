import type { PollutionScoreReferences } from "./pollution-score";
import { computePollutionScoresRelativeToReferences } from "./pollution-score";
import { toPollutionScoreInput } from "./action-pollution-score-input";
import type { ActionDataContract } from "../contracts/contract-model";
import { auditActionContract } from "../quality/data-quality";
import { presentActionPollutionProjection } from "./revisit-priority";
import type { ProjectionConfidence } from "./projection-confidence";
import {
  evaluateCoverage,
  isFiniteCoordinatePair,
  projectPolyline,
  resolveReferenceLatitude,
} from "./corridor-history-geometry";

/**
 * Conservative thresholds dedicated to corridor matching.
 * They intentionally do not share the point/area calibration thresholds.
 */
export const CORRIDOR_HISTORY_CONSTANTS = {
  maxPointToCorridorDistanceMeters: 35,
  minimumOverlapRatio: 0.6,
  minimumDirectionAgreement: 0.8,
  sampleSpacingMeters: 25,
  minimumCorridorLengthMeters: 80,
} as const;

export type CorridorPolyline = {
  action: ActionDataContract;
  actionId: string;
  observedAtMs: number;
  coordinates: readonly [number, number][];
  lengthMeters: number;
};

export type CorridorMatch = {
  matches: boolean;
  overlapRatio: number;
  directionAgreement: number;
  matchedLengthMeters: number;
};

type CorridorCalibrationInput = {
  derivedCorridorKey: string;
  observations: readonly ActionDataContract[];
};

/**
 * Derived in-memory view only: source actions remain independent records and
 * are never replaced, aggregated, or persisted as a corridor.
 */
export type CorridorHistory = {
  derivedCorridorKey: string;
  actions: readonly ActionDataContract[];
  sourceGeometries: readonly CorridorPolyline[];
  calibrationInput: CorridorCalibrationInput;
};

type CorridorObservedScore = {
  actionId: string;
  observedAt: string;
  score: number | null;
};

export type CorridorHistorySummary = {
  derivedCorridorKey: string;
  label: string;
  isRecurring: true;
  actionCount: number;
  firstActionAt: string;
  lastActionAt: string;
  totalWasteKg: number;
  wasteKnownActions: number;
  wasteCoverageRate: number;
  totalCigaretteButts: number;
  totalVolunteers: number;
  volunteersKnownActions: number;
  volunteersCoverageRate: number;
  totalDurationMinutes: number;
  totalEngagementHours: number | null;
  observedScores: readonly CorridorObservedScore[];
  scoreEvolution: {
    first: number;
    latest: number;
    delta: number;
  } | null;
  latestProjection: {
    historicalScore: number;
    projectedScore: number;
    elapsedDays: number;
    isEstimate: boolean;
    projectionConfidence: ProjectionConfidence;
  } | null;
  calibrationInput: CorridorCalibrationInput;
};

function toCorridorPolyline(action: ActionDataContract): CorridorPolyline | null {
  if (
    action.type !== "action" ||
    action.status !== "approved" ||
    action.geometry.kind !== "polyline" ||
    (action.dataQuality ?? auditActionContract(action)).status === "blocking"
  ) {
    return null;
  }

  const coordinates = action.geometry.coordinates.filter(isFiniteCoordinatePair);
  if (coordinates.length < 2) {
    return null;
  }

  const observedAtMs = new Date(action.dates.observedAt).getTime();
  if (!Number.isFinite(observedAtMs)) {
    return null;
  }

  const referenceLatitude = coordinates.reduce(
    (sum, [latitude]) => sum + latitude,
    0,
  ) / coordinates.length;
  const projected = projectPolyline(coordinates, referenceLatitude);
  if (
    projected.lengthMeters < CORRIDOR_HISTORY_CONSTANTS.minimumCorridorLengthMeters
  ) {
    return null;
  }

  return {
    action,
    actionId: action.id,
    observedAtMs,
    coordinates,
    lengthMeters: projected.lengthMeters,
  };
}

function compareCorridorPolylines(
  left: CorridorPolyline,
  right: CorridorPolyline,
): number {
  return left.actionId.localeCompare(right.actionId);
}

function buildDerivedCorridorKey(actions: readonly ActionDataContract[]): string {
  return `derived-corridor:${actions
    .map((action) => action.id)
    .sort((left, right) => left.localeCompare(right))
    .join(",")}`;
}

export function matchCorridorPolylines(
  left: CorridorPolyline,
  right: CorridorPolyline,
): CorridorMatch {
  const referenceLatitude = resolveReferenceLatitude(
    left.coordinates,
    right.coordinates,
  );
  const leftProjected = projectPolyline(left.coordinates, referenceLatitude);
  const rightProjected = projectPolyline(right.coordinates, referenceLatitude);
  const coverageOptions = {
    sampleSpacingMeters: CORRIDOR_HISTORY_CONSTANTS.sampleSpacingMeters,
    maxPointToCorridorDistanceMeters:
      CORRIDOR_HISTORY_CONSTANTS.maxPointToCorridorDistanceMeters,
  };
  const leftCoverage = evaluateCoverage(
    leftProjected,
    rightProjected,
    coverageOptions,
  );
  const rightCoverage = evaluateCoverage(
    rightProjected,
    leftProjected,
    coverageOptions,
  );
  const overlapRatio = Math.min(
    leftCoverage.coverageRatio,
    rightCoverage.coverageRatio,
  );
  const matchedLengthMeters = Math.min(
    left.lengthMeters * leftCoverage.coverageRatio,
    right.lengthMeters * rightCoverage.coverageRatio,
  );
  const directionAgreement =
    (leftCoverage.directionAgreement + rightCoverage.directionAgreement) / 2;

  return {
    matches:
      matchedLengthMeters >=
        CORRIDOR_HISTORY_CONSTANTS.minimumCorridorLengthMeters &&
      overlapRatio >= CORRIDOR_HISTORY_CONSTANTS.minimumOverlapRatio &&
      directionAgreement >= CORRIDOR_HISTORY_CONSTANTS.minimumDirectionAgreement,
    overlapRatio,
    directionAgreement,
    matchedLengthMeters,
  };
}

function buildCorridorHistory(
  polylines: readonly CorridorPolyline[],
): CorridorHistory {
  const sourceGeometries = [...polylines].sort(compareCorridorPolylines);
  const actions = sourceGeometries
    .map((polyline) => polyline.action)
    .sort((left, right) => {
      const dateComparison = right.dates.observedAt.localeCompare(left.dates.observedAt);
      return dateComparison || right.id.localeCompare(left.id);
    });
  const derivedCorridorKey = buildDerivedCorridorKey(actions);
  const calibrationInput = {
    derivedCorridorKey,
    observations: actions,
  };

  return {
    derivedCorridorKey,
    actions,
    sourceGeometries,
    calibrationInput,
  };
}

/**
 * Groups only approved, valid action polylines. Groups are built conservatively
 * with pairwise compatibility, so a bridge action cannot merge two otherwise
 * incompatible corridors. Source contracts and their real geometries remain
 * untouched in the returned history.
 */
export function groupActionsByCorridor(
  actions: readonly ActionDataContract[],
): CorridorHistory[] {
  const polylines = actions
    .map(toCorridorPolyline)
    .flatMap((polyline) => (polyline ? [polyline] : []))
    .sort(compareCorridorPolylines);
  const groups: CorridorPolyline[][] = [];

  for (const polyline of polylines) {
    const group = groups.find((candidate) =>
      candidate.every((existing) => matchCorridorPolylines(existing, polyline).matches),
    );
    if (group) {
      group.push(polyline);
    } else {
      groups.push([polyline]);
    }
  }

  return groups
    .map((group) => buildCorridorHistory(group))
    .sort((left, right) => left.derivedCorridorKey.localeCompare(right.derivedCorridorKey));
}

export function findCorridorHistoryForAction(
  histories: readonly CorridorHistory[],
  actionId: string,
): CorridorHistory | null {
  return (
    histories.find((history) =>
      history.actions.some((action) => action.id === actionId),
    ) ?? null
  );
}

function resolveActionObservedScore(
  action: ActionDataContract,
  references?: PollutionScoreReferences,
): number | null {
  return computePollutionScoresRelativeToReferences(
    toPollutionScoreInput(action),
    references?.global,
  ).severityScore;
}

export function summarizeCorridorHistory(
  history: CorridorHistory,
  options: {
    references?: PollutionScoreReferences;
    now?: string | Date | number;
  } = {},
): CorridorHistorySummary {
  const actions = history.actions;
  const latestAction = actions[0];
  const oldestAction = actions.at(-1) ?? latestAction;
  const observedScores = actions.map((action) => ({
    actionId: action.id,
    observedAt: action.dates.observedAt,
    score: resolveActionObservedScore(action, options.references),
  }));
  const latestScore = observedScores[0]?.score ?? null;
  const oldestScore = observedScores.at(-1)?.score ?? null;
  const latestProjection =
    latestAction && latestScore !== null
      ? presentActionPollutionProjection(
          latestScore,
          latestAction.dates.observedAt,
          options.now ?? new Date(),
          {
            postActionScore: latestAction.metadata.postActionPollutionScore,
            geometryConfidence: latestAction.geometry.confidence,
            sourceCompleteness: "partial",
          },
        )
      : null;

  return {
    derivedCorridorKey: history.derivedCorridorKey,
    label: latestAction?.location.label ?? "Parcours récurrent",
    isRecurring: true,
    actionCount: actions.length,
    firstActionAt: oldestAction?.dates.observedAt ?? "",
    lastActionAt: latestAction?.dates.observedAt ?? "",
    totalWasteKg: actions.reduce(
      (total, action) =>
        total +
        (action.metadata.wasteKg !== null &&
        Number.isFinite(action.metadata.wasteKg) &&
        action.metadata.wasteKg >= 0
          ? action.metadata.wasteKg
          : 0),
      0,
    ),
    wasteKnownActions: actions.filter(
      (action) =>
        action.metadata.wasteKg !== null &&
        Number.isFinite(action.metadata.wasteKg) &&
        action.metadata.wasteKg >= 0,
    ).length,
    wasteCoverageRate:
      actions.length > 0
        ? (actions.filter(
            (action) =>
              action.metadata.wasteKg !== null &&
              Number.isFinite(action.metadata.wasteKg) &&
              action.metadata.wasteKg >= 0,
          ).length /
            actions.length) *
          100
        : 0,
    totalCigaretteButts: actions.reduce(
      (total, action) =>
        total + Math.max(0, action.metadata.cigaretteButts ?? 0),
      0,
    ),
    totalVolunteers: actions.reduce(
      (total, action) =>
        total +
        (action.metadata.volunteersCount === null
          ? 0
          : Math.max(0, action.metadata.volunteersCount)),
      0,
    ),
    volunteersKnownActions: actions.filter(
      (action) => action.metadata.volunteersCount !== null,
    ).length,
    volunteersCoverageRate:
      actions.length > 0
        ? (actions.filter(
            (action) => action.metadata.volunteersCount !== null,
          ).length /
            actions.length) *
          100
        : 0,
    totalDurationMinutes: actions.reduce(
      (total, action) => total + Math.max(0, action.metadata.durationMinutes),
      0,
    ),
    totalEngagementHours:
      actions.some((action) => action.metadata.volunteersCount === null)
        ? null
        : actions.reduce(
            (total, action) =>
              total +
              Math.max(0, action.metadata.durationMinutes) *
                Math.max(0, action.metadata.volunteersCount ?? 0),
            0,
          ) / 60,
    observedScores,
    scoreEvolution:
      oldestScore === null || latestScore === null
        ? null
        : {
            first: oldestScore,
            latest: latestScore,
            delta: latestScore - oldestScore,
          },
    latestProjection: latestProjection
      ? {
          historicalScore: latestProjection.historicalScore,
          projectedScore: latestProjection.projectedPollutionScore,
          elapsedDays: latestProjection.elapsedDays,
          isEstimate: latestProjection.isEstimate,
          projectionConfidence: latestProjection.projectionConfidence,
        }
      : null,
    calibrationInput: history.calibrationInput,
  };
}
