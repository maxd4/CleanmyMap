import { describe, expect, it, vi } from "vitest";
import {
  ACTION_MEDIA_BUCKET,
  ACTION_MEDIA_MAX_MEDIA,
} from "./action-media-contract";
import {
  ActionMediaError,
  buildActionMediaPath,
  createActionMediaUploadIntent,
  finalizeActionMedia,
  listActionMedia,
  validateActionMediaInput,
} from "./action-media";

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

function makeQuery(
  initial: QueryResult,
  options: { listData?: unknown[]; insertData?: unknown; updateData?: unknown } = {},
) {
  const query = {} as Record<string, ReturnType<typeof vi.fn>> & {
    then: (resolve: (value: QueryResult) => unknown) => Promise<unknown>;
  };
  let result = initial;
  let list = false;
  query.select = vi.fn((_columns?: unknown, countOptions?: { count?: string }) => {
    if (countOptions?.count) result = initial;
    return query;
  });
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.order = vi.fn(() => { list = true; return query; });
  query.insert = vi.fn(() => { result = { data: options.insertData ?? initial.data, error: null }; return query; });
  query.update = vi.fn(() => { result = { data: options.updateData ?? initial.data, error: null }; return query; });
  query.maybeSingle = vi.fn(async () => result);
  query.single = vi.fn(async () => result);
  query.then = (resolve) => Promise.resolve(list ? { data: options.listData ?? [], error: null } : result).then(resolve);
  return query;
}

function makeSupabase(params: {
  action?: Record<string, unknown> | null;
  organizers?: unknown[];
  existingMedia?: Record<string, unknown> | null;
  activeCount?: number;
  insertedMedia?: Record<string, unknown>;
  updatedMedia?: Record<string, unknown>;
  objectInfo?: Record<string, unknown> | null;
}) {
  const actionQuery = makeQuery({ data: params.action ?? null, error: null });
  const organizerQuery = makeQuery({ data: null, error: null }, { listData: params.organizers ?? [] });
  const mediaQuery = makeQuery(
    { data: params.existingMedia ?? null, error: null, count: params.activeCount ?? 0 },
    { listData: params.existingMedia ? [params.existingMedia] : [], insertData: params.insertedMedia, updateData: params.updatedMedia },
  );
  const from = vi.fn((table: string) => {
    if (table === "actions") return actionQuery;
    if (table === "action_organizers") return organizerQuery;
    if (table === "action_media") return mediaQuery;
    throw new Error(`Unexpected table ${table}`);
  });
  const createSignedUploadUrl = vi.fn(async () => ({ data: { token: "upload-token" }, error: null }));
  const storageClient = {
    createSignedUploadUrl,
    info: vi.fn(async () => ({ data: params.objectInfo, error: params.objectInfo ? null : new Error("missing") })),
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: "https://signed.test/action" }, error: null })),
  };
  const storageFrom = vi.fn(() => storageClient);
  return {
    from,
    storage: { from: storageFrom },
    __queries: { mediaQuery },
    __storage: storageFrom,
    __storageUpload: createSignedUploadUrl,
  };
}

const action = {
  id: "11111111-1111-4111-8111-111111111111",
  created_by_clerk_id: "user-1",
  action_phase: "post_action_complete",
  status: "pending",
};

const readyMedia = {
  id: "22222222-2222-4222-8222-222222222222",
  action_id: action.id,
  created_at: "2026-10-17T12:00:00Z",
  created_by_clerk_id: "user-1",
  client_upload_id: "client-1",
  storage_bucket: ACTION_MEDIA_BUCKET,
  storage_path: `${action.id}/22222222-2222-4222-8222-222222222222.jpg`,
  original_name: "bilan.jpg",
  mime_type: "image/jpeg",
  size_bytes: 1234,
  width: 1200,
  height: 800,
  sort_order: 0,
  upload_state: "ready",
};

const ownerIdentity = { userId: "user-1", role: "benevole" as const, activeRole: "benevole" as const };

describe("action media contract", () => {
  it("validates the restricted image contract before persistence", () => {
    expect(() => validateActionMediaInput({ originalName: "bilan.jpg", mimeType: "image/jpeg", sizeBytes: 1000, clientUploadId: "client-1" })).not.toThrow();
    expect(() => validateActionMediaInput({ originalName: "bilan.svg", mimeType: "image/svg+xml", sizeBytes: 1000, clientUploadId: "client-2" })).toThrow(ActionMediaError);
    expect(() => validateActionMediaInput({ originalName: "bilan.jpg", mimeType: "image/jpeg", sizeBytes: 5 * 1024 * 1024 + 1, clientUploadId: "client-3" })).toThrow(ActionMediaError);
  });

  it("derives a private path from server identifiers", () => {
    expect(buildActionMediaPath(action.id, readyMedia.id, "image/jpeg")).toBe(`${action.id}/${readyMedia.id}.jpg`);
    expect(buildActionMediaPath(action.id, readyMedia.id, "image/jpeg")).not.toContain("client-1");
  });

  it("creates an upload intent for the owner and uses the dedicated bucket", async () => {
    const supabase = makeSupabase({ action, activeCount: 0, insertedMedia: { ...readyMedia, upload_state: "pending" } });
    const intent = await createActionMediaUploadIntent(supabase as never, {
      ...ownerIdentity,
      identity: ownerIdentity,
      actionId: action.id,
      originalName: "bilan.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1234,
      clientUploadId: "stable-client-id",
    });
    expect(intent).toMatchObject({ bucket: ACTION_MEDIA_BUCKET, uploadState: "pending" });
    expect(supabase.from).toHaveBeenCalledWith("actions");
    expect(supabase.from).toHaveBeenCalledWith("action_media");
    expect(supabase.__storage).toHaveBeenCalledWith(ACTION_MEDIA_BUCKET);
    expect(supabase.__storageUpload).toHaveBeenCalledWith(readyMedia.storage_path);
  });

  it("rejects a missing, non-admissible or unrelated action", async () => {
    await expect(createActionMediaUploadIntent(makeSupabase({ action: null }) as never, {
      ...ownerIdentity, identity: ownerIdentity, actionId: action.id, originalName: "bilan.jpg", mimeType: "image/jpeg", sizeBytes: 1000, clientUploadId: "client-1",
    })).rejects.toMatchObject({ code: "not_found" });
    await expect(createActionMediaUploadIntent(makeSupabase({ action: { ...action, action_phase: "pre_action" } }) as never, {
      ...ownerIdentity, identity: ownerIdentity, actionId: action.id, originalName: "bilan.jpg", mimeType: "image/jpeg", sizeBytes: 1000, clientUploadId: "client-2",
    })).rejects.toMatchObject({ code: "not_admissible" });
    await expect(listActionMedia(makeSupabase({ action }) as never, {
      actionId: action.id, userId: "other-user", identity: { userId: "other-user", role: "benevole", activeRole: "benevole" },
    })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects a fourth active intent, including the quota boundary", async () => {
    await expect(createActionMediaUploadIntent(makeSupabase({ action, activeCount: ACTION_MEDIA_MAX_MEDIA }) as never, {
      ...ownerIdentity, identity: ownerIdentity, actionId: action.id, originalName: "bilan.jpg", mimeType: "image/jpeg", sizeBytes: 1000, clientUploadId: "client-4",
    })).rejects.toMatchObject({ code: "limit_reached" });
  });

  it("does not finalize before the object exists and is idempotent once ready", async () => {
    await expect(finalizeActionMedia(makeSupabase({ action, existingMedia: { ...readyMedia, upload_state: "pending" } }) as never, {
      ...ownerIdentity, identity: ownerIdentity, actionId: action.id, mediaId: readyMedia.id,
    })).rejects.toMatchObject({ code: "storage_missing" });
    const result = await finalizeActionMedia(makeSupabase({
      action,
      existingMedia: readyMedia,
      objectInfo: { metadata: { size: readyMedia.size_bytes, mimetype: readyMedia.mime_type } },
    }) as never, {
      ...ownerIdentity, identity: ownerIdentity, actionId: action.id, mediaId: readyMedia.id,
    });
    expect(result.alreadyReady).toBe(true);
  });

  it("keeps retry identity immutable and rejects a JPEG to WebP mutation", async () => {
    const supabase = makeSupabase({
      action,
      existingMedia: { ...readyMedia, upload_state: "failed" },
    });
    await expect(createActionMediaUploadIntent(supabase as never, {
      ...ownerIdentity,
      identity: ownerIdentity,
      actionId: action.id,
      originalName: "bilan.webp",
      mimeType: "image/webp",
      sizeBytes: 1234,
      width: 1200,
      height: 800,
      sortOrder: 0,
      clientUploadId: readyMedia.client_upload_id,
    })).rejects.toMatchObject({ code: "conflict" });
    expect(supabase.__queries.mediaQuery.update).not.toHaveBeenCalled();
  });

  it("finalizes an already transmitted object without issuing another upload", async () => {
    const supabase = makeSupabase({
      action,
      existingMedia: { ...readyMedia, upload_state: "pending" },
      updatedMedia: { ...readyMedia, upload_state: "ready" },
      objectInfo: { metadata: { size: readyMedia.size_bytes, mimetype: readyMedia.mime_type } },
    });
    const intent = await createActionMediaUploadIntent(supabase as never, {
      ...ownerIdentity,
      identity: ownerIdentity,
      actionId: action.id,
      originalName: readyMedia.original_name,
      mimeType: readyMedia.mime_type,
      sizeBytes: readyMedia.size_bytes,
      width: readyMedia.width,
      height: readyMedia.height,
      sortOrder: readyMedia.sort_order,
      clientUploadId: readyMedia.client_upload_id,
    });
    expect(intent).toEqual({ mediaId: readyMedia.id, uploadState: "ready" });
    expect(supabase.__storageUpload).not.toHaveBeenCalled();
  });

  it("keeps concurrent identical retries idempotent when the object already exists", async () => {
    const supabase = makeSupabase({
      action,
      existingMedia: { ...readyMedia, upload_state: "pending" },
      updatedMedia: { ...readyMedia, upload_state: "ready" },
      objectInfo: { metadata: { size: readyMedia.size_bytes, mimetype: readyMedia.mime_type } },
    });
    const params = {
      ...ownerIdentity,
      identity: ownerIdentity,
      actionId: action.id,
      originalName: readyMedia.original_name,
      mimeType: readyMedia.mime_type,
      sizeBytes: readyMedia.size_bytes,
      width: readyMedia.width,
      height: readyMedia.height,
      sortOrder: readyMedia.sort_order,
      clientUploadId: readyMedia.client_upload_id,
    };
    const results = await Promise.all([
      createActionMediaUploadIntent(supabase as never, params),
      createActionMediaUploadIntent(supabase as never, params),
    ]);
    expect(results).toEqual([
      { mediaId: readyMedia.id, uploadState: "ready" },
      { mediaId: readyMedia.id, uploadState: "ready" },
    ]);
    expect(supabase.__storageUpload).not.toHaveBeenCalled();
  });

  it("rejects a received object whose size or type does not match the row", async () => {
    await expect(finalizeActionMedia(makeSupabase({
      action,
      existingMedia: { ...readyMedia, upload_state: "pending" },
      objectInfo: { metadata: { size: readyMedia.size_bytes + 1, mimetype: readyMedia.mime_type } },
    }) as never, {
      ...ownerIdentity, identity: ownerIdentity, actionId: action.id, mediaId: readyMedia.id,
    })).rejects.toMatchObject({ code: "storage_invalid" });

    await expect(finalizeActionMedia(makeSupabase({
      action,
      existingMedia: { ...readyMedia, upload_state: "pending" },
      objectInfo: { metadata: { size: readyMedia.size_bytes, mimetype: "image/webp" } },
    }) as never, {
      ...ownerIdentity, identity: ownerIdentity, actionId: action.id, mediaId: readyMedia.id,
    })).rejects.toMatchObject({ code: "storage_invalid" });
  });

  it("does not issue a new upload token for a ready proof after a delayed retry", async () => {
    const supabase = makeSupabase({
      action,
      existingMedia: readyMedia,
      objectInfo: { metadata: { size: readyMedia.size_bytes, mimetype: readyMedia.mime_type } },
    });
    const result = await createActionMediaUploadIntent(supabase as never, {
      ...ownerIdentity,
      identity: ownerIdentity,
      actionId: action.id,
      originalName: readyMedia.original_name,
      mimeType: readyMedia.mime_type,
      sizeBytes: readyMedia.size_bytes,
      width: readyMedia.width,
      height: readyMedia.height,
      sortOrder: readyMedia.sort_order,
      clientUploadId: readyMedia.client_upload_id,
    });
    expect(result).toEqual({ mediaId: readyMedia.id, uploadState: "ready" });
    expect(supabase.__storageUpload).not.toHaveBeenCalled();
  });

  it("refuses a ready proof whose object was changed and never reissues its path", async () => {
    const supabase = makeSupabase({
      action,
      existingMedia: readyMedia,
      objectInfo: { metadata: { size: readyMedia.size_bytes, mimetype: "image/webp" } },
    });
    await expect(createActionMediaUploadIntent(supabase as never, {
      ...ownerIdentity,
      identity: ownerIdentity,
      actionId: action.id,
      originalName: readyMedia.original_name,
      mimeType: readyMedia.mime_type,
      sizeBytes: readyMedia.size_bytes,
      width: readyMedia.width,
      height: readyMedia.height,
      sortOrder: readyMedia.sort_order,
      clientUploadId: readyMedia.client_upload_id,
    })).rejects.toMatchObject({ code: "storage_invalid" });
    expect(supabase.__storageUpload).not.toHaveBeenCalled();
  });

  it("reads only ready photos through transient signed URLs", async () => {
    const supabase = makeSupabase({ action, existingMedia: readyMedia });
    const items = await listActionMedia(supabase as never, { actionId: action.id, ...ownerIdentity, identity: ownerIdentity });
    expect(items).toHaveLength(1);
    expect(items[0]?.signedUrl).toBe("https://signed.test/action");
    expect(supabase.__storage).toHaveBeenCalledWith(ACTION_MEDIA_BUCKET);
  });
});
