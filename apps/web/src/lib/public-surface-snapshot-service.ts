import {
  getPublicSurfaceSnapshotDate,
  isPublicSurfaceSnapshotFresh,
  readLatestPublicSurfaceSnapshot,
  upsertPublicSurfaceSnapshot,
  type PublicSurfaceSnapshotRecord,
} from "@/lib/public-surface-snapshots";

const inFlightRefreshes = new Map<
  string,
  Promise<PublicSurfaceSnapshotRecord<unknown>>
>();

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

  const refreshKey = `${params.snapshotKey}:${params.version}`;
  const currentRefresh = inFlightRefreshes.get(refreshKey) as
    | Promise<PublicSurfaceSnapshotRecord<TPayload>>
    | undefined;

  try {
    if (currentRefresh) {
      return await currentRefresh;
    }

    const refresh = (async () => {
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
    })();
    inFlightRefreshes.set(
      refreshKey,
      refresh as Promise<PublicSurfaceSnapshotRecord<unknown>>,
    );
    try {
      return await refresh;
    } finally {
      if (inFlightRefreshes.get(refreshKey) === refresh) {
        inFlightRefreshes.delete(refreshKey);
      }
    }
  } catch (error) {
    if (existing && existing.version === params.version) {
      return existing;
    }
    throw error;
  }
}
