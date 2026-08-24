export type CleanZoneSourceTable = "trash_spotter_spots" | "spots";

export const CLEAN_ZONE_PROGRESSION_SOURCE_TABLE = "clean_zones" as const;

type CleanZoneBaseRow = {
  id: string;
  status: "validated" | "cleaned" | string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
};

export type CleanZoneCanonicalRow = CleanZoneBaseRow & {
  validated_at?: string | null;
  cleaned_at?: string | null;
};

export type CleanZoneLegacyRow = CleanZoneBaseRow;

export type CleanZoneProgressionEvent = {
  sourceTable: string;
  sourceId: string;
};

export type CleanZoneProvenance = {
  sourceTable: CleanZoneSourceTable;
  sourceId: string;
};

export type CleanZoneSource = {
  key: string;
  canonicalPlaceKey: string;
  sourceTable: CleanZoneSourceTable;
  sourceId: string;
  provenance: CleanZoneProvenance[];
  progressionSourceTable: typeof CLEAN_ZONE_PROGRESSION_SOURCE_TABLE;
  progressionSourceId: string;
  progressionEventRecorded: boolean;
};

type CleanZoneCandidate = {
  sourceTable: CleanZoneSourceTable;
  row: CleanZoneCanonicalRow | CleanZoneLegacyRow;
  eligible: boolean;
};

const PLACE_COORDINATE_PRECISION = 5;

function normalizeCoordinate(value: number): string | null {
  return Number.isFinite(value) ? value.toFixed(PLACE_COORDINATE_PRECISION) : null;
}

function canonicalPlaceKey(row: CleanZoneBaseRow): string | null {
  const latitude = row.latitude === null ? null : normalizeCoordinate(row.latitude);
  const longitude = row.longitude === null ? null : normalizeCoordinate(row.longitude);
  if (latitude === null || longitude === null) {
    return null;
  }

  return `coordinates:${latitude}:${longitude}`;
}

function hasExpiredCanonicalCooldown(
  row: CleanZoneCanonicalRow,
  cooldownCutoffIso: string,
): boolean {
  return Boolean(
    (row.validated_at && row.validated_at <= cooldownCutoffIso) ||
      (row.cleaned_at && row.cleaned_at <= cooldownCutoffIso),
  );
}

function hasRequiredCleanZoneFields(row: CleanZoneBaseRow): boolean {
  return (
    (row.status === "validated" || row.status === "cleaned") &&
    row.latitude !== null &&
    row.longitude !== null &&
    row.notes !== null
  );
}

function sourcePriority(sourceTable: CleanZoneSourceTable): number {
  return sourceTable === "trash_spotter_spots" ? 0 : 1;
}

function compareCandidates(left: CleanZoneCandidate, right: CleanZoneCandidate): number {
  const sourceOrder = sourcePriority(left.sourceTable) - sourcePriority(right.sourceTable);
  if (sourceOrder !== 0) {
    return sourceOrder;
  }

  return left.row.id.localeCompare(right.row.id);
}

function legacyProgressionSourceIds(id: string): string[] {
  return [id, `spot-id:${id}`];
}

function canonicalProgressionSourceIds(id: string): string[] {
  return [id, `clean-id:${id}`];
}

function hasRecordedEventForProvenance(
  provenance: CleanZoneProvenance,
  events: ReadonlySet<string>,
): boolean {
  const sourceIds =
    provenance.sourceTable === "trash_spotter_spots"
      ? canonicalProgressionSourceIds(provenance.sourceId)
      : legacyProgressionSourceIds(provenance.sourceId);

  return sourceIds.some((sourceId) => events.has(`${provenance.sourceTable}:${sourceId}`));
}

function toProvenance(candidates: CleanZoneCandidate[]): CleanZoneProvenance[] {
  return candidates
    .sort(compareCandidates)
    .map((candidate) => ({
      sourceTable: candidate.sourceTable,
      sourceId: candidate.row.id,
    }));
}

function buildSource(
  placeKey: string,
  candidates: CleanZoneCandidate[],
  progressionEvents: ReadonlySet<string>,
): CleanZoneSource {
  const eligibleCandidates = candidates.filter((candidate) => candidate.eligible).sort(compareCandidates);
  const primary = eligibleCandidates[0];
  if (!primary) {
    throw new Error("Cannot build a Clean Zone source without an eligible candidate");
  }

  const provenance = toProvenance(candidates);
  const progressionEventRecorded =
    progressionEvents.has(`${CLEAN_ZONE_PROGRESSION_SOURCE_TABLE}:clean-zone:${placeKey}`) ||
    provenance.some((entry) => hasRecordedEventForProvenance(entry, progressionEvents));

  return {
    key: `clean-zone:${placeKey}`,
    canonicalPlaceKey: placeKey,
    sourceTable: primary.sourceTable,
    sourceId: primary.row.id,
    provenance,
    progressionSourceTable: CLEAN_ZONE_PROGRESSION_SOURCE_TABLE,
    progressionSourceId: `clean-zone:${placeKey}`,
    progressionEventRecorded,
  };
}

export function collectEligibleCleanZoneSources({
  cleanPlaces = [],
  otherSpots = [],
  progressionEvents = [],
  now = new Date(),
}: {
  cleanPlaces?: CleanZoneCanonicalRow[];
  otherSpots?: CleanZoneLegacyRow[];
  progressionEvents?: CleanZoneProgressionEvent[];
  now?: Date;
}): CleanZoneSource[] {
  const cooldownCutoffIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const recordedEvents = new Set(
    progressionEvents.map((event) => `${event.sourceTable}:${event.sourceId}`),
  );
  const legacyRecordedIds = new Set(
    progressionEvents
      .filter((event) => event.sourceTable === "spots")
      .flatMap((event) => legacyProgressionSourceIds(event.sourceId)),
  );
  const groups = new Map<string, CleanZoneCandidate[]>();

  for (const row of cleanPlaces) {
    if (!hasRequiredCleanZoneFields(row)) {
      continue;
    }

    const placeKey = canonicalPlaceKey(row);
    if (!placeKey) {
      continue;
    }

    const group = groups.get(placeKey) ?? [];
    group.push({
      sourceTable: "trash_spotter_spots",
      row,
      eligible: hasExpiredCanonicalCooldown(row, cooldownCutoffIso),
    });
    groups.set(placeKey, group);
  }

  for (const row of otherSpots) {
    if (!hasRequiredCleanZoneFields(row)) {
      continue;
    }

    const placeKey = canonicalPlaceKey(row);
    if (!placeKey) {
      continue;
    }

    const group = groups.get(placeKey) ?? [];
    group.push({
      sourceTable: "spots",
      row,
      // public.spots has no validation timestamp. A legacy row is retained
      // only when an XP event already proves that it was previously awarded.
      eligible: legacyRecordedIds.has(row.id) || legacyRecordedIds.has(`spot-id:${row.id}`),
    });
    groups.set(placeKey, group);
  }

  return [...groups.entries()]
    .filter(([, candidates]) => candidates.some((candidate) => candidate.eligible))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([placeKey, candidates]) => buildSource(placeKey, candidates, recordedEvents));
}

export function countEligibleCleanZones(input: {
  cleanPlaces?: CleanZoneCanonicalRow[];
  otherSpots?: CleanZoneLegacyRow[];
  progressionEvents?: CleanZoneProgressionEvent[];
  now?: Date;
}): number {
  return collectEligibleCleanZoneSources(input).length;
}
