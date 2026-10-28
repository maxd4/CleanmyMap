import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn(() => true));
const allowLocalFileStoreFallbackMock = vi.hoisted(() => vi.fn(() => false));
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const readLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const writeLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const revalidateUnifiedActionContractsCacheMock = vi.hoisted(() => vi.fn());
const beforeUpsertMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  allowLocalFileStoreFallback: allowLocalFileStoreFallbackMock,
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/persistence/local-record-store", () => ({
  readLocalRecordStore: readLocalRecordStoreMock,
  writeLocalRecordStore: writeLocalRecordStoreMock,
}));
vi.mock("@/lib/actions/unified-source/cache-contract", () => ({
  revalidateUnifiedActionContractsCache: revalidateUnifiedActionContractsCacheMock,
}));

type FakeRow = {
  id: number;
  snapshot_key: string;
  snapshot_date: string;
  generated_at: string;
  version: string;
  title: string;
  payload: unknown;
  meta: Record<string, unknown>;
};

let fakeRow: FakeRow | null = null;
let nextFakeId = 1;
const queryEvents: string[] = [];

function createFakeQuery(kind: "read" | "update" | "upsert", value?: Record<string, unknown>, options?: Record<string, unknown>) {
  const equals = new Map<string, unknown>();
  const notEquals = new Map<string, unknown>();
  let lessThan: { column: string; value: string } | null = null;
  let likePattern: string | null = null;

  const matches = () => {
    if (!fakeRow) return false;
    for (const [column, expected] of equals) {
      if (fakeRow[column as keyof FakeRow] !== expected) return false;
    }
    for (const [column, expected] of notEquals) {
      if (fakeRow[column as keyof FakeRow] === expected) return false;
    }
    if (
      lessThan &&
      !(fakeRow[lessThan.column as keyof FakeRow] as string < lessThan.value)
    ) {
      return false;
    }
    if (likePattern) {
      const route = likePattern.match(/route":"([^"]+)/)?.[1];
      if (route && !fakeRow.snapshot_key.includes(`"route":"${route}"`)) {
        return false;
      }
    }
    return true;
  };

  const execute = () => {
    if (kind === "read") {
      return {
        data:
          matches() && fakeRow?.version !== "__public_surface_snapshot_invalidated__"
            ? [fakeRow]
            : [],
        error: null,
      };
    }

    if (kind === "update") {
      queryEvents.push("update");
      if (!matches() || !fakeRow) return { data: null, error: null };
      fakeRow = { ...fakeRow, ...(value as Partial<FakeRow>) };
      return { data: { id: fakeRow.id }, error: null };
    }

    queryEvents.push("upsert");
    beforeUpsertMock();
    if (!fakeRow) {
      fakeRow = {
        ...(value as Omit<FakeRow, "id">),
        id: nextFakeId++,
      };
      return { data: { id: fakeRow.id }, error: null };
    }

    return options?.ignoreDuplicates
      ? { data: null, error: null }
      : { data: { id: fakeRow.id }, error: null };
  };

  const query = {
    eq(column: string, expected: unknown) {
      equals.set(column, expected);
      return query;
    },
    neq(column: string, expected: unknown) {
      notEquals.set(column, expected);
      return query;
    },
    lt(column: string, expected: string) {
      lessThan = { column, value: expected };
      return query;
    },
    like(_column: string, pattern: string) {
      likePattern = pattern;
      return query;
    },
    order() {
      return query;
    },
    limit() {
      return query;
    },
    select() {
      return query;
    },
    maybeSingle() {
      return Promise.resolve(execute());
    },
    then(resolve: (result: ReturnType<typeof execute>) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(execute()).then(resolve, reject);
    },
  };

  return query;
}

const fakeSupabaseClient = {
  from(table: string) {
    if (table !== "public_surface_snapshots") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return {
      select: () => createFakeQuery("read"),
      update: (value: Record<string, unknown>) => createFakeQuery("update", value),
      upsert: (value: Record<string, unknown>, options: Record<string, unknown>) =>
        createFakeQuery("upsert", value, options),
    };
  },
};

vi.mocked(getSupabaseServerClientMock).mockReturnValue(fakeSupabaseClient as never);
import {
  getPublicSurfaceSnapshotDate,
  invalidatePublicSurfaceSnapshotsByRoute,
  isPublicSurfaceSnapshotFresh,
  readLatestPublicSurfaceSnapshot,
  requirePersistedPublicSurfaceSnapshot,
  toPersistedPublicSurfaceSnapshot,
  upsertPublicSurfaceSnapshot,
} from "./public-surface-snapshots";

beforeEach(() => {
  fakeRow = null;
  nextFakeId = 1;
  queryEvents.length = 0;
  beforeUpsertMock.mockReset();
  vi.clearAllMocks();
  canUseSupabaseServerPersistenceMock.mockReturnValue(true);
  allowLocalFileStoreFallbackMock.mockReturnValue(false);
  getSupabaseServerClientMock.mockReturnValue(fakeSupabaseClient as never);
});

describe("public surface snapshots", () => {
  it("formats the snapshot date from the generation timestamp", () => {
    expect(getPublicSurfaceSnapshotDate("2026-06-27T10:15:00.000Z")).toBe("2026-06-27");
    expect(getPublicSurfaceSnapshotDate("not-a-date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("serializes the persisted shape without carrying a local id and normalizes malformed metadata", async () => {
    const snapshot = {
      id: "local-id",
      snapshotKey: "meta-shape",
      snapshotDate: "2026-10-13",
      generatedAt: "2026-10-13T10:00:00.000Z",
      version: "v1",
      title: "Meta",
      payload: { value: 1 },
      meta: { source: "test" },
    };
    expect(toPersistedPublicSurfaceSnapshot(snapshot)).toEqual({
      snapshotKey: "meta-shape",
      snapshotDate: "2026-10-13",
      generatedAt: "2026-10-13T10:00:00.000Z",
      version: "v1",
      title: "Meta",
      payload: { value: 1 },
      meta: { source: "test" },
    });

    await upsertPublicSurfaceSnapshot(snapshot);
    fakeRow = { ...fakeRow!, meta: [] as never };
    await expect(readLatestPublicSurfaceSnapshot("meta-shape")).resolves.toMatchObject({ meta: {} });
  });

  it("detects freshness within the configured ttl", () => {
    const now = new Date("2026-06-27T10:30:00.000Z");

    expect(
      isPublicSurfaceSnapshotFresh(
        { generatedAt: "2026-06-27T10:20:00.000Z" },
        15,
        now,
      ),
    ).toBe(true);

    expect(
      isPublicSurfaceSnapshotFresh(
        { generatedAt: "2026-06-27T10:10:00.000Z" },
        15,
        now,
      ),
    ).toBe(false);
    expect(isPublicSurfaceSnapshotFresh(null, 15, now)).toBe(false);
    expect(isPublicSurfaceSnapshotFresh({ generatedAt: "invalid" }, 15, now)).toBe(false);
    expect(isPublicSurfaceSnapshotFresh({ generatedAt: "2026-06-27T10:40:00.000Z" }, 15, now)).toBe(false);
  });

  it("ignore une reconstruction plus ancienne après une écriture plus récente", async () => {
    const newer = {
      snapshotKey: "test-snapshot",
      snapshotDate: "2026-06-27",
      generatedAt: "2026-06-27T10:20:00.000Z",
      version: "v1",
      title: "Test snapshot",
      payload: { source: "newer" },
      meta: {},
    };
    const older = { ...newer, generatedAt: "2026-06-27T10:10:00.000Z", payload: { source: "older" } };

    await expect(upsertPublicSurfaceSnapshot(newer)).resolves.toBe("applied");
    await expect(upsertPublicSurfaceSnapshot(older)).resolves.toBe("ignored_older");

    expect(fakeRow?.payload).toEqual({ source: "newer" });
  });

  it.each([
    {
      name: "la plus récente arrive après l'ancienne",
      candidateGeneratedAt: "2026-06-27T10:05:00.000Z",
      competitorGeneratedAt: "2026-06-27T10:00:00.000Z",
      expectedResult: "applied",
    },
    {
      name: "la plus ancienne arrive après la récente",
      candidateGeneratedAt: "2026-06-27T10:00:00.000Z",
      competitorGeneratedAt: "2026-06-27T10:05:00.000Z",
      expectedResult: "ignored_older",
    },
  ])("résout une course d'insertion initiale quand $name", async ({
    candidateGeneratedAt,
    competitorGeneratedAt,
    expectedResult,
  }) => {
    const candidate = {
      snapshotKey: "initial-race",
      snapshotDate: "2026-06-27",
      generatedAt: candidateGeneratedAt,
      version: "v1",
      title: "Initial race",
      payload: { source: "candidate" },
      meta: {},
    };
    const competitor = {
      ...candidate,
      generatedAt: competitorGeneratedAt,
      payload: { source: "competitor" },
    };
    beforeUpsertMock.mockImplementationOnce(() => {
      fakeRow = {
        id: nextFakeId++,
        snapshot_key: competitor.snapshotKey,
        snapshot_date: competitor.snapshotDate,
        generated_at: competitor.generatedAt,
        version: competitor.version,
        title: competitor.title,
        payload: competitor.payload,
        meta: competitor.meta,
      };
    });

    await expect(upsertPublicSurfaceSnapshot(candidate)).resolves.toBe(expectedResult);

    expect(queryEvents).toEqual(["update", "upsert", "update"]);
    await expect(readLatestPublicSurfaceSnapshot(candidate.snapshotKey)).resolves.toEqual(
      expect.objectContaining({
        generatedAt: "2026-06-27T10:05:00.000Z",
        payload: { source: expectedResult === "applied" ? "candidate" : "competitor" },
      }),
    );
  });

  it("reste idempotent pour deux générations identiques", async () => {
    const snapshot = {
      snapshotKey: "idempotent",
      snapshotDate: "2026-06-27",
      generatedAt: "2026-06-27T10:05:00.000Z",
      version: "v1",
      title: "Idempotent",
      payload: { source: "same" },
      meta: {},
    };

    await expect(upsertPublicSurfaceSnapshot(snapshot)).resolves.toBe("applied");
    await expect(upsertPublicSurfaceSnapshot(snapshot)).resolves.toBe("ignored_older");

    expect(fakeRow?.payload).toEqual({ source: "same" });
    expect(queryEvents).toEqual(["update", "upsert", "update", "upsert", "update"]);
  });

  it("conserve un watermark d'invalidation entre une ancienne reconstruction et la suivante", async () => {
    const invalidationCandidate = new Date(Date.now() - 1_000).toISOString();
    const oldRebuild = {
      snapshotKey: JSON.stringify({ route: "api/actions", viewport: "global" }),
      snapshotDate: getPublicSurfaceSnapshotDate(invalidationCandidate),
      generatedAt: invalidationCandidate,
      version: "v1",
      title: "Actions publiques",
      payload: { source: "old" },
      meta: {},
    };
    const afterInvalidation = {
      ...oldRebuild,
      generatedAt: new Date(Date.now() + 1_000).toISOString(),
      payload: { source: "rebuilt" },
    };

    await upsertPublicSurfaceSnapshot(oldRebuild);
    await invalidatePublicSurfaceSnapshotsByRoute(["api/actions"]);

    await expect(upsertPublicSurfaceSnapshot(oldRebuild)).resolves.toBe("ignored_older");
    await expect(readLatestPublicSurfaceSnapshot(oldRebuild.snapshotKey)).resolves.toBeNull();
    await expect(upsertPublicSurfaceSnapshot(afterInvalidation)).resolves.toBe("applied");
    await expect(readLatestPublicSurfaceSnapshot(oldRebuild.snapshotKey)).resolves.toEqual(
      expect.objectContaining({ payload: { source: "rebuilt" } }),
    );
  });

  it("refuse explicitement une reconstruction si seule l'invalidation gagne la course", async () => {
    const candidate = {
      snapshotKey: JSON.stringify({ route: "api/actions", viewport: "global" }),
      snapshotDate: "2026-06-27",
      generatedAt: "2026-06-27T10:00:00.000Z",
      version: "v1",
      title: "Actions publiques",
      payload: { source: "old" },
      meta: {},
    };
    beforeUpsertMock.mockImplementationOnce(() => {
      fakeRow = {
        id: nextFakeId++,
        snapshot_key: candidate.snapshotKey,
        snapshot_date: candidate.snapshotDate,
        generated_at: "2026-06-27T10:30:00.000Z",
        version: "__public_surface_snapshot_invalidated__",
        title: candidate.title,
        payload: candidate.payload,
        meta: candidate.meta,
      };
    });

    await expect(upsertPublicSurfaceSnapshot(candidate)).resolves.toBe("ignored_older");
    await expect(readLatestPublicSurfaceSnapshot(candidate.snapshotKey)).resolves.toBeNull();
    await expect(
      requirePersistedPublicSurfaceSnapshot(
        candidate.snapshotKey,
        candidate.snapshotDate,
        async () => null,
      ),
    ).rejects.toMatchObject({
      name: "PublicSurfaceSnapshotWriteConflictError",
      code: "PUBLIC_SURFACE_SNAPSHOT_WRITE_CONFLICT",
    });
  });

  it("accepte uniquement le snapshot persistant du couple demandé", async () => {
    const snapshot = {
      id: "winner",
      snapshotKey: "usage",
      snapshotDate: "2026-10-13",
      generatedAt: "2026-10-13T10:00:00.000Z",
      version: "v1",
      title: "Usage",
      payload: { source: "winner" },
      meta: {},
    };

    await expect(
      requirePersistedPublicSurfaceSnapshot("usage", "2026-10-13", async () => snapshot),
    ).resolves.toBe(snapshot);
  });

  it.each([
    {
      name: "une période précédente",
      snapshotKey: "usage",
      snapshotDate: "2026-10-12",
    },
    {
      name: "une autre clé",
      snapshotKey: "impact",
      snapshotDate: "2026-10-13",
    },
  ])("rejette un snapshot relu appartenant à $name", async ({ snapshotKey, snapshotDate }) => {
    const snapshot = {
      id: "wrong-winner",
      snapshotKey,
      snapshotDate,
      generatedAt: "2026-10-13T10:00:00.000Z",
      version: "v1",
      title: "Snapshot relu",
      payload: { source: "wrong-winner" },
      meta: {},
    };

    await expect(
      requirePersistedPublicSurfaceSnapshot("usage", "2026-10-13", async () => snapshot),
    ).rejects.toMatchObject({
      name: "PublicSurfaceSnapshotWriteConflictError",
      code: "PUBLIC_SURFACE_SNAPSHOT_WRITE_CONFLICT",
    });
  });

  it("refuses persistence and reads when no storage policy is available", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    allowLocalFileStoreFallbackMock.mockReturnValue(false);
    const snapshot = {
      snapshotKey: "unavailable",
      snapshotDate: "2026-10-13",
      generatedAt: "2026-10-13T10:00:00.000Z",
      version: "v1",
      title: "Unavailable",
      payload: {},
      meta: {},
    };

    await expect(upsertPublicSurfaceSnapshot(snapshot)).rejects.toThrow(/persistence is unavailable/i);
    await expect(readLatestPublicSurfaceSnapshot(snapshot.snapshotKey)).resolves.toBeNull();
  });

  it("uses the authorized local fallback for reads, writes and invalidation", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    allowLocalFileStoreFallbackMock.mockReturnValue(true);
    const records = [{
      id: "local-1",
      snapshotKey: JSON.stringify({ route: "api/actions", viewport: "global" }),
      snapshotDate: "2026-10-13",
      generatedAt: "2026-10-13T10:00:00.000Z",
      version: "v1",
      title: "Actions",
      payload: { source: "local" },
      meta: [],
    }];
    readLocalRecordStoreMock.mockResolvedValue({ records });
    writeLocalRecordStoreMock.mockResolvedValue(undefined);

    await expect(readLatestPublicSurfaceSnapshot("missing")).resolves.toBeNull();
    await expect(upsertPublicSurfaceSnapshot({
      snapshotKey: "local",
      snapshotDate: "2026-10-13",
      generatedAt: "2026-10-13T10:00:00.000Z",
      version: "v1",
      title: "Local",
      payload: { source: "new" },
      meta: {},
    })).resolves.toBe("applied");
    expect(writeLocalRecordStoreMock).toHaveBeenCalledOnce();

    await invalidatePublicSurfaceSnapshotsByRoute([]);
    await invalidatePublicSurfaceSnapshotsByRoute(["   "]);
    expect(writeLocalRecordStoreMock).toHaveBeenCalledOnce();
    await invalidatePublicSurfaceSnapshotsByRoute(["api/actions"]);
    expect(revalidateUnifiedActionContractsCacheMock).toHaveBeenCalledOnce();
    expect(writeLocalRecordStoreMock).toHaveBeenCalledTimes(2);
  });

  it("fails closed on Supabase mutation errors and uses local fallback only when allowed", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    allowLocalFileStoreFallbackMock.mockReturnValue(false);
    const failedQuery = () => {
      const query = {
        eq: () => query,
        neq: () => query,
        lt: () => query,
        order: () => query,
        limit: () => query,
        select: () => query,
        maybeSingle: async () => ({ data: null, error: { message: "snapshot database unavailable" } }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: { message: "snapshot database unavailable" } }).then(resolve),
      };
      return query;
    };
    getSupabaseServerClientMock.mockReturnValue({ from: () => ({
      update: failedQuery,
      upsert: failedQuery,
      select: failedQuery,
    }) });
    await expect(upsertPublicSurfaceSnapshot({
      snapshotKey: "strict-error",
      snapshotDate: "2026-10-13",
      generatedAt: "2026-10-13T10:00:00.000Z",
      version: "v1",
      title: "Strict",
      payload: {},
      meta: {},
    })).rejects.toThrow("snapshot database unavailable");
    await expect(readLatestPublicSurfaceSnapshot("strict-error")).resolves.toBeNull();

    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    allowLocalFileStoreFallbackMock.mockReturnValue(true);
    readLocalRecordStoreMock.mockResolvedValue({ records: [] });
    writeLocalRecordStoreMock.mockResolvedValue(undefined);
    await expect(upsertPublicSurfaceSnapshot({
      snapshotKey: "fallback-error",
      snapshotDate: "2026-10-13",
      generatedAt: "2026-10-13T10:00:00.000Z",
      version: "v1",
      title: "Fallback",
      payload: {},
      meta: {},
    })).resolves.toBe("applied");
    expect(writeLocalRecordStoreMock).toHaveBeenCalled();
  });

  it("uses the local fallback after a Supabase read exception and invalidates legacy keys safely", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    allowLocalFileStoreFallbackMock.mockReturnValue(true);
    getSupabaseServerClientMock.mockImplementation(() => {
      throw new Error("supabase client unavailable");
    });
    readLocalRecordStoreMock.mockResolvedValue({
      records: [{
        id: "legacy",
        snapshotKey: "legacy/api/actions/snapshot",
        snapshotDate: "2026-10-13",
        generatedAt: "2026-10-13T10:00:00.000Z",
        version: "v1",
        title: "Legacy",
        payload: { source: "local" },
        meta: {},
      }],
    });
    writeLocalRecordStoreMock.mockResolvedValue(undefined);

    await expect(readLatestPublicSurfaceSnapshot("legacy/api/actions/snapshot")).resolves.toMatchObject({ id: "legacy" });
    await expect(invalidatePublicSurfaceSnapshotsByRoute(["api/actions"])).resolves.toBeUndefined();
    expect(writeLocalRecordStoreMock).toHaveBeenCalledWith(
      expect.stringContaining("public_surface_snapshots.json"),
      expect.arrayContaining([expect.objectContaining({ version: "__public_surface_snapshot_invalidated__" })]),
    );
  });

  it("fails on a Supabase insert error and on a retry update error without a local fallback", async () => {
    const snapshot = {
      snapshotKey: "write-error",
      snapshotDate: "2026-10-13",
      generatedAt: "2026-10-13T10:00:00.000Z",
      version: "v1",
      title: "Write error",
      payload: {},
      meta: {},
    };
    const makeQuery = (kind: "update" | "upsert") => {
      const query = {
        eq: vi.fn(() => query),
        neq: vi.fn(() => query),
        lt: vi.fn(() => query),
        select: vi.fn(() => query),
        maybeSingle: vi.fn(async () => {
          if (kind === "upsert") return { data: null, error: { message: "insert failed" } };
          return { data: null, error: null };
        }),
      };
      return query;
    };
    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        update: () => makeQuery("update"),
        upsert: () => makeQuery("upsert"),
      })),
    });
    await expect(upsertPublicSurfaceSnapshot(snapshot)).rejects.toThrow("insert failed");

    let retryUpdateInvocation = 0;
    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        update: () => {
          const query = makeQuery("update");
          retryUpdateInvocation += 1;
          query.maybeSingle.mockImplementation(async () => retryUpdateInvocation === 2
            ? { data: null, error: { message: "retry failed" } }
            : { data: null, error: null });
          return query;
        },
        upsert: () => {
          const query = makeQuery("upsert");
          query.maybeSingle.mockImplementation(async () => ({ data: null, error: null }));
          return query;
        },
      })),
    });
    await expect(upsertPublicSurfaceSnapshot(snapshot)).rejects.toThrow("retry failed");
    expect(retryUpdateInvocation).toBe(2);
  });

  it("keeps the newest local row for equal dates and leaves unrelated invalidations untouched", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    allowLocalFileStoreFallbackMock.mockReturnValue(true);
    readLocalRecordStoreMock.mockResolvedValue({
      records: [
        { id: "older", snapshotKey: "same", snapshotDate: "2026-10-13", generatedAt: "2026-10-13T09:00:00.000Z", version: "v1", title: "Older", payload: {}, meta: {} },
        { id: "newer", snapshotKey: "same", snapshotDate: "2026-10-13", generatedAt: "2026-10-13T10:00:00.000Z", version: "v1", title: "Newer", payload: {}, meta: {} },
      ],
    });
    await expect(readLatestPublicSurfaceSnapshot("same")).resolves.toMatchObject({ id: "newer" });
    await expect(invalidatePublicSurfaceSnapshotsByRoute(["unrelated"])).resolves.toBeUndefined();
    expect(writeLocalRecordStoreMock).not.toHaveBeenCalled();
  });
});

