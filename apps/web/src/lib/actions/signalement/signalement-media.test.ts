import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/authz", () => ({ requireAdminAccess: requireAdminAccessMock }));

import {
  buildSignalementEvidencePath,
  createSignalementMediaUploadIntent,
  finalizeSignalementMedia,
  listSignalementMedia,
  SIGNALEMENT_EVIDENCE_BUCKET,
  SIGNALEMENT_EVIDENCE_MAX_MEDIA,
  SignalementMediaError,
  validateSignalementMediaInput,
} from "./signalement-media";

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };
type FakeQuery = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (resolve: (value: QueryResult) => unknown, reject?: (error: unknown) => unknown) => Promise<unknown>;
};

function makeQuery(result: QueryResult, queryOptions: {
  listData?: unknown[];
  insertData?: unknown;
  updateData?: unknown;
  afterUpdateMaybeSingleData?: unknown;
  count?: number;
} = {}) {
  const query = {} as FakeQuery;
  let currentResult = result;
  let listMode = false;
  let updated = false;
  let postUpdateReadUsed = false;
  query.select = vi.fn((_columns?: unknown, selectOptions?: { count?: string; head?: boolean }) => {
    if (selectOptions?.count) {
      currentResult = queryOptions.count === undefined ? result : { ...result, data: null, count: queryOptions.count };
    }
    return query;
  });
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.lt = vi.fn(() => query);
  query.order = vi.fn(() => {
    listMode = true;
    return query;
  });
  query.limit = vi.fn(() => query);
  query.insert = vi.fn(() => {
    currentResult = { data: queryOptions.insertData ?? result.data, error: null };
    return query;
  });
  query.update = vi.fn(() => {
    updated = true;
    currentResult = {
      data: Object.prototype.hasOwnProperty.call(queryOptions, "updateData")
        ? queryOptions.updateData
        : result.data,
      error: null,
    };
    return query;
  });
  query.maybeSingle = vi.fn(async () => {
    if (updated && queryOptions.afterUpdateMaybeSingleData !== undefined) {
      if (!postUpdateReadUsed) {
        postUpdateReadUsed = true;
        return currentResult;
      }
      return { data: queryOptions.afterUpdateMaybeSingleData, error: null };
    }
    return currentResult;
  });
  query.single = vi.fn(async () => currentResult);
  query.then = (resolve: (value: QueryResult) => unknown, reject?: (error: unknown) => unknown) =>
    Promise.resolve(listMode ? { data: queryOptions.listData ?? [], error: null } : currentResult).then(resolve, reject);
  return query;
}

function makeSupabase(params: {
  parent: Record<string, unknown>;
  existingMedia?: Record<string, unknown> | null;
  activeCount?: number;
  insertedMedia?: Record<string, unknown>;
  updatedMedia?: Record<string, unknown> | null;
  afterUpdateMaybeSingleData?: Record<string, unknown>;
  objectInfo?: Record<string, unknown> | null;
  signedUrl?: string;
}) {
  const parentQuery = makeQuery({ data: params.parent, error: null });
  const mediaQuery = makeQuery(
    { data: params.existingMedia ?? null, error: null },
    {
      listData: params.existingMedia ? [params.existingMedia] : [],
      insertData: params.insertedMedia,
      updateData: params.updatedMedia,
      afterUpdateMaybeSingleData: params.afterUpdateMaybeSingleData,
      count: params.activeCount,
    },
  );
  const from = vi.fn((table: string) => {
    if (table === "trash_spotter_spots") return parentQuery;
    if (table !== "signalement_media") throw new Error(`Unexpected table ${table}`);
    return mediaQuery;
  });
  const info = vi.fn(async () => ({
    data: params.objectInfo,
    error: params.objectInfo ? null : new Error("missing"),
  }));
  const mediaStorage = {
    createSignedUploadUrl: vi.fn(async () => ({
      data: { token: "upload-token" },
      error: null,
    })),
    info,
    createSignedUrl: vi.fn(async () => ({
      data: { signedUrl: params.signedUrl ?? "https://signed.test/evidence" },
      error: null,
    })),
  };
  const mediaBuilder = { from: vi.fn(() => mediaStorage) };
  return { from, storage: mediaBuilder, __queries: { mediaQuery } };
}

const parent = {
  id: "signalement-1",
  created_by_clerk_id: "user-1",
  user_id: "user-1",
  status: "new",
  spot_type: "spot",
};

const readyMedia = {
  id: "media-1",
  signalement_id: "signalement-1",
  created_at: "2026-08-25T12:00:00Z",
  created_by_clerk_id: "user-1",
  client_upload_id: "client-1",
  storage_bucket: SIGNALEMENT_EVIDENCE_BUCKET,
  storage_path: "signalement-1/media-1.jpg",
  original_name: "preuve.jpg",
  mime_type: "image/jpeg",
  size_bytes: 1234,
  width: 1200,
  height: 800,
  sort_order: 0,
  upload_state: "ready",
};

describe("signalement media contract", () => {
  beforeEach(() => {
    requireAdminAccessMock.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
  });

  it("validates MIME, size and dimensions before any storage call", () => {
    expect(() =>
      validateSignalementMediaInput({
        originalName: "preuve.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1_000,
        width: 1200,
        height: 800,
        clientUploadId: "client-1",
      }),
    ).not.toThrow();
    expect(() =>
      validateSignalementMediaInput({
        originalName: "preuve.svg",
        mimeType: "image/svg+xml",
        sizeBytes: 1_000,
        clientUploadId: "client-2",
      }),
    ).toThrowError(SignalementMediaError);
    expect(() =>
      validateSignalementMediaInput({
        originalName: "preuve.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 5 * 1024 * 1024 + 1,
        clientUploadId: "client-3",
      }),
    ).toThrowError(SignalementMediaError);
    expect(() =>
      validateSignalementMediaInput({
        originalName: "preuve.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1_000,
        width: 10_001,
        clientUploadId: "client-4",
      }),
    ).toThrowError(SignalementMediaError);
  });

  it("derives the path from server identifiers, never from the client upload id", () => {
    const path = buildSignalementEvidencePath("signalement-1", "media-1", "image/jpeg");
    expect(path).toBe("signalement-1/media-1.jpg");
    expect(path).not.toContain("client");
    expect(path).not.toContain("..");
  });

  it("supports a spot or clean_place parent without a second persistence source", async () => {
    const supabase = makeSupabase({
      parent,
      activeCount: 0,
      insertedMedia: { ...readyMedia, upload_state: "pending" },
    });
    const intent = await createSignalementMediaUploadIntent(supabase as never, {
      userId: "user-1",
      signalementId: "signalement-1",
      originalName: "preuve.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1234,
      clientUploadId: "client-not-a-path",
    });
    expect(intent).toMatchObject({ bucket: SIGNALEMENT_EVIDENCE_BUCKET, uploadState: "pending" });
    const insertPayload = supabase.__queries.mediaQuery.insert.mock.calls[0]?.[0] as {
      id?: string;
      storage_path?: string;
    };
    expect(insertPayload.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(insertPayload.storage_path).toBe(`signalement-1/${insertPayload.id}.jpg`);
    expect(supabase.from).toHaveBeenCalledWith("trash_spotter_spots");
    expect(supabase.from).toHaveBeenCalledWith("signalement_media");
  });

  it("accepts the same evidence contract for a clean_place parent", async () => {
    const supabase = makeSupabase({
      parent: { ...parent, spot_type: "clean_place" },
      activeCount: 0,
      insertedMedia: { ...readyMedia, storage_path: "signalement-1/media-2.webp", mime_type: "image/webp" },
    });
    const intent = await createSignalementMediaUploadIntent(supabase as never, {
      userId: "user-1",
      signalementId: "signalement-1",
      originalName: "lieu-propre.webp",
      mimeType: "image/webp",
      sizeBytes: 1234,
      clientUploadId: "clean-client-1",
    });
    expect(intent).toMatchObject({ bucket: SIGNALEMENT_EVIDENCE_BUCKET, uploadState: "pending" });
  });

  it("reopens a failed idempotency row without consuming another media slot", async () => {
    const supabase = makeSupabase({
      parent,
      existingMedia: { ...readyMedia, upload_state: "failed" },
      activeCount: SIGNALEMENT_EVIDENCE_MAX_MEDIA,
      updatedMedia: { ...readyMedia, upload_state: "pending", original_name: "nouvelle-preuve.jpg" },
    });
    const intent = await createSignalementMediaUploadIntent(supabase as never, {
      userId: "user-1",
      signalementId: "signalement-1",
      originalName: "nouvelle-preuve.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1234,
      clientUploadId: "client-1",
    });
    expect(intent).toMatchObject({ mediaId: "media-1", uploadState: "pending" });
    expect(supabase.__queries.mediaQuery.insert).not.toHaveBeenCalled();
  });

  it("rejects a non-owner when admin access is not available", async () => {
    const supabase = makeSupabase({ parent, activeCount: 0 });
    await expect(
      createSignalementMediaUploadIntent(supabase as never, {
        userId: "other-user",
        signalementId: "signalement-1",
        originalName: "preuve.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1234,
        clientUploadId: "client-1",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("enforces the maximum of three active media intents", async () => {
    const supabase = makeSupabase({ parent, activeCount: SIGNALEMENT_EVIDENCE_MAX_MEDIA });
    await expect(
      createSignalementMediaUploadIntent(supabase as never, {
        userId: "user-1",
        signalementId: "signalement-1",
        originalName: "preuve.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1234,
        clientUploadId: "client-new",
      }),
    ).rejects.toMatchObject({ code: "limit_reached" });
  });

  it("finalization is idempotent for an already ready row", async () => {
    const supabase = makeSupabase({
      parent,
      existingMedia: readyMedia,
      objectInfo: { metadata: { size: readyMedia.size_bytes, mimetype: readyMedia.mime_type } },
    });
    const result = await finalizeSignalementMedia(supabase as never, {
      userId: "user-1",
      signalementId: "signalement-1",
      mediaId: "media-1",
    });
    expect(result.alreadyReady).toBe(true);
    expect(supabase.storage.from().info).toHaveBeenCalledWith(readyMedia.storage_path);
  });

  it("rejects a ready object whose storage metadata no longer matches the row", async () => {
    const supabase = makeSupabase({
      parent,
      existingMedia: readyMedia,
      objectInfo: { metadata: { size: readyMedia.size_bytes + 1, mimetype: readyMedia.mime_type } },
    });

    await expect(
      finalizeSignalementMedia(supabase as never, {
        userId: "user-1",
        signalementId: "signalement-1",
        mediaId: "media-1",
      }),
    ).rejects.toMatchObject({ code: "storage_invalid" });
  });

  it("validates the uploaded object before marking a pending row ready", async () => {
    const pendingMedia = { ...readyMedia, upload_state: "pending" as const };
    const updatedMedia = { ...readyMedia, upload_state: "ready" as const };
    const supabase = makeSupabase({
      parent,
      existingMedia: pendingMedia,
      updatedMedia,
      objectInfo: { metadata: { size: pendingMedia.size_bytes, mimetype: pendingMedia.mime_type } },
    });

    const result = await finalizeSignalementMedia(supabase as never, {
      userId: "user-1",
      signalementId: "signalement-1",
      mediaId: "media-1",
    });

    expect(result.alreadyReady).toBe(false);
    expect(result.media.uploadState).toBe("ready");
    const updateFilters = supabase.__queries.mediaQuery.eq.mock.calls.map((call) => call[0]);
    expect(updateFilters).toEqual(expect.arrayContaining(["signalement_id", "upload_state", "storage_path"]));
  });

  it("fails closed when the uploaded object size or MIME is altered", async () => {
    const pendingMedia = { ...readyMedia, upload_state: "pending" as const };
    const supabase = makeSupabase({
      parent,
      existingMedia: pendingMedia,
      objectInfo: { metadata: { size: pendingMedia.size_bytes, mimetype: "image/png" } },
    });

    await expect(
      finalizeSignalementMedia(supabase as never, {
        userId: "user-1",
        signalementId: "signalement-1",
        mediaId: "media-1",
      }),
    ).rejects.toMatchObject({ code: "storage_invalid" });
    expect(supabase.__queries.mediaQuery.update).toHaveBeenCalled();
  });

  it("returns the concurrently finalized row without a second state transition", async () => {
    const pendingMedia = { ...readyMedia, upload_state: "pending" as const };
    const concurrentReadyMedia = { ...readyMedia, upload_state: "ready" as const };
    const supabase = makeSupabase({
      parent,
      existingMedia: pendingMedia,
      updatedMedia: null,
      afterUpdateMaybeSingleData: concurrentReadyMedia,
      objectInfo: { metadata: { size: pendingMedia.size_bytes, mimetype: pendingMedia.mime_type } },
    });

    const result = await finalizeSignalementMedia(supabase as never, {
      userId: "user-1",
      signalementId: "signalement-1",
      mediaId: "media-1",
    });

    expect(result.alreadyReady).toBe(true);
    expect(result.media.uploadState).toBe("ready");
  });

  it("does not sign media for a new parent to a non-owner", async () => {
    const supabase = makeSupabase({ parent, existingMedia: readyMedia });
    await expect(
      listSignalementMedia(supabase as never, { signalementId: "signalement-1", userId: "other-user" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(supabase.storage.from().createSignedUrl).not.toHaveBeenCalled();
  });

  it("lets the owner read ready media for a new parent", async () => {
    const supabase = makeSupabase({
      parent,
      existingMedia: readyMedia,
      signedUrl: "https://signed.test/owner-new",
    });
    const items = await listSignalementMedia(supabase as never, {
      signalementId: "signalement-1",
      userId: "user-1",
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.signedUrl).toBe("https://signed.test/owner-new");
  });

  it("signs only ready media for a validated public parent", async () => {
    const supabase = makeSupabase({
      parent: { ...parent, status: "validated" },
      existingMedia: readyMedia,
      signedUrl: "https://signed.test/short-lived",
    });
    const items = await listSignalementMedia(supabase as never, {
      signalementId: "signalement-1",
      userId: null,
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.signedUrl).toBe("https://signed.test/short-lived");
  });
});
