import {
  fetchActionPollutionScoreReferences,
} from "./pollution-score-references";
import {
  DEFAULT_POLLUTION_SCORE_REFERENCES,
  type PollutionScoreReferences,
} from "./pollution-score";
import {
  getPublicSurfaceSnapshotDate,
  readLatestPublicSurfaceSnapshot,
  upsertPublicSurfaceSnapshot,
  type PublicSurfaceSnapshotRecord,
} from "@/lib/public-surface-snapshots";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getUtcWeekStart } from "@/lib/periodic/periodic-job-calendar";

export const MAP_POLLUTION_REFERENCES_SNAPSHOT_KEY = "map-pollution-score-references";
export const MAP_POLLUTION_REFERENCES_VERSION = "map-pollution-score-references-2026.09-v1";
export const MAP_POLLUTION_REFERENCES_SCHEDULE = "0 3 * * 1";

export type PollutionScoreReferenceSnapshotPayload = {
  references: PollutionScoreReferences;
  source: "action_pollution_score_references";
  weekStart: string;
};

export type PollutionScoreReferenceResolution = {
  references: PollutionScoreReferences;
  source: "weekly_snapshot" | "rpc_fallback";
  snapshotDate: string | null;
  generatedAt: string | null;
  warning: string | null;
};

function isValidReferences(value: unknown): value is PollutionScoreReferences {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PollutionScoreReferences>;
  return (
    Number.isFinite(candidate.wastePerVolunteer) &&
    Number(candidate.wastePerVolunteer) > 0 &&
    Number.isFinite(candidate.buttsPerVolunteer) &&
    Number(candidate.buttsPerVolunteer) > 0
  );
}

function isValidPayload(value: unknown): value is PollutionScoreReferenceSnapshotPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Partial<PollutionScoreReferenceSnapshotPayload>;
  return isValidReferences(payload.references) && payload.source === "action_pollution_score_references";
}

export function buildPollutionScoreReferenceSnapshot(params: {
  now: Date;
  references: PollutionScoreReferences;
}): PublicSurfaceSnapshotRecord<PollutionScoreReferenceSnapshotPayload> {
  const weekStart = getUtcWeekStart(params.now);
  const snapshotDate = getPublicSurfaceSnapshotDate(weekStart);
  return {
    id: `${MAP_POLLUTION_REFERENCES_SNAPSHOT_KEY}:${snapshotDate}`,
    snapshotKey: MAP_POLLUTION_REFERENCES_SNAPSHOT_KEY,
    snapshotDate,
    generatedAt: params.now.toISOString(),
    version: MAP_POLLUTION_REFERENCES_VERSION,
    title: "Référence hebdomadaire du score pollution",
    payload: {
      references: params.references,
      source: "action_pollution_score_references",
      weekStart,
    },
    meta: {
      job: "MAP_POLLUTION_REFERENCES",
      cadence: "weekly",
      formula: "action_pollution_score_references()",
    },
  };
}

export async function runPollutionScoreReferencesJob(params: {
  now?: Date;
  force?: boolean;
  loadReferences?: () => Promise<PollutionScoreReferences>;
  readSnapshot?: () => Promise<PublicSurfaceSnapshotRecord<PollutionScoreReferenceSnapshotPayload> | null>;
  writeSnapshot?: (
    snapshot: Omit<PublicSurfaceSnapshotRecord<PollutionScoreReferenceSnapshotPayload>, "id">,
  ) => Promise<void>;
} = {}): Promise<{
  status: "captured" | "reused";
  snapshot: PublicSurfaceSnapshotRecord<PollutionScoreReferenceSnapshotPayload>;
}> {
  const now = params.now ?? new Date();
  const weekStart = getUtcWeekStart(now);
  const readSnapshot =
    params.readSnapshot ?? (() => readLatestPublicSurfaceSnapshot<PollutionScoreReferenceSnapshotPayload>(MAP_POLLUTION_REFERENCES_SNAPSHOT_KEY));
  const existing = await readSnapshot();

  if (
    !params.force &&
    existing?.version === MAP_POLLUTION_REFERENCES_VERSION &&
    existing.snapshotDate === weekStart &&
    isValidPayload(existing.payload)
  ) {
    return { status: "reused", snapshot: existing };
  }

  const loadReferences = params.loadReferences ?? (() =>
    fetchActionPollutionScoreReferences(getSupabaseServerClient()));
  const references = await loadReferences();
  const snapshot = buildPollutionScoreReferenceSnapshot({ now, references });
  const writeSnapshot =
    params.writeSnapshot ?? ((value) => upsertPublicSurfaceSnapshot(value));
  const persistedSnapshot = {
    snapshotKey: snapshot.snapshotKey,
    snapshotDate: snapshot.snapshotDate,
    generatedAt: snapshot.generatedAt,
    version: snapshot.version,
    title: snapshot.title,
    payload: snapshot.payload,
    meta: snapshot.meta,
  };
  await writeSnapshot(persistedSnapshot);
  return { status: "captured", snapshot };
}

export async function loadPollutionScoreReferencesForMap(params: {
  readSnapshot?: () => Promise<PublicSurfaceSnapshotRecord<PollutionScoreReferenceSnapshotPayload> | null>;
  loadFallback?: () => Promise<PollutionScoreReferences>;
} = {}): Promise<PollutionScoreReferenceResolution> {
  const readSnapshot =
    params.readSnapshot ?? (() => readLatestPublicSurfaceSnapshot<PollutionScoreReferenceSnapshotPayload>(MAP_POLLUTION_REFERENCES_SNAPSHOT_KEY));
  const snapshot = await readSnapshot();

  if (
    snapshot?.version === MAP_POLLUTION_REFERENCES_VERSION &&
    isValidPayload(snapshot.payload)
  ) {
    return {
      references: snapshot.payload.references,
      source: "weekly_snapshot",
      snapshotDate: snapshot.snapshotDate,
      generatedAt: snapshot.generatedAt,
      warning: null,
    };
  }

  const loadFallback = params.loadFallback ?? (() =>
    fetchActionPollutionScoreReferences(getSupabaseServerClient()));
  const references = await loadFallback();
  return {
    references: isValidReferences(references) ? references : DEFAULT_POLLUTION_SCORE_REFERENCES,
    source: "rpc_fallback",
    snapshotDate: null,
    generatedAt: null,
    warning: "Référence hebdomadaire indisponible : fallback RPC utilisé.",
  };
}
