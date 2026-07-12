import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  allowLocalFileStoreFallback,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PublicSurfaceSnapshotRecord<TPayload = unknown> = {
  id: string;
  snapshotKey: string;
  snapshotDate: string;
  generatedAt: string;
  version: string;
  title: string;
  payload: TPayload;
  meta: Record<string, unknown>;
};

type PublicSurfaceSnapshotRow = {
  id: number | string;
  snapshot_key: string;
  snapshot_date: string;
  generated_at: string;
  version: string;
  title: string;
  payload: unknown;
  meta: unknown;
};

type SnapshotStore = {
  updatedAt: string;
  records: PublicSurfaceSnapshotRecord[];
};

const FILE_PATH = join(process.cwd(), "data", "local-db", "public_surface_snapshots.json");

function emptyStore(): SnapshotStore {
  return { updatedAt: new Date().toISOString(), records: [] };
}

async function readStore(): Promise<SnapshotStore> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as SnapshotStore;
    if (!parsed || !Array.isArray(parsed.records)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: SnapshotStore): Promise<void> {
  await mkdir(dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function getPublicSurfaceSnapshotDate(generatedAt: string): string {
  const parsed = new Date(generatedAt);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeSnapshotRow<TPayload>(
  row: PublicSurfaceSnapshotRow,
): PublicSurfaceSnapshotRecord<TPayload> {
  return {
    id: String(row.id),
    snapshotKey: row.snapshot_key,
    snapshotDate: row.snapshot_date,
    generatedAt: row.generated_at,
    version: row.version,
    title: row.title,
    payload: row.payload as TPayload,
    meta: normalizeMeta(row.meta),
  };
}

export function isPublicSurfaceSnapshotFresh(
  snapshot: Pick<PublicSurfaceSnapshotRecord, "generatedAt"> | null | undefined,
  ttlMinutes: number,
  now = new Date(),
): boolean {
  if (!snapshot) {
    return false;
  }

  const generatedAtMs = new Date(snapshot.generatedAt).getTime();
  if (!Number.isFinite(generatedAtMs)) {
    return false;
  }

  const ageMinutes = (now.getTime() - generatedAtMs) / (60 * 1000);
  return ageMinutes >= 0 && ageMinutes <= ttlMinutes;
}

export async function upsertPublicSurfaceSnapshot<TPayload>(
  snapshot: Omit<PublicSurfaceSnapshotRecord<TPayload>, "id">,
): Promise<void> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase.from("public_surface_snapshots").upsert(
        {
          snapshot_key: snapshot.snapshotKey,
          snapshot_date: snapshot.snapshotDate,
          generated_at: snapshot.generatedAt,
          version: snapshot.version,
          title: snapshot.title,
          payload: snapshot.payload,
          meta: snapshot.meta,
        },
        { onConflict: "snapshot_key,snapshot_date" },
      );

      if (!result.error) {
        return;
      }

      if (!allowLocalFileStoreFallback()) {
        return;
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return;
      }
    }
  }

  const store = await readStore();
  const nextRecords = store.records.filter(
    (entry) =>
      !(
        entry.snapshotKey === snapshot.snapshotKey &&
        entry.snapshotDate === snapshot.snapshotDate
      ),
  );

  nextRecords.unshift({
    id: `${snapshot.snapshotKey}:${snapshot.snapshotDate}`,
    ...snapshot,
  });

  await writeStore({
    updatedAt: new Date().toISOString(),
    records: nextRecords.slice(0, 365),
  });
}

export async function readLatestPublicSurfaceSnapshot<TPayload>(
  snapshotKey: string,
): Promise<PublicSurfaceSnapshotRecord<TPayload> | null> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase
        .from("public_surface_snapshots")
        .select("id, snapshot_key, snapshot_date, generated_at, version, title, payload, meta")
        .eq("snapshot_key", snapshotKey)
        .order("snapshot_date", { ascending: false })
        .order("generated_at", { ascending: false })
        .limit(1);

      if (!result.error) {
        const row = result.data?.[0] ?? null;
        return row ? normalizeSnapshotRow<TPayload>(row as PublicSurfaceSnapshotRow) : null;
      }

      if (!allowLocalFileStoreFallback()) {
        return null;
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return null;
      }
    }
  }

  const store = await readStore();
  const snapshot = store.records
    .filter((entry) => entry.snapshotKey === snapshotKey)
    .sort((left, right) => {
      const dateComparison = right.snapshotDate.localeCompare(left.snapshotDate);
      if (dateComparison !== 0) {
        return dateComparison;
      }
      return right.generatedAt.localeCompare(left.generatedAt);
    })[0];

  return (snapshot as PublicSurfaceSnapshotRecord<TPayload> | undefined) ?? null;
}

export async function listPublicSurfaceSnapshots<TPayload>(
  limit = 12,
): Promise<PublicSurfaceSnapshotRecord<TPayload>[]> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase
        .from("public_surface_snapshots")
        .select("id, snapshot_key, snapshot_date, generated_at, version, title, payload, meta")
        .order("generated_at", { ascending: false })
        .limit(limit);

      if (!result.error) {
        return (result.data ?? []).map((row) =>
          normalizeSnapshotRow<TPayload>(row as PublicSurfaceSnapshotRow),
        );
      }

      if (!allowLocalFileStoreFallback()) {
        return [];
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return [];
      }
    }
  }

  const store = await readStore();
  return store.records
    .slice()
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
    .slice(0, limit) as PublicSurfaceSnapshotRecord<TPayload>[];
}

function snapshotKeyMatchesRoute(snapshotKey: string, routes: readonly string[]): boolean {
  try {
    const parsed = JSON.parse(snapshotKey) as { route?: unknown };
    return typeof parsed.route === "string" && routes.includes(parsed.route);
  } catch {
    return routes.some((route) => snapshotKey.includes(route));
  }
}

export async function invalidatePublicSurfaceSnapshotsByRoute(
  routes: readonly string[],
): Promise<void> {
  const normalizedRoutes = routes
    .map((route) => route.trim())
    .filter((route) => route.length > 0);
  if (normalizedRoutes.length === 0) {
    return;
  }

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      for (const route of normalizedRoutes) {
        const result = await supabase
          .from("public_surface_snapshots")
          .delete()
          .like("snapshot_key", `%"route":"${route}"%`);

        if (result.error && !allowLocalFileStoreFallback()) {
          throw new Error(result.error.message);
        }
      }
      if (!allowLocalFileStoreFallback()) {
        return;
      }
    } catch (error) {
      if (!allowLocalFileStoreFallback()) {
        throw error;
      }
    }
  }

  const store = await readStore();
  const records = store.records.filter(
    (entry) => !snapshotKeyMatchesRoute(entry.snapshotKey, normalizedRoutes),
  );
  if (records.length === store.records.length) {
    return;
  }
  await writeStore({ updatedAt: new Date().toISOString(), records });
}
