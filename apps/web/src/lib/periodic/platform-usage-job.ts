import {
  captureEnvironmentalImpactDashboard,
  type EnvironmentalImpactCaptureResult,
} from "@/lib/environmental-impact-estimator/dashboard-capture";
import {
  captureStorageUsageReport,
  type StorageUsageReport,
} from "@/lib/supabase/storage-usage-service";
import {
  getPublicSurfaceSnapshotDate,
  readLatestPublicSurfaceSnapshot,
  upsertPublicSurfaceSnapshot,
  type PublicSurfaceSnapshotRecord,
} from "@/lib/public-surface-snapshots";
import { getUtcWeekStart } from "./periodic-job-calendar";

export const PLATFORM_USAGE_SNAPSHOT_KEY = "platform-usage-weekly";
export const PLATFORM_USAGE_JOB_VERSION = "platform-usage-2026.09-v1";
export const PLATFORM_USAGE_SCHEDULE = "0 3 * * 1";

export type PlatformUsageSnapshotPayload = {
  capturedAt: string;
  weekStart: string;
  storageUsage: StorageUsageReport;
  environmentalImpact: EnvironmentalImpactCaptureResult;
};

export type PlatformUsageJobResult = {
  status: "captured" | "reused";
  snapshot: PublicSurfaceSnapshotRecord<PlatformUsageSnapshotPayload>;
};

function buildSnapshot(params: {
  now: Date;
  payload: PlatformUsageSnapshotPayload;
}): PublicSurfaceSnapshotRecord<PlatformUsageSnapshotPayload> {
  const snapshotDate = getPublicSurfaceSnapshotDate(params.payload.weekStart);
  return {
    id: `${PLATFORM_USAGE_SNAPSHOT_KEY}:${snapshotDate}`,
    snapshotKey: PLATFORM_USAGE_SNAPSHOT_KEY,
    snapshotDate,
    generatedAt: params.now.toISOString(),
    version: PLATFORM_USAGE_JOB_VERSION,
    title: "Usage plateforme hebdomadaire",
    payload: params.payload,
    meta: {
      job: "PLATFORM_USAGE",
      cadence: "weekly",
      source: "storage-usage-and-environmental-impact-captures",
    },
  };
}

export async function runPlatformUsageJob(params: {
  now?: Date;
  force?: boolean;
  captureStorage?: () => Promise<StorageUsageReport>;
  captureEnvironmentalImpact?: () => Promise<EnvironmentalImpactCaptureResult>;
  readSnapshot?: () => Promise<PublicSurfaceSnapshotRecord<PlatformUsageSnapshotPayload> | null>;
  writeSnapshot?: (
    snapshot: Omit<PublicSurfaceSnapshotRecord<PlatformUsageSnapshotPayload>, "id">,
  ) => Promise<void>;
} = {}): Promise<PlatformUsageJobResult> {
  const now = params.now ?? new Date();
  const weekStart = getUtcWeekStart(now);
  const readSnapshot =
    params.readSnapshot ?? (() => readLatestPublicSurfaceSnapshot<PlatformUsageSnapshotPayload>(PLATFORM_USAGE_SNAPSHOT_KEY));
  const existing = await readSnapshot();

  if (
    !params.force &&
    existing?.version === PLATFORM_USAGE_JOB_VERSION &&
    existing.snapshotDate === weekStart
  ) {
    return { status: "reused", snapshot: existing };
  }

  const storageUsage = await (params.captureStorage ?? captureStorageUsageReport)();
  const environmentalImpact = await (
    params.captureEnvironmentalImpact ?? (() =>
      captureEnvironmentalImpactDashboard({ userId: null, historyLimit: 12 }))
  )();
  const snapshot = buildSnapshot({
    now,
    payload: {
      capturedAt: now.toISOString(),
      weekStart,
      storageUsage,
      environmentalImpact,
    },
  });
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
