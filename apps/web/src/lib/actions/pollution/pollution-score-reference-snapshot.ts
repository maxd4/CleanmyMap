import { fetchActionPollutionScoreReferences } from "./pollution-score-references";
import type {
  DepartmentPollutionScoreReference,
  PollutionScoreReference,
  PollutionScoreReferences,
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
export const MAP_POLLUTION_REFERENCES_VERSION = "map-pollution-score-references-2026.09-v6-pre77-approved-visible-population";

export type PollutionScoreReferenceSnapshotPayload = {
  references: {
    global: PollutionScoreReference;
    departments: Readonly<Record<string, DepartmentPollutionScoreReference>>;
  };
  source: "action_pollution_score_references_v2";
  weekStart: string;
};

export type PollutionScoreReferenceResolution = {
  references: PollutionScoreReferences | null;
  source: "weekly_snapshot" | "rpc_fallback";
  snapshotDate: string | null;
  generatedAt: string | null;
  warning: string | null;
};

function isValidReference(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && Number.isFinite(value) && value > 0;
}

function isValidGlobalReference(value: unknown): value is PollutionScoreReference {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PollutionScoreReference>;
  const wasteSourceCount = Number(candidate.wasteSourceCount);
  const buttsSourceCount = Number(candidate.buttsSourceCount);
  const hasWasteReference = isValidReference(candidate.wastePerVolunteer);
  const hasButtsReference = isValidReference(candidate.buttsPerVolunteer);

  return (
    (candidate.wastePerVolunteer === null || hasWasteReference) &&
    (candidate.buttsPerVolunteer === null || hasButtsReference) &&
    Number.isInteger(wasteSourceCount) &&
    wasteSourceCount >= 0 &&
    Number.isInteger(buttsSourceCount) &&
    buttsSourceCount >= 0 &&
    (hasWasteReference || hasButtsReference)
  );
}

function isValidDepartmentReference(value: unknown): value is DepartmentPollutionScoreReference {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<DepartmentPollutionScoreReference>;
  const eligibleActionCount = Number(candidate.eligibleActionCount);
  const wasteSourceCount = Number(candidate.wasteSourceCount);
  const buttsSourceCount = Number(candidate.buttsSourceCount);
  const hasWasteReference = isValidReference(candidate.wastePerVolunteer);
  const hasButtsReference = isValidReference(candidate.buttsPerVolunteer);

  return (
    (candidate.departmentName === null || typeof candidate.departmentName === "string") &&
    (candidate.wastePerVolunteer === null || hasWasteReference) &&
    (candidate.buttsPerVolunteer === null || hasButtsReference) &&
    Number.isInteger(eligibleActionCount) &&
    eligibleActionCount >= 0 &&
    Number.isInteger(wasteSourceCount) &&
    wasteSourceCount >= 0 &&
    Number.isInteger(buttsSourceCount) &&
    buttsSourceCount >= 0
  );
}

function isValidPayload(value: unknown): value is PollutionScoreReferenceSnapshotPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Partial<PollutionScoreReferenceSnapshotPayload>;
  const departments = payload.references?.departments;
  if (!departments || Array.isArray(departments)) {
    return false;
  }
  return (
    payload.source === "action_pollution_score_references_v2" &&
    typeof payload.weekStart === "string" &&
    Boolean(payload.references) &&
    isValidGlobalReference(payload.references?.global) &&
    Object.entries(departments).every(
      ([code, reference]) =>
        code.trim().length > 0 &&
        code === code.trim().toUpperCase() &&
        isValidDepartmentReference(reference),
    )
  );
}

export function buildPollutionScoreReferenceSnapshot(params: {
  now: Date;
  references: PollutionScoreReferences;
}): PublicSurfaceSnapshotRecord<PollutionScoreReferenceSnapshotPayload> {
  if (!isValidGlobalReference(params.references.global)) {
    throw new Error("Une référence globale V2 valide est nécessaire pour le snapshot.");
  }
  const departments = params.references.departmentReferences ?? {};
  if (
    !Object.entries(departments).every(
      ([code, reference]) =>
        code.trim().length > 0 &&
        code === code.trim().toUpperCase() &&
        isValidDepartmentReference(reference),
    )
  ) {
    throw new Error("Les références départementales V2 sont invalides.");
  }

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
      references: { global: params.references.global, departments },
      source: "action_pollution_score_references_v2",
      weekStart,
    },
    meta: {
      job: "MAP_POLLUTION_REFERENCES",
      cadence: "weekly",
      formula: "action_pollution_score_references_v2()",
      population: "status=approved AND moderation_visibility=visible",
    },
  };
}

export async function runPollutionScoreReferencesJob(params: {
  now?: Date;
  force?: boolean;
  loadReferences?: () => Promise<PollutionScoreReferences | null>;
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
  if (!references) {
    throw new Error("Aucune référence globale V2 valide à capturer.");
  }
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
  loadFallback?: () => Promise<PollutionScoreReferences | null>;
} = {}): Promise<PollutionScoreReferenceResolution> {
  const readSnapshot =
    params.readSnapshot ?? (() => readLatestPublicSurfaceSnapshot<PollutionScoreReferenceSnapshotPayload>(MAP_POLLUTION_REFERENCES_SNAPSHOT_KEY));
  const snapshot = await readSnapshot();

  if (
    snapshot?.version === MAP_POLLUTION_REFERENCES_VERSION &&
    isValidPayload(snapshot.payload)
  ) {
    return {
      references: {
        global: snapshot.payload.references.global,
        departmentReferences: snapshot.payload.references.departments,
      },
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
    references: references?.global && isValidGlobalReference(references.global)
      ? references
      : null,
    source: "rpc_fallback",
    snapshotDate: null,
    generatedAt: null,
    warning: references
      ? "Référence hebdomadaire indisponible : fallback RPC V2 utilisé."
      : "Aucune référence V2 valide : score pollution indisponible.",
  };
}
