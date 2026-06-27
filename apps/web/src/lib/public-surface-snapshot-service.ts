import {
  getPublicSurfaceSnapshotDate,
  isPublicSurfaceSnapshotFresh,
  readLatestPublicSurfaceSnapshot,
  upsertPublicSurfaceSnapshot,
  type PublicSurfaceSnapshotRecord,
} from "@/lib/public-surface-snapshots";

export type PublicSurfaceSnapshotRefreshParams<TPayload> = {
  snapshotKey: string;
  title: string;
  version: string;
  ttlMinutes: number;
  buildPayload: () => Promise<TPayload>;
  meta?: Record<string, unknown>;
  now?: Date;
};

export async function loadOrRefreshPublicSurfaceSnapshot<TPayload>(
  params: PublicSurfaceSnapshotRefreshParams<TPayload>,
): Promise<PublicSurfaceSnapshotRecord<TPayload>> {
  const now = params.now ?? new Date();
  const existing = await readLatestPublicSurfaceSnapshot<TPayload>(params.snapshotKey);

  if (
    existing &&
    existing.version === params.version &&
    isPublicSurfaceSnapshotFresh(existing, params.ttlMinutes, now)
  ) {
    return existing as PublicSurfaceSnapshotRecord<TPayload>;
  }

  try {
    const payload = await params.buildPayload();
    const generatedAt = now.toISOString();
    const snapshot: Omit<PublicSurfaceSnapshotRecord<TPayload>, "id"> = {
      snapshotKey: params.snapshotKey,
      snapshotDate: getPublicSurfaceSnapshotDate(generatedAt),
      generatedAt,
      version: params.version,
      title: params.title,
      payload,
      meta: params.meta ?? {},
    };

    await upsertPublicSurfaceSnapshot(snapshot);
    return {
      id: `${snapshot.snapshotKey}:${snapshot.snapshotDate}`,
      ...snapshot,
    };
  } catch (error) {
    if (existing) {
      return existing;
    }
    throw error;
  }
}
