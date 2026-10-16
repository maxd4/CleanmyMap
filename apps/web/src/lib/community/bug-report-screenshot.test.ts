import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/authz", () => ({ requireAdminAccess: requireAdminAccessMock }));

import {
  buildBugReportScreenshotPath,
  createBugReportScreenshotUploadIntent,
  deleteBugReportScreenshot,
  finalizeBugReportScreenshot,
  getBugReportScreenshot,
  validateBugReportScreenshotInput,
  BugReportScreenshotError,
} from "./bug-report-screenshot";
import { BUG_REPORT_SCREENSHOT_BUCKET } from "./bug-report-screenshot-contract";

const feedbackId = "11111111-1111-4111-8111-111111111111";

function makeSupabase(overrides: {
  row?: Record<string, unknown>;
  info?: Record<string, unknown> | null;
  download?: Blob | null;
  signedUrl?: string;
} = {}) {
  const state = {
    row: {
      id: feedbackId,
      submitted_by_user_id: "owner-1",
      report_type: "bug",
      screenshot_storage_bucket: null,
      screenshot_storage_path: null,
      screenshot_original_name: null,
      screenshot_mime_type: null,
      screenshot_size_bytes: null,
      screenshot_width: null,
      screenshot_height: null,
      screenshot_upload_state: null,
      ...overrides.row,
    } as Record<string, unknown>,
  };
  const storedPaths = new Set<string>();
  if (typeof state.row.screenshot_storage_path === "string") {
    storedPaths.add(state.row.screenshot_storage_path);
  }
  const storageApi = {
    createSignedUploadUrl: vi.fn(async () => ({ data: { token: "upload-token" }, error: null })),
    info: vi.fn(async () => ({ data: overrides.info ?? { size: Number(state.row.screenshot_size_bytes ?? 0) }, error: null })),
    download: vi.fn(async () => ({ data: overrides.download ?? new Blob(), error: null })),
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: overrides.signedUrl ?? "https://signed.test/screenshot" }, error: null })),
    list: vi.fn(async (prefix: string) => ({
      data: Array.from(storedPaths)
        .filter((path) => path.startsWith(`${prefix}/`))
        .map((path) => ({ name: path.slice(prefix.length + 1) })),
      error: null,
    })),
    remove: vi.fn(async (paths: string[]) => {
      for (const path of paths) storedPaths.delete(path);
      return { data: [], error: null };
    }),
  };
  const storageFrom = vi.fn(() => storageApi);
  function createQuery() {
    const filters: Array<{ type: "eq" | "is"; column: string; value: unknown }> = [];
    let updatePayload: Record<string, unknown> | null = null;
    const matches = () => filters.every((filter) =>
      filter.type === "is"
        ? state.row[filter.column] === filter.value
        : state.row[filter.column] === filter.value,
    );
    const executeUpdate = () => {
      const matched = matches();
      if (updatePayload && matched) Object.assign(state.row, updatePayload);
      return { data: matched ? { ...state.row } : null, error: null };
    };
    const query = {} as Record<string, ReturnType<typeof vi.fn>> & {
      then?: (resolve: (value: unknown) => unknown) => Promise<unknown>;
    };
    query.select = vi.fn(() => query);
    query.eq = vi.fn((column: string, value: unknown) => {
      filters.push({ type: "eq", column, value });
      return query;
    });
    query.is = vi.fn((column: string, value: unknown) => {
      filters.push({ type: "is", column, value });
      return query;
    });
    query.update = vi.fn((payload: Record<string, unknown>) => {
      updatePayload = payload;
      return query;
    });
    query.maybeSingle = vi.fn(async () => {
      if (updatePayload) return executeUpdate();
      return { data: matches() ? { ...state.row } : null, error: null };
    });
    query.single = vi.fn(async () => {
      if (updatePayload) return executeUpdate();
      return { data: matches() ? { ...state.row } : null, error: null };
    });
    query.then = (resolve) => Promise.resolve(executeUpdate()).then(resolve);
    return query;
  }
  return {
    state,
    from: vi.fn(() => createQuery()),
    storage: { from: storageFrom },
    storageApi,
  };
}

describe("bug report screenshot security contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
  });

  it("uses a fixed server-derived path and rejects invalid declarations", () => {
    expect(buildBugReportScreenshotPath(feedbackId)).toBe(`feedback/${feedbackId}/screenshot`);
    expect(() => validateBugReportScreenshotInput({
      originalName: "capture.svg",
      mimeType: "image/svg+xml",
      sizeBytes: 100,
    })).toThrowError(BugReportScreenshotError);
    expect(() => validateBugReportScreenshotInput({
      originalName: "capture.png",
      mimeType: "image/png",
      sizeBytes: 5 * 1024 * 1024 + 1,
    })).toThrowError(BugReportScreenshotError);
  });

  it("denies another user before creating an upload intent", async () => {
    const supabase = makeSupabase();
    await expect(createBugReportScreenshotUploadIntent(supabase as never, {
      userId: "other-user",
      feedbackId,
      originalName: "capture.png",
      mimeType: "image/png",
      sizeBytes: 100,
    })).rejects.toMatchObject({ code: "forbidden" });
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it("creates an owner-bound signed intent for a Bug only", async () => {
    const supabase = makeSupabase();
    const intent = await createBugReportScreenshotUploadIntent(supabase as never, {
      userId: "owner-1",
      feedbackId,
      originalName: "capture.png",
      mimeType: "image/png",
      sizeBytes: 100,
    });
    expect(intent).toMatchObject({
      feedbackId,
      bucket: BUG_REPORT_SCREENSHOT_BUCKET,
      uploadState: "pending",
    });
    expect((intent as { path: string }).path).toMatch(
      new RegExp(`^feedback/${feedbackId}/screenshot/[0-9a-f-]{36}$`),
    );
    expect(supabase.state.row.screenshot_upload_state).toBe("pending");
    expect(supabase.storageApi.createSignedUploadUrl).toHaveBeenCalledWith(
      (intent as { path: string }).path,
      { upsert: false },
    );
  });

  it("allows only one concurrent pending attempt and leaves the winner authoritative", async () => {
    const supabase = makeSupabase();
    const params = {
      userId: "owner-1",
      feedbackId,
      originalName: "capture.png",
      mimeType: "image/png",
      sizeBytes: 100,
    };

    const results = await Promise.allSettled([
      createBugReportScreenshotUploadIntent(supabase as never, params),
      createBugReportScreenshotUploadIntent(supabase as never, params),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(supabase.storageApi.createSignedUploadUrl).toHaveBeenCalledTimes(1);
    expect(supabase.state.row.screenshot_upload_state).toBe("pending");
  });

  it("uses a new immutable path after a failed attempt and removes the old object", async () => {
    const oldPath = `feedback/${feedbackId}/screenshot/22222222-2222-4222-8222-222222222222`;
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: oldPath,
        screenshot_original_name: "old.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: 100,
        screenshot_upload_state: "failed",
      },
    });
    const intent = await createBugReportScreenshotUploadIntent(supabase as never, {
      userId: "owner-1",
      feedbackId,
      originalName: "retry.png",
      mimeType: "image/png",
      sizeBytes: 100,
    });

    expect((intent as { path: string }).path).not.toBe(oldPath);
    expect(supabase.storageApi.remove).toHaveBeenCalledWith([oldPath]);
    expect(supabase.state.row.screenshot_upload_state).toBe("pending");
  });

  it("rejects content whose bytes do not match the declared image type and cleans it up", async () => {
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: `feedback/${feedbackId}/screenshot`,
        screenshot_original_name: "capture.jpg",
        screenshot_mime_type: "image/jpeg",
        screenshot_size_bytes: 4,
        screenshot_upload_state: "pending",
      },
      info: { size: 4 },
      download: new Blob(["text"]),
    });
    await expect(finalizeBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
    })).rejects.toMatchObject({ code: "storage_invalid" });
    expect(supabase.state.row.screenshot_upload_state).toBeNull();
  });

  it("finalizes valid PNG bytes and lets only the owner or admin obtain a short-lived URL", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: `feedback/${feedbackId}/screenshot`,
        screenshot_original_name: "capture.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: png.byteLength,
        screenshot_upload_state: "pending",
      },
      info: { size: png.byteLength },
      download: new Blob([png]),
    });
    const finalized = await finalizeBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
    });
    expect(finalized.screenshot.uploadState).toBe("ready");

    const read = await getBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
    });
    expect(read.signedUrl).toContain("https://signed.test");
    expect(read.signedUrlExpiresAt).toBeTruthy();

    requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "admin-1" });
    await expect(getBugReportScreenshot(supabase as never, {
      userId: "admin-1",
      feedbackId,
    })).resolves.toMatchObject({ signedUrl: "https://signed.test/screenshot" });

    await expect(getBugReportScreenshot(supabase as never, {
      userId: "other-user",
      feedbackId,
    })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("does not let a stale finalization replace a newer ready attempt", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const oldPath = `feedback/${feedbackId}/screenshot/44444444-4444-4444-8444-444444444444`;
    const newPath = `feedback/${feedbackId}/screenshot/55555555-5555-4555-8555-555555555555`;
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: oldPath,
        screenshot_original_name: "old.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: png.byteLength,
        screenshot_upload_state: "pending",
      },
      info: { size: png.byteLength },
      download: new Blob([png]),
    });
    supabase.storageApi.info.mockImplementationOnce(async () => {
      Object.assign(supabase.state.row, {
        screenshot_storage_path: newPath,
        screenshot_original_name: "new.png",
        screenshot_upload_state: "ready",
      });
      return { data: { size: png.byteLength }, error: null };
    });

    await expect(finalizeBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
    })).rejects.toMatchObject({ code: "storage_error" });
    expect(supabase.state.row.screenshot_storage_path).toBe(newPath);
    expect(supabase.state.row.screenshot_upload_state).toBe("ready");
    expect(supabase.storageApi.remove).toHaveBeenCalledWith([oldPath]);
  });

  it("removes the Storage object before clearing the attachment reference", async () => {
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: `feedback/${feedbackId}/screenshot`,
        screenshot_original_name: "capture.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: 8,
        screenshot_upload_state: "ready",
      },
    });
    await deleteBugReportScreenshot(supabase as never, { userId: "owner-1", feedbackId });
    expect(supabase.state.row.screenshot_storage_path).toBeNull();
    expect(supabase.storage.from).toHaveBeenCalledWith(BUG_REPORT_SCREENSHOT_BUCKET);
    expect(supabase.storageApi.list).toHaveBeenCalled();
  });

  it("cleans orphaned attempt objects when the feedback is deleted", async () => {
    const attemptPath = `feedback/${feedbackId}/screenshot/33333333-3333-4333-8333-333333333333`;
    const supabase = makeSupabase({
      row: {
        screenshot_storage_path: attemptPath,
        screenshot_upload_state: "failed",
      },
    });
    await expect(
      (await import("./bug-report-screenshot")).removeBugReportScreenshotForDeletedReport(
        supabase as never,
        feedbackId,
      ),
    ).resolves.toBeUndefined();
    expect(supabase.storageApi.remove).toHaveBeenCalledWith([attemptPath]);
  });
});
