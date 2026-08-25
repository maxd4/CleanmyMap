import type { PollutionScoreReferences } from "./pollution-score";
import {
  computePollutionScores,
  computePollutionScoresRelativeToReferences,
} from "./pollution-score";
import type { ActionDataContract } from "./contract-model";
import { auditActionContract } from "./data-quality";
import { presentActionPollutionProjection } from "./revisit-priority";

const METERS_PER_DEGREE_LATITUDE = 111_320;

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

export type CorridorCalibrationInput = {
  derivedCorridorKey: string;
  observations: readonly ActionDataContract[];
};

export type CorridorHistory = {
  derivedCorridorKey: string;
  actions: readonly ActionDataContract[];
  sourceGeometries: readonly CorridorPolyline[];
  calibrationInput: CorridorCalibrationInput;
};

export type CorridorObservedScore = {
  actionId: string;
  observedAt: string;
  score: number;
};

export type CorridorHistorySummary = {
  derivedCorridorKey: string;
  label: string;
  isRecurring: true;
  actionCount: number;
  firstActionAt: string;
  lastActionAt: string;
  totalWasteKg: number;
  totalCigaretteButts: number;
  totalVolunteers: number;
  totalDurationMinutes: number;
  totalEngagementHours: number;
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
  } | null;
  calibrationInput: CorridorCalibrationInput;
};

type Point = { x: number; y: number };
type Direction = { x: number; y: number };
type Sample = { point: Point; direction: Direction };
type ProjectedCorridor = {
  points: Point[];
  lengthMeters: number;
};

function isFiniteCoordinatePair(
  coordinate: readonly [number, number],
): boolean {
  const [latitude, longitude] = coordinate;
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceBetweenPoints(left: Point, right: Point): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function directionBetween(left: Point, right: Point): Direction {
  const length = distanceBetweenPoints(left, right);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (right.x - left.x) / length,
    y: (right.y - left.y) / length,
  };
}

function projectCoordinate(
  coordinate: readonly [number, number],
  referenceLatitude: number,
): Point {
  const [latitude, longitude] = coordinate;
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.max(0.1, Math.cos(toRadians(referenceLatitude)));
  return {
    x: longitude * metersPerDegreeLongitude,
    y: latitude * METERS_PER_DEGREE_LATITUDE,
  };
}

function projectPolyline(
  coordinates: readonly [number, number][],
  referenceLatitude: number,
): ProjectedCorridor {
  const points = coordinates.map((coordinate) =>
    projectCoordinate(coordinate, referenceLatitude),
  );
  let lengthMeters = 0;
  for (let index = 1; index < points.length; index += 1) {
    lengthMeters += distanceBetweenPoints(points[index - 1], points[index]);
  }
  return { points, lengthMeters };
}

function resolveReferenceLatitude(
  left: readonly [number, number][],
  right: readonly [number, number][],
): number {
  const coordinates = [...left, ...right];
  return (
    coordinates.reduce((sum, [latitude]) => sum + latitude, 0) /
    Math.max(1, coordinates.length)
  );
}

function samplePolyline(
  polyline: ProjectedCorridor,
  spacingMeters: number,
): Sample[] {
  const samples: Sample[] = [];
  for (let index = 1; index < polyline.points.length; index += 1) {
    const start = polyline.points[index - 1];
    const end = polyline.points[index];
    const segmentLength = distanceBetweenPoints(start, end);
    if (segmentLength === 0) {
      continue;
    }

    const direction = directionBetween(start, end);
    const steps = Math.max(1, Math.ceil(segmentLength / spacingMeters));
    for (let step = 0; step < steps; step += 1) {
      const ratio = step / steps;
      samples.push({
        point: {
          x: start.x + (end.x - start.x) * ratio,
          y: start.y + (end.y - start.y) * ratio,
        },
        direction,
      });
    }
  }

  const lastPoint = polyline.points.at(-1);
  const previousPoint = polyline.points.at(-2);
  if (lastPoint && previousPoint) {
    samples.push({
      point: lastPoint,
      direction: directionBetween(previousPoint, lastPoint),
    });
  }
  return samples;
}

function nearestPointOnPolyline(
  sample: Sample,
  target: ProjectedCorridor,
): { distanceMeters: number; directionAgreement: number } | null {
  let nearest: { distanceMeters: number; directionAgreement: number } | null = null;

  for (let index = 1; index < target.points.length; index += 1) {
    const start = target.points[index - 1];
    const end = target.points[index];
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    if (segmentLengthSquared === 0) {
      continue;
    }

    const projection =
      ((sample.point.x - start.x) * segmentX +
        (sample.point.y - start.y) * segmentY) /
      segmentLengthSquared;
    const ratio = Math.max(0, Math.min(1, projection));
    const closest = {
      x: start.x + segmentX * ratio,
      y: start.y + segmentY * ratio,
    };
    const distanceMeters = distanceBetweenPoints(sample.point, closest);
    const targetDirection = directionBetween(start, end);
    const directionAgreement = Math.abs(
      sample.direction.x * targetDirection.x +
        sample.direction.y * targetDirection.y,
    );
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { distanceMeters, directionAgreement };
    }
  }

  return nearest;
}

function evaluateCoverage(
  source: ProjectedCorridor,
  target: ProjectedCorridor,
): { coverageRatio: number; directionAgreement: number } {
  const samples = samplePolyline(
    source,
    CORRIDOR_HISTORY_CONSTANTS.sampleSpacingMeters,
  );
  if (samples.length === 0) {
    return { coverageRatio: 0, directionAgreement: 0 };
  }

  let coveredCount = 0;
  let directionSum = 0;
  for (const sample of samples) {
    const nearest = nearestPointOnPolyline(sample, target);
    if (
      nearest &&
      nearest.distanceMeters <=
        CORRIDOR_HISTORY_CONSTANTS.maxPointToCorridorDistanceMeters
    ) {
      coveredCount += 1;
      directionSum += nearest.directionAgreement;
    }
  }

  return {
    coverageRatio: coveredCount / samples.length,
    directionAgreement: coveredCount === 0 ? 0 : directionSum / coveredCount,
  };
}

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
  const leftCoverage = evaluateCoverage(leftProjected, rightProjected);
  const rightCoverage = evaluateCoverage(rightProjected, leftProjected);
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
): number {
  const hasPollution = action.metadata.wasteKg > 0 || action.metadata.cigaretteButts > 0;
  if (!hasPollution) {
    return computePollutionScores({
      wasteKg: action.metadata.wasteKg,
      cigaretteButts: action.metadata.cigaretteButts,
    }).severityScore;
  }
  return computePollutionScoresRelativeToReferences(
    {
      wasteKg: action.metadata.wasteKg,
      cigaretteButts: action.metadata.cigaretteButts,
      volunteersCount: action.metadata.volunteersCount,
    },
    references,
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
          { postActionScore: latestAction.metadata.postActionPollutionScore },
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
      (total, action) => total + Math.max(0, action.metadata.wasteKg),
      0,
    ),
    totalCigaretteButts: actions.reduce(
      (total, action) => total + Math.max(0, action.metadata.cigaretteButts),
      0,
    ),
    totalVolunteers: actions.reduce(
      (total, action) => total + Math.max(0, action.metadata.volunteersCount),
      0,
    ),
    totalDurationMinutes: actions.reduce(
      (total, action) => total + Math.max(0, action.metadata.durationMinutes),
      0,
    ),
    totalEngagementHours:
      actions.reduce(
        (total, action) =>
          total +
          Math.max(0, action.metadata.durationMinutes) *
            Math.max(0, action.metadata.volunteersCount),
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
        }
      : null,
    calibrationInput: history.calibrationInput,
  };
}

export { distanceBetweenPoints };
