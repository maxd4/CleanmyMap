import type { PollutionScoreReferences } from "./pollution-score";
import type { ActionDataContract } from "../contracts/contract-model";
import {
  auditActionContract,
} from "../data-quality";
import {
  canMergeDerivedPlaceObservations,
  deriveLocalRepollutionHistories,
  distanceBetweenCoordinatesMeters,
  normalizeDerivedPlaceLabel,
  presentActionPollutionProjectionWithLocalHistory,
  type DerivedPlaceHistory,
  type DerivedPlaceObservation,
  type LocalRepollutionScoreResolver,
  type RepollutionDatasetCompleteness,
} from "./local-repollution-calibration";
import { ACTION_POLLUTION_PROJECTION_CONSTANTS } from "./revisit-priority";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CurrentPlaceStateSource =
  | "observed"
  | "projected"
  | "historical";

export type CurrentPlaceStateMode = "observed" | "projected_today";

export type CurrentPlaceStateScoreKind =
  | "measured"
  | "projected"
  | "unavailable";

export type CurrentPlaceStateProvenance =
  | "observed_action"
  | "observed_trash_spotter"
  | "observed_clean_place"
  | "projected_generic"
  | "projected_local_history"
  | "historical_action";

export type CurrentPlaceState = {
  derivedPlaceKey: string;
  source: CurrentPlaceStateSource;
  date: string;
  lastActionDate: string | null;
  recordId: string;
  recordSource: string;
  record: ActionDataContract;
  historicalActions: readonly ActionDataContract[];
  historicalAction: ActionDataContract | null;
  score: number | null;
  scoreKind: CurrentPlaceStateScoreKind;
  provenance: CurrentPlaceStateProvenance;
  label: string;
  stateLabel: string;
  isExplicitlyClean: boolean;
};

export type CurrentPlaceStateViews = {
  derivedPlaceKey: string;
  observed: CurrentPlaceState | null;
  projectedToday: CurrentPlaceState | null;
};

export type ResolveCurrentPlaceStatesOptions = {
  asOf?: string | Date | number;
  sourceCompleteness: RepollutionDatasetCompleteness;
  pollutionScoreReferences?: PollutionScoreReferences | null;
  historicalScoreResolver?: LocalRepollutionScoreResolver;
  /** Future seam for a canonical quantified Trash Spotter contract. */
  quantitativeScoreResolver?: (record: ActionDataContract) => number | null;
};

type PlaceCandidate = Pick<
  DerivedPlaceObservation,
  "latitude" | "longitude" | "normalizedLabel"
> & {
  record: ActionDataContract;
  observedAtMs: number;
};

type PlaceBucket = {
  derivedPlaceKey: string;
  history: DerivedPlaceHistory | null;
  records: ActionDataContract[];
};

function clampScore(value: number): number {
  return Math.max(
    0,
    Math.min(ACTION_POLLUTION_PROJECTION_CONSTANTS.maxScore, value),
  );
}

function resolveAsOfMs(value: string | Date | number | undefined): number {
  const parsed = value === undefined ? Date.now() : new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function resolveRecordDate(record: ActionDataContract): number | null {
  const timestamp = new Date(record.dates.observedAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function compareRecords(left: ActionDataContract, right: ActionDataContract): number {
  const leftDate = resolveRecordDate(left) ?? Number.POSITIVE_INFINITY;
  const rightDate = resolveRecordDate(right) ?? Number.POSITIVE_INFINITY;
  return leftDate - rightDate || left.id.localeCompare(right.id);
}

function isUsableNonActionRecord(record: ActionDataContract): boolean {
  if (
    (record.type !== "spot" && record.type !== "clean_place") ||
    record.status !== "approved" ||
    record.geometry.kind === "polyline"
  ) {
    return false;
  }

  const quality = record.dataQuality ?? auditActionContract(record);
  return quality.status !== "blocking";
}

function toPlaceCandidate(record: ActionDataContract): PlaceCandidate | null {
  if (!isUsableNonActionRecord(record)) {
    return null;
  }

  const latitude = record.location.latitude;
  const longitude = record.location.longitude;
  const observedAtMs = resolveRecordDate(record);
  const normalizedLabel = normalizeDerivedPlaceLabel(record.location.label);
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    observedAtMs === null ||
    !normalizedLabel
  ) {
    return null;
  }

  return {
    record,
    observedAtMs,
    latitude,
    longitude,
    normalizedLabel,
  };
}

function compareCandidates(left: PlaceCandidate, right: PlaceCandidate): number {
  return left.observedAtMs - right.observedAtMs || left.record.id.localeCompare(right.record.id);
}

function buildDerivedPlaceKey(records: readonly ActionDataContract[]): string {
  return `derived-place:${records
    .map((record) => record.id)
    .sort((left, right) => left.localeCompare(right))
    .join(",")}`;
}

function candidateMatchesHistory(
  candidate: PlaceCandidate,
  history: DerivedPlaceHistory,
): boolean {
  return history.observations.every((observation) =>
    canMergeDerivedPlaceObservations(observation, candidate),
  );
}

function groupStandaloneCandidates(candidates: readonly PlaceCandidate[]): PlaceBucket[] {
  const groups: PlaceCandidate[][] = [];
  for (const candidate of [...candidates].sort(compareCandidates)) {
    const group = groups.find((existing) =>
      existing.every((member) => canMergeDerivedPlaceObservations(member, candidate)),
    );
    if (group) {
      group.push(candidate);
    } else {
      groups.push([candidate]);
    }
  }

  return groups
    .map((group) => {
      const records = group.map((candidate) => candidate.record).sort(compareRecords);
      return {
        derivedPlaceKey: buildDerivedPlaceKey(records),
        history: null,
        records,
      };
    })
    .sort((left, right) => left.derivedPlaceKey.localeCompare(right.derivedPlaceKey));
}

function buildPlaceBuckets(
  histories: readonly DerivedPlaceHistory[],
  candidates: readonly PlaceCandidate[],
): PlaceBucket[] {
  const buckets = histories.map((history) => ({
    derivedPlaceKey: history.derivedPlaceKey,
    history,
    records: history.observations.map((observation) => observation.action),
  }));
  const standaloneCandidates: PlaceCandidate[] = [];

  for (const candidate of [...candidates].sort(compareCandidates)) {
    const matchingBucket = buckets
      .filter((bucket) => bucket.history && candidateMatchesHistory(candidate, bucket.history))
      .sort((left, right) => left.derivedPlaceKey.localeCompare(right.derivedPlaceKey))[0];
    if (matchingBucket) {
      matchingBucket.records.push(candidate.record);
    } else {
      standaloneCandidates.push(candidate);
    }
  }

  return [
    ...buckets,
    ...groupStandaloneCandidates(standaloneCandidates),
  ]
    .map((bucket) => ({
      ...bucket,
      records: [...bucket.records].sort(compareRecords),
    }))
    .sort((left, right) => left.derivedPlaceKey.localeCompare(right.derivedPlaceKey));
}

function resolveQuantitativeSpotScore(
  record: ActionDataContract,
  options: ResolveCurrentPlaceStatesOptions,
): number | null {
  const contractScore = record.metadata.observedPollutionScore;
  const resolvedScore =
    typeof contractScore === "number"
      ? contractScore
      : options.quantitativeScoreResolver?.(record);
  return typeof resolvedScore === "number" && Number.isFinite(resolvedScore)
    ? clampScore(resolvedScore)
    : null;
}

function stateFromObservedRecord(
  record: ActionDataContract,
  bucket: PlaceBucket,
  latestAction: DerivedPlaceObservation | null,
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceState {
  const score =
    record.type === "spot"
      ? resolveQuantitativeSpotScore(record, options)
      : null;
  const isClean = record.type === "clean_place";
  const isQuantified = record.type === "spot" && score !== null;

  return {
    derivedPlaceKey: bucket.derivedPlaceKey,
    source: "observed",
    date: record.dates.observedAt,
    lastActionDate: latestAction?.observedAt ?? null,
    recordId: record.id,
    recordSource: record.source,
    record,
    historicalActions: bucket.history?.observations.map((observation) => observation.action) ?? [],
    historicalAction: latestAction?.action ?? null,
    score: isQuantified ? score : null,
    scoreKind: isQuantified ? "measured" : "unavailable",
    provenance: isClean ? "observed_clean_place" : "observed_trash_spotter",
    label: record.location.label,
    stateLabel: isClean
      ? "Lieu explicitement propre"
      : isQuantified
        ? "Pollution observée"
        : "Pollution observée · niveau non quantifié",
    isExplicitlyClean: isClean,
  };
}

function stateFromObservedAction(
  latestAction: DerivedPlaceObservation,
  bucket: PlaceBucket,
  score: number,
): CurrentPlaceState {
  return {
    derivedPlaceKey: bucket.derivedPlaceKey,
    source: "observed",
    date: latestAction.observedAt,
    lastActionDate: latestAction.observedAt,
    recordId: latestAction.actionId,
    recordSource: latestAction.action.source,
    record: latestAction.action,
    historicalActions:
      bucket.history?.observations.map((observation) => observation.action) ?? [],
    historicalAction: latestAction.action,
    score: clampScore(score),
    scoreKind: "measured",
    provenance: "observed_action",
    label: latestAction.action.location.label,
    stateLabel: "Pollution observée",
    isExplicitlyClean: false,
  };
}

function resolveLatestObservedState(
  bucket: PlaceBucket,
  latestAction: DerivedPlaceObservation | null,
  laterRecords: ActionDataContract[],
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceState | null {
  if (laterRecords.length > 0) {
    return stateFromObservedRecord(
      laterRecords.at(-1) as ActionDataContract,
      bucket,
      latestAction,
      options,
    );
  }

  if (latestAction) {
    const score =
      latestAction.postActionScoreSource === "measured"
        ? latestAction.postActionScore
        : latestAction.historicalScore;
    return stateFromObservedAction(latestAction, bucket, score);
  }

  const latestRecord = bucket.records.at(-1);
  return latestRecord
    ? stateFromObservedRecord(latestRecord, bucket, null, options)
    : null;
}

function resolveProjectedTodayState(
  bucket: PlaceBucket,
  asOfMs: number,
  latestAction: DerivedPlaceObservation | null,
  laterRecords: ActionDataContract[],
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceState | null {
  if (laterRecords.length > 0) {
    return stateFromObservedRecord(
      laterRecords.at(-1) as ActionDataContract,
      bucket,
      latestAction,
      options,
    );
  }

  if (!latestAction) {
    const latestRecord = bucket.records.at(-1);
    return latestRecord
      ? stateFromObservedRecord(latestRecord, bucket, null, options)
      : null;
  }

  const projection = presentActionPollutionProjectionWithLocalHistory(
    latestAction.historicalScore,
    latestAction.observedAt,
    asOfMs,
    {
      sourceCompleteness: options.sourceCompleteness,
      postActionScore:
        latestAction.postActionScoreSource === "measured"
          ? latestAction.postActionScore
          : undefined,
      localCalibration: bucket.history?.calibration,
    },
  );

  if (!Number.isFinite(projection.projectedPollutionScore)) {
    return stateFromObservedAction(
      latestAction,
      bucket,
      latestAction.historicalScore,
    );
  }

  return {
    derivedPlaceKey: bucket.derivedPlaceKey,
    source: "projected",
    date: latestAction.observedAt,
    lastActionDate: latestAction.observedAt,
    recordId: latestAction.actionId,
    recordSource: latestAction.action.source,
    record: latestAction.action,
    historicalActions: bucket.history?.observations.map((observation) => observation.action) ?? [],
    historicalAction: latestAction.action,
    score: projection.projectedPollutionScore,
    scoreKind: "projected",
    provenance:
      projection.provenance === "local_history"
        ? "projected_local_history"
        : "projected_generic",
    label: latestAction.action.location.label,
    stateLabel: "Pollution projetée",
    isExplicitlyClean: false,
  };
}

function buildPlaceBucketsForRecords(
  records: readonly ActionDataContract[],
  asOfMs: number,
  options: ResolveCurrentPlaceStatesOptions,
): PlaceBucket[] {
  const visibleRecords = records.filter((record) => {
    const timestamp = resolveRecordDate(record);
    return timestamp !== null && timestamp <= asOfMs;
  });
  const historyOptions = {
    sourceCompleteness: options.sourceCompleteness,
    pollutionScoreReferences: options.pollutionScoreReferences,
    historicalScoreResolver: options.historicalScoreResolver,
  };
  const histories = deriveLocalRepollutionHistories(
    visibleRecords.filter((record) => record.type === "action"),
    historyOptions,
  ).places;
  const candidates = visibleRecords
    .filter((record) => record.type !== "action")
    .map(toPlaceCandidate)
    .flatMap((candidate) => (candidate ? [candidate] : []));

  return buildPlaceBuckets(histories, candidates);
}

function resolveLaterRecords(
  bucket: PlaceBucket,
  asOfMs: number,
  latestAction: DerivedPlaceObservation | null,
): ActionDataContract[] {
  const actionDateMs = latestAction?.observedAtMs ?? null;
  return bucket.records
    .filter((record) => record.type !== "action")
    .filter((record) => {
      const timestamp = resolveRecordDate(record);
      return (
        timestamp !== null &&
        timestamp <= asOfMs &&
        (actionDateMs === null || timestamp > actionDateMs)
      );
    })
    .sort(compareRecords);
}

function resolveBucketState(
  bucket: PlaceBucket,
  asOfMs: number,
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceState | null {
  const history = bucket.history;
  const latestAction = history?.observations.at(-1) ?? null;
  const actionDateMs = latestAction?.observedAtMs ?? null;
  const laterRecords = bucket.records
    .filter((record) => record.type !== "action")
    .filter((record) => {
      const timestamp = resolveRecordDate(record);
      return (
        timestamp !== null &&
        timestamp <= asOfMs &&
        (actionDateMs === null || timestamp > actionDateMs)
      );
    })
    .sort(compareRecords);

  if (laterRecords.length > 0) {
    return stateFromObservedRecord(
      laterRecords.at(-1) as ActionDataContract,
      bucket,
      latestAction,
      options,
    );
  }

  if (history && latestAction) {
    if (history.observations.length >= 2) {
      return {
        derivedPlaceKey: bucket.derivedPlaceKey,
        source: "observed",
        date: latestAction.observedAt,
        lastActionDate: latestAction.observedAt,
        recordId: latestAction.actionId,
        recordSource: latestAction.action.source,
        record: latestAction.action,
        historicalActions: history.observations.map((observation) => observation.action),
        historicalAction: latestAction.action,
        score: latestAction.historicalScore,
        scoreKind: "measured",
        provenance: "observed_action",
        label: latestAction.action.location.label,
        stateLabel: "Pollution observée",
        isExplicitlyClean: false,
      };
    }

    const projection = presentActionPollutionProjectionWithLocalHistory(
      latestAction.historicalScore,
      latestAction.observedAt,
      asOfMs,
      {
        sourceCompleteness: options.sourceCompleteness,
        postActionScore:
          latestAction.postActionScoreSource === "measured"
            ? latestAction.postActionScore
            : undefined,
        localCalibration: history.calibration,
      },
    );
    if (Number.isFinite(projection.projectedPollutionScore)) {
      return {
        derivedPlaceKey: bucket.derivedPlaceKey,
        source: "projected",
        date: latestAction.observedAt,
        lastActionDate: latestAction.observedAt,
        recordId: latestAction.actionId,
        recordSource: latestAction.action.source,
        record: latestAction.action,
        historicalActions: history.observations.map((observation) => observation.action),
        historicalAction: latestAction.action,
        score: projection.projectedPollutionScore,
        scoreKind: "projected",
        provenance:
          projection.provenance === "local_history"
            ? "projected_local_history"
            : "projected_generic",
        label: latestAction.action.location.label,
        stateLabel: "Pollution projetée",
        isExplicitlyClean: false,
      };
    }

    return {
      derivedPlaceKey: bucket.derivedPlaceKey,
      source: "historical",
      date: latestAction.observedAt,
      lastActionDate: latestAction.observedAt,
      recordId: latestAction.actionId,
      recordSource: latestAction.action.source,
      record: latestAction.action,
      historicalActions: history.observations.map((observation) => observation.action),
      historicalAction: latestAction.action,
      score: latestAction.historicalScore,
      scoreKind: "measured",
      provenance: "historical_action",
      label: latestAction.action.location.label,
      stateLabel: "Pollution historique",
      isExplicitlyClean: false,
    };
  }

  const latestRecord = bucket.records.at(-1);
  return latestRecord
    ? stateFromObservedRecord(latestRecord, bucket, null, options)
    : null;
}

/**
 * Resolves one deterministic current state per derived place without mutating
 * or merging the source contracts. Polylines deliberately never become place
 * history anchors, so a point observation cannot recolor an entire route.
 */
export function resolveCurrentPlaceStates(
  records: readonly ActionDataContract[],
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceState[] {
  const asOfMs = resolveAsOfMs(options.asOf);
  return buildPlaceBucketsForRecords(records, asOfMs, options)
    .map((bucket) => resolveBucketState(bucket, asOfMs, options))
    .flatMap((state) => (state ? [state] : []));
}

/**
 * Resolves the two map readings from the same source contracts. The observed
 * view never falls back to the model baseline; the projected view keeps field
 * observations newer than a projection authoritative.
 */
export function resolveCurrentPlaceStateViews(
  records: readonly ActionDataContract[],
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceStateViews[] {
  const asOfMs = resolveAsOfMs(options.asOf);

  return buildPlaceBucketsForRecords(records, asOfMs, options)
    .map((bucket) => {
      const latestAction = bucket.history?.observations.at(-1) ?? null;
      const laterRecords = resolveLaterRecords(bucket, asOfMs, latestAction);
      return {
        derivedPlaceKey: bucket.derivedPlaceKey,
        observed: resolveLatestObservedState(
          bucket,
          latestAction,
          laterRecords,
          options,
        ),
        projectedToday: resolveProjectedTodayState(
          bucket,
          asOfMs,
          latestAction,
          laterRecords,
          options,
        ),
      };
    })
    .sort((left, right) => left.derivedPlaceKey.localeCompare(right.derivedPlaceKey));
}

export function resolveCurrentPlaceStateForRecord(
  views: readonly CurrentPlaceStateViews[],
  recordId: string,
  mode: CurrentPlaceStateMode,
): CurrentPlaceState | null {
  for (const view of views) {
    const state = view[mode === "observed" ? "observed" : "projectedToday"];
    if (!state) {
      continue;
    }

    if (
      state.recordId === recordId ||
      state.historicalActions.some((record) => record.id === recordId)
    ) {
      return state;
    }
  }

  return null;
}

/** Alias naming the domain capability explicitly as a place-level resolver. */
export const resolveCurrentPlaceStateByPlace = resolveCurrentPlaceStates;

export function elapsedDaysSinceCurrentPlaceState(
  state: CurrentPlaceState,
  asOf: string | Date | number,
): number {
  const current = resolveAsOfMs(asOf);
  const date = new Date(state.date).getTime();
  return Number.isFinite(date) ? Math.max(0, (current - date) / DAY_MS) : 0;
}

export { distanceBetweenCoordinatesMeters };
