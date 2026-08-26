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

function makeQuery(result: QueryResult, options: { listData?: unknown[]; insertData?: unknown; updateData?: unknown } = {}) {
  const query = {} as FakeQuery;
  let currentResult = result;
  let listMode = false;
  query.select = vi.fn((_columns?: unknown, options?: { count?: string; head?: boolean }) => {
    if (options?.count) {
      currentResult = result;
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
    currentResult = { data: options.insertData ?? result.data, error: null };
    return query;
  });
  query.update = vi.fn(() => {
    currentResult = { data: options.updateData ?? result.data, error: null };
    return query;
  });
  query.maybeSingle = vi.fn(async () => currentResult);
  query.single = vi.fn(async () => currentResult);
  query.then = (resolve: (value: QueryResult) => unknown, reject?: (error: unknown) => unknown) =>
    Promise.resolve(listMode ? { data: options.listData ?? [], error: null } : currentResult).then(resolve, reject);
  return query;
}

function makeSupabase(params: {
  parent: Record<string, unknown>;
  existingMedia?: Record<string, unknown> | null;
  activeCount?: number;
  insertedMedia?: Record<string, unknown>;
  updatedMedia?: Record<string, unknown>;
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
    },
  );
  const from = vi.fn((table: string) => {
    if (table === "trash_spotter_spots") return parentQuery;
    if (table !== "signalement_media") throw new Error(`Unexpected table ${table}`);
    if (params.activeCount !== undefined && params.activeCount > 0) {
      mediaQuery.select.mockImplementation((_columns?: unknown, options?: { count?: string }) => {
        if (options?.count) {
          mediaQuery.then = (resolve: (value: QueryResult) => unknown, reject?: (error: unknown) => unknown) =>
            Promise.resolve({ data: null, error: null, count: params.activeCount }).then(resolve, reject);
        }
        return mediaQuery;
      });
    }
    return mediaQuery;
  });
  const mediaBuilder = {
    from: vi.fn(() => ({
      createSignedUploadUrl: vi.fn(async () => ({
        data: { token: "upload-token" },
        error: null,
      })),
      info: vi.fn(async () => ({ data: params.objectInfo, error: params.objectInfo ? null : new Error("missing") })),
      createSignedUrl: vi.fn(async () => ({ data: { signedUrl: params.signedUrl ?? "https://signed.test/evidence" }, error: null })),
    })),
  };
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
    const supabase = makeSupabase({ parent, existingMedia: readyMedia });
    const result = await finalizeSignalementMedia(supabase as never, {
      userId: "user-1",
      signalementId: "signalement-1",
      mediaId: "media-1",
    });
    expect(result.alreadyReady).toBe(true);
    expect(supabase.storage.from().info).not.toHaveBeenCalled();
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
