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
  const storageFrom = vi.fn(() => ({
    createSignedUploadUrl: vi.fn(async () => ({ data: { token: "upload-token" }, error: null })),
    info: vi.fn(async () => ({ data: params.objectInfo, error: params.objectInfo ? null : new Error("missing") })),
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: "https://signed.test/action" }, error: null })),
  }));
  return { from, storage: { from: storageFrom }, __queries: { mediaQuery }, __storage: storageFrom };
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
    const result = await finalizeActionMedia(makeSupabase({ action, existingMedia: readyMedia }) as never, {
      ...ownerIdentity, identity: ownerIdentity, actionId: action.id, mediaId: readyMedia.id,
    });
    expect(result.alreadyReady).toBe(true);
  });

  it("reads only ready photos through transient signed URLs", async () => {
    const supabase = makeSupabase({ action, existingMedia: readyMedia });
    const items = await listActionMedia(supabase as never, { actionId: action.id, ...ownerIdentity, identity: ownerIdentity });
    expect(items).toHaveLength(1);
    expect(items[0]?.signedUrl).toBe("https://signed.test/action");
    expect(supabase.__storage).toHaveBeenCalledWith(ACTION_MEDIA_BUCKET);
  });
});
