import type { PollutionScoreReferences } from "./pollution-score";
import type { ActionDataContract } from "../contracts/contract-model";
import {
  presentActionPollutionProjectionWithLocalHistory,
  type DerivedPlaceHistory,
  type DerivedPlaceObservation,
  type LocalRepollutionScoreResolver,
  type RepollutionDatasetCompleteness,
} from "./local-repollution-calibration";
import {
  buildPlaceBucketsForRecords,
  resolveLaterRecords,
  type PlaceBucket,
} from "./current-place-buckets";
import { ACTION_POLLUTION_PROJECTION_CONSTANTS } from "./revisit-priority";

type CurrentPlaceStateSource =
  | "observed"
  | "projected"
  | "historical";

export type CurrentPlaceStateMode = "observed" | "projected_today";

type CurrentPlaceStateScoreKind =
  | "measured"
  | "projected"
  | "unavailable";

type CurrentPlaceStateProvenance =
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

type CurrentPlaceStateBase = Pick<CurrentPlaceState,
  | "derivedPlaceKey" | "date" | "lastActionDate" | "recordId" | "recordSource"
  | "record" | "historicalActions" | "historicalAction" | "label">;
function buildCurrentPlaceStateBase(params: {
  bucket: PlaceBucket;
  record: ActionDataContract;
  date: string;
  lastActionDate: string | null;
  recordId?: string;
  historicalAction?: ActionDataContract | null;
  historicalActions?: readonly ActionDataContract[];
}): CurrentPlaceStateBase {
  return {
    derivedPlaceKey: params.bucket.derivedPlaceKey,
    date: params.date,
    lastActionDate: params.lastActionDate,
    recordId: params.recordId ?? params.record.id,
    recordSource: params.record.source,
    record: params.record,
    historicalActions: params.historicalActions ??
      params.bucket.history?.observations.map((observation) => observation.action) ?? [],
    historicalAction: params.historicalAction ?? null,
    label: params.record.location.label,
  };
}
function buildActionPlaceStateBase(bucket: PlaceBucket, latestAction: DerivedPlaceObservation,
  historicalActions?: readonly ActionDataContract[]): CurrentPlaceStateBase {
  return buildCurrentPlaceStateBase({
    bucket,
    record: latestAction.action,
    date: latestAction.observedAt,
    lastActionDate: latestAction.observedAt,
    recordId: latestAction.actionId,
    historicalAction: latestAction.action,
    historicalActions,
  });
}
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
    ...buildCurrentPlaceStateBase({
      bucket,
      record,
      date: record.dates.observedAt,
      lastActionDate: latestAction?.observedAt ?? null,
      historicalAction: latestAction?.action,
    }),
    source: "observed",
    score: isQuantified ? score : null,
    scoreKind: isQuantified ? "measured" : "unavailable",
    provenance: isClean ? "observed_clean_place" : "observed_trash_spotter",
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
    ...buildActionPlaceStateBase(bucket, latestAction),
    source: "observed",
    score: clampScore(score),
    scoreKind: "measured",
    provenance: "observed_action",
    stateLabel: "Pollution observée",
    isExplicitlyClean: false,
  };
}

function stateFromLatestAvailableRecord(
  bucket: PlaceBucket,
  latestAction: DerivedPlaceObservation | null,
  laterRecords: ActionDataContract[],
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceState | null {
  const record = laterRecords.at(-1) ?? bucket.records.at(-1);
  return record ? stateFromObservedRecord(record, bucket, latestAction, options) : null;
}

function resolveLatestObservedState(
  bucket: PlaceBucket,
  latestAction: DerivedPlaceObservation | null,
  laterRecords: ActionDataContract[],
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceState | null {
  if (laterRecords.length > 0) {
    return stateFromLatestAvailableRecord(bucket, latestAction, laterRecords, options);
  }

  if (latestAction) {
    const score =
      latestAction.postActionScoreSource === "measured"
        ? latestAction.postActionScore
        : latestAction.historicalScore;
    return stateFromObservedAction(latestAction, bucket, score);
  }

  return stateFromLatestAvailableRecord(bucket, null, laterRecords, options);
}

function resolveProjectedTodayState(
  bucket: PlaceBucket,
  asOfMs: number,
  latestAction: DerivedPlaceObservation | null,
  laterRecords: ActionDataContract[],
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceState | null {
  if (laterRecords.length > 0) {
    return stateFromLatestAvailableRecord(bucket, latestAction, laterRecords, options);
  }

  if (!latestAction) {
    return stateFromLatestAvailableRecord(bucket, null, laterRecords, options);
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
    ...buildActionPlaceStateBase(bucket, latestAction),
    source: "projected",
    score: projection.projectedPollutionScore,
    scoreKind: "projected",
    provenance:
      projection.provenance === "local_history"
        ? "projected_local_history"
        : "projected_generic",
    stateLabel: "Pollution projetée",
    isExplicitlyClean: false,
  };
}

function stateFromHistoricalAction(
  bucket: PlaceBucket,
  latestAction: DerivedPlaceObservation,
  historicalActions: readonly ActionDataContract[],
): CurrentPlaceState {
  return {
    ...buildActionPlaceStateBase(bucket, latestAction, historicalActions),
    source: "historical",
    score: latestAction.historicalScore,
    scoreKind: "measured",
    provenance: "historical_action",
    stateLabel: "Pollution historique",
    isExplicitlyClean: false,
  };
}

function stateFromProjectedHistoricalAction(
  bucket: PlaceBucket,
  latestAction: DerivedPlaceObservation,
  historicalActions: readonly ActionDataContract[],
  score: number,
  provenance: CurrentPlaceStateProvenance,
): CurrentPlaceState {
  return {
    ...buildActionPlaceStateBase(bucket, latestAction, historicalActions),
    source: "projected",
    score,
    scoreKind: "projected",
    provenance,
    stateLabel: "Pollution projetée",
    isExplicitlyClean: false,
  };
}

function resolveHistoricalBucketState(
  bucket: PlaceBucket,
  asOfMs: number,
  history: DerivedPlaceHistory,
  latestAction: DerivedPlaceObservation,
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceState {
  const historicalActions = history.observations.map((observation) => observation.action);
  if (history.observations.length >= 2) {
    return {
      ...buildActionPlaceStateBase(bucket, latestAction, historicalActions),
      source: "observed",
      score: latestAction.historicalScore,
      scoreKind: "measured",
      provenance: "observed_action",
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
    return stateFromProjectedHistoricalAction(
      bucket,
      latestAction,
      historicalActions,
      projection.projectedPollutionScore,
      projection.provenance === "local_history"
        ? "projected_local_history"
        : "projected_generic",
    );
  }

  return stateFromHistoricalAction(bucket, latestAction, historicalActions);
}

function resolveBucketState(
  bucket: PlaceBucket,
  asOfMs: number,
  options: ResolveCurrentPlaceStatesOptions,
): CurrentPlaceState | null {
  const history = bucket.history;
  const latestAction = history?.observations.at(-1) ?? null;
  const laterRecords = resolveLaterRecords(bucket, asOfMs, latestAction);

  if (laterRecords.length > 0) {
    return stateFromObservedRecord(
      laterRecords.at(-1) as ActionDataContract,
      bucket,
      latestAction,
      options,
    );
  }

  if (history && latestAction) {
    return resolveHistoricalBucketState(
      bucket,
      asOfMs,
      history,
      latestAction,
      options,
    );
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
