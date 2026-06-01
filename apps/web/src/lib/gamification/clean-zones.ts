export type CleanZoneSpotRow = {
  id: string;
  status: "validated" | "cleaned" | string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  validated_at?: string | null;
  cleaned_at?: string | null;
};

export type CleanZoneSource = {
  key: string;
  sourceTable: "trash_spotter_spots" | "spots";
  sourceId: string;
};

type CleanZoneSourceBucket = {
  prefix: "clean" | "spot";
  rows: CleanZoneSpotRow[];
};

function hasExpiredCooldown(row: CleanZoneSpotRow, cooldownCutoffIso: string): boolean {
  return Boolean(
    (row.validated_at && row.validated_at <= cooldownCutoffIso) ||
      (row.cleaned_at && row.cleaned_at <= cooldownCutoffIso),
  );
}

function isEligibleCleanZoneRow(row: CleanZoneSpotRow, cooldownCutoffIso: string): boolean {
  return (
    (row.status === "validated" || row.status === "cleaned") &&
    row.latitude !== null &&
    row.longitude !== null &&
    row.notes !== null &&
    hasExpiredCooldown(row, cooldownCutoffIso)
  );
}

function sourceForCleanZone(prefix: CleanZoneSourceBucket["prefix"], id: string): CleanZoneSource {
  return {
    key: `${prefix}:${id}`,
    sourceTable: prefix === "clean" ? "trash_spotter_spots" : "spots",
    sourceId: `${prefix}-id:${id}`,
  };
}

function collectEligibleSourcesFromBucket(
  bucket: CleanZoneSourceBucket,
  cooldownCutoffIso: string,
  sources: Map<string, CleanZoneSource>,
): void {
  for (const row of bucket.rows) {
    if (!isEligibleCleanZoneRow(row, cooldownCutoffIso)) {
      continue;
    }

    const source = sourceForCleanZone(bucket.prefix, row.id);
    if (!sources.has(source.key)) {
      sources.set(source.key, source);
    }
  }
}

export function collectEligibleCleanZoneSources({
  cleanPlaces = [],
  otherSpots = [],
  now = new Date(),
}: {
  cleanPlaces?: CleanZoneSpotRow[];
  otherSpots?: CleanZoneSpotRow[];
  now?: Date;
}): CleanZoneSource[] {
  const cooldownCutoffIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sources = new Map<string, CleanZoneSource>();

  collectEligibleSourcesFromBucket({ prefix: "clean", rows: cleanPlaces }, cooldownCutoffIso, sources);
  collectEligibleSourcesFromBucket({ prefix: "spot", rows: otherSpots }, cooldownCutoffIso, sources);

  return [...sources.values()];
}

export function countEligibleCleanZones(input: {
  cleanPlaces?: CleanZoneSpotRow[];
  otherSpots?: CleanZoneSpotRow[];
  now?: Date;
}): number {
  return collectEligibleCleanZoneSources(input).length;
}
