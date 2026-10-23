import type { ActionDataContract } from "../contracts/contract-model";
import { auditActionContract } from "../quality/data-quality";
import {
  canMergeDerivedPlaceObservations,
  deriveLocalRepollutionHistories,
  normalizeDerivedPlaceLabel,
  type DerivedPlaceHistory,
  type DerivedPlaceObservation,
} from "./local-repollution-calibration";
import type { ResolveCurrentPlaceStatesOptions } from "./current-place-state";

type PlaceCandidate = Pick<DerivedPlaceObservation, "latitude" | "longitude" | "normalizedLabel"> & {
  record: ActionDataContract;
  observedAtMs: number;
};

export type PlaceBucket = {
  derivedPlaceKey: string;
  history: DerivedPlaceHistory | null;
  records: ActionDataContract[];
};

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
  if ((record.type !== "spot" && record.type !== "clean_place") || record.status !== "approved" || record.geometry.kind === "polyline") return false;
  const quality = record.dataQuality ?? auditActionContract(record);
  return quality.status !== "blocking";
}

function toPlaceCandidate(record: ActionDataContract): PlaceCandidate | null {
  if (!isUsableNonActionRecord(record)) return null;
  const latitude = record.location.latitude;
  const longitude = record.location.longitude;
  const observedAtMs = resolveRecordDate(record);
  const normalizedLabel = normalizeDerivedPlaceLabel(record.location.label);
  if (
    typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || observedAtMs === null || !normalizedLabel
  ) return null;
  return { record, observedAtMs, latitude, longitude, normalizedLabel };
}

function compareCandidates(left: PlaceCandidate, right: PlaceCandidate): number {
  return left.observedAtMs - right.observedAtMs || left.record.id.localeCompare(right.record.id);
}

function buildDerivedPlaceKey(records: readonly ActionDataContract[]): string {
  return `derived-place:${records.map((record) => record.id).sort((left, right) => left.localeCompare(right)).join(",")}`;
}

function candidateMatchesHistory(candidate: PlaceCandidate, history: DerivedPlaceHistory): boolean {
  return history.observations.every((observation) => canMergeDerivedPlaceObservations(observation, candidate));
}

function groupStandaloneCandidates(candidates: readonly PlaceCandidate[]): PlaceBucket[] {
  const groups: PlaceCandidate[][] = [];
  for (const candidate of [...candidates].sort(compareCandidates)) {
    const group = groups.find((existing) => existing.every((member) => canMergeDerivedPlaceObservations(member, candidate)));
    if (group) group.push(candidate);
    else groups.push([candidate]);
  }
  return groups
    .map((group) => {
      const records = group.map((candidate) => candidate.record).sort(compareRecords);
      return { derivedPlaceKey: buildDerivedPlaceKey(records), history: null, records };
    })
    .sort((left, right) => left.derivedPlaceKey.localeCompare(right.derivedPlaceKey));
}

function buildPlaceBuckets(histories: readonly DerivedPlaceHistory[], candidates: readonly PlaceCandidate[]): PlaceBucket[] {
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
    if (matchingBucket) matchingBucket.records.push(candidate.record);
    else standaloneCandidates.push(candidate);
  }
  return [...buckets, ...groupStandaloneCandidates(standaloneCandidates)]
    .map((bucket) => ({ ...bucket, records: [...bucket.records].sort(compareRecords) }))
    .sort((left, right) => left.derivedPlaceKey.localeCompare(right.derivedPlaceKey));
}

export function buildPlaceBucketsForRecords(records: readonly ActionDataContract[], asOfMs: number, options: ResolveCurrentPlaceStatesOptions): PlaceBucket[] {
  const visibleRecords = records.filter((record) => {
    const timestamp = resolveRecordDate(record);
    return timestamp !== null && timestamp <= asOfMs;
  });
  const histories = deriveLocalRepollutionHistories(
    visibleRecords.filter((record) => record.type === "action"),
    {
      sourceCompleteness: options.sourceCompleteness,
      pollutionScoreReferences: options.pollutionScoreReferences,
      historicalScoreResolver: options.historicalScoreResolver,
    },
  ).places;
  const candidates = visibleRecords
    .filter((record) => record.type !== "action")
    .map(toPlaceCandidate)
    .flatMap((candidate) => (candidate ? [candidate] : []));
  return buildPlaceBuckets(histories, candidates);
}

export function resolveLaterRecords(bucket: PlaceBucket, asOfMs: number, latestAction: DerivedPlaceObservation | null): ActionDataContract[] {
  const actionDateMs = latestAction?.observedAtMs ?? null;
  return bucket.records
    .filter((record) => record.type !== "action")
    .filter((record) => {
      const timestamp = resolveRecordDate(record);
      return timestamp !== null && timestamp <= asOfMs && (actionDateMs === null || timestamp > actionDateMs);
    })
    .sort(compareRecords);
}
