import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/authz", () => ({ requireAdminAccess: requireAdminAccessMock }));

import {
  buildBugReportScreenshotPath,
  cleanupBugReportScreenshotAttempt,
  createBugReportScreenshotUploadIntent,
  deleteBugReportScreenshot,
  finalizeBugReportScreenshot,
  getBugReportScreenshot,
  validateBugReportScreenshotInput,
  BugReportScreenshotError,
} from "./bug-report-screenshot";
import {
  assertBugReport,
  assertOwnerOrAdmin,
  claimScreenshotUpload,
  clearScreenshotColumns,
  loadReport,
  loadReportForAttempt,
  markScreenshotFailed,
  removeAllBugReportScreenshotObjects,
  removeStorageObject,
  toRecord,
  validateStoredObject,
} from "./bug-report-screenshot-storage";
import { BUG_REPORT_SCREENSHOT_BUCKET } from "./bug-report-screenshot-contract";

const feedbackId = "11111111-1111-4111-8111-111111111111";
const attemptA = "22222222-2222-4222-8222-222222222222";
const attemptB = "33333333-3333-4333-8333-333333333333";

function attemptPath(attemptId: string): string {
  return `feedback/${feedbackId}/screenshot/${attemptId}`;
}

function screenshotRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
    screenshot_storage_path: attemptPath(attemptA),
    screenshot_original_name: "capture.png",
    screenshot_mime_type: "image/png",
    screenshot_size_bytes: 8,
    screenshot_upload_state: "pending",
    ...overrides,
  };
}

type ScreenshotUpdate = {
  payload: Record<string, unknown>;
  filters: readonly { type: "eq" | "is"; column: string; value: unknown }[];
};

function makeFailingQuery(message: string) {
  const query = {} as Record<string, ReturnType<typeof vi.fn>>;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.is = vi.fn(() => query);
  query.update = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => ({ data: null, error: new Error(message) }));
  query.then = vi.fn((resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve({ data: null, error: new Error(message) }).then(resolve, reject));
  return query;
}

function makeSupabase(overrides: {
  row?: Record<string, unknown>;
  info?: Record<string, unknown> | null;
  download?: Blob | null;
  signedUrl?: string;
  beforeUpdate?: (update: ScreenshotUpdate) => Promise<void> | void;
  afterUpdate?: (update: ScreenshotUpdate) => Promise<void> | void;
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
    remove: vi.fn(async (paths: string[]): Promise<{ data: unknown[] | null; error: Error | null }> => {
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
    const executeUpdate = async () => {
      if (updatePayload) {
        const update = { payload: updatePayload, filters: [...filters] };
        await overrides.beforeUpdate?.(update);
        const matched = matches();
        if (matched) Object.assign(state.row, updatePayload);
        await overrides.afterUpdate?.(update);
        return { data: matched ? { ...state.row } : null, error: null };
      }
      const matched = matches();
      return { data: matched ? { ...state.row } : null, error: null };
    };
    const query = {} as Record<string, ReturnType<typeof vi.fn>> & {
      then?: (
        resolve: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise<unknown>;
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
    query.then = (resolve, reject) => executeUpdate().then(resolve, reject);
    return query;
  }
  return {
    state,
    storedPaths,
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
    expect((intent as { attemptId: string }).attemptId).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
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
    const oldPath = attemptPath(attemptA);
    const supabase = makeSupabase({
      row: screenshotRow({
        screenshot_storage_path: oldPath,
        screenshot_original_name: "old.png",
        screenshot_size_bytes: 100,
        screenshot_upload_state: "failed",
      }),
    });
    const intent = await createBugReportScreenshotUploadIntent(supabase as never, {
      userId: "owner-1",
      feedbackId,
      originalName: "retry.png",
      mimeType: "image/png",
      sizeBytes: 100,
    });

    expect((intent as { path: string }).path).not.toBe(oldPath);
    expect((intent as { attemptId: string }).attemptId).toBe(
      (intent as { path: string }).path.split("/").at(-1),
    );
    expect(supabase.storageApi.remove).toHaveBeenCalledWith([oldPath]);
    expect(supabase.state.row.screenshot_upload_state).toBe("pending");
  });

  it("rejects content whose bytes do not match the declared image type and cleans it up", async () => {
    const supabase = makeSupabase({
      row: screenshotRow({
        screenshot_original_name: "capture.jpg",
        screenshot_mime_type: "image/jpeg",
        screenshot_size_bytes: 4,
      }),
      info: { size: 4 },
      download: new Blob(["text"]),
    });
    await expect(finalizeBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
    })).rejects.toMatchObject({ code: "storage_invalid" });
    expect(supabase.state.row.screenshot_upload_state).toBeNull();
  });

  it("finalizes valid PNG bytes and lets only the owner or admin obtain a short-lived URL", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const supabase = makeSupabase({
      row: screenshotRow({ screenshot_size_bytes: png.byteLength }),
      info: { size: png.byteLength },
      download: new Blob([png]),
    });
    const finalized = await finalizeBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
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

  it("fails closed on incomplete records and enforces Bug ownership at the storage boundary", async () => {
    expect(() => toRecord({
      ...screenshotRow(),
      id: feedbackId,
      screenshot_size_bytes: 0,
    } as never)).toThrowError(BugReportScreenshotError);
    expect(() => assertBugReport({ ...screenshotRow(), report_type: "feature" } as never)).toThrowError(BugReportScreenshotError);
    await expect(assertOwnerOrAdmin("other-user", { submitted_by_user_id: "owner-1" } as never)).rejects.toMatchObject({ code: "forbidden" });
    requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "admin-1" });
    await expect(assertOwnerOrAdmin("admin-1", { submitted_by_user_id: "owner-1" } as never)).resolves.toBeUndefined();
  });

  it("covers storage state transitions, conditional cleanup and provider failures", async () => {
    const supabase = makeSupabase({ row: screenshotRow({ screenshot_upload_state: "pending" }) });
    expect(await removeStorageObject(supabase as never, attemptPath(attemptA))).toBe(true);
    supabase.storageApi.remove.mockResolvedValueOnce({ data: null, error: new Error("remove failed") });
    expect(await removeStorageObject(supabase as never, attemptPath(attemptA))).toBe(false);

    expect(await markScreenshotFailed(supabase as never, feedbackId, attemptPath(attemptA))).toBe(true);
    expect(await markScreenshotFailed(supabase as never, feedbackId, attemptPath(attemptA))).toBe(false);
    const cleared = await clearScreenshotColumns(supabase as never, feedbackId, { path: attemptPath(attemptA), state: "failed" });
    expect(cleared).toBe(true);

    const failedClaim = makeSupabase({ row: screenshotRow({ screenshot_upload_state: "failed" }) });
    await expect(claimScreenshotUpload(failedClaim as never, {
      feedbackId,
      expectedState: "failed",
      path: attemptPath(attemptB),
      originalName: "retry.png",
      mimeType: "image/png",
      sizeBytes: 8,
    })).resolves.toMatchObject({ screenshot_upload_state: "pending" });

    const empty = makeSupabase();
    await expect(removeAllBugReportScreenshotObjects(empty as never, feedbackId)).resolves.toBe(true);
    empty.storageApi.list.mockResolvedValueOnce({ data: null, error: new Error("list failed") } as never);
    await expect(removeAllBugReportScreenshotObjects(empty as never, feedbackId)).resolves.toBe(false);
  });

  it("rejects malformed stored objects and missing report/attempt rows", async () => {
    const malformed = makeSupabase({ row: screenshotRow({ screenshot_storage_path: null }) });
    await expect(validateStoredObject(malformed as never, malformed.state.row as never)).rejects.toMatchObject({ code: "storage_invalid" });

    const infoFailure = makeSupabase({ row: screenshotRow({ screenshot_size_bytes: 8 }), info: null });
    infoFailure.storageApi.info.mockResolvedValueOnce({ data: null, error: new Error("info failed") } as never);
    await expect(validateStoredObject(infoFailure as never, infoFailure.state.row as never)).rejects.toMatchObject({ code: "storage_missing" });

    const sizeMismatch = makeSupabase({ row: screenshotRow({ screenshot_size_bytes: 8 }), info: { size: 7 } });
    await expect(validateStoredObject(sizeMismatch as never, sizeMismatch.state.row as never)).rejects.toMatchObject({ code: "storage_invalid" });

    const downloadFailure = makeSupabase({ row: screenshotRow({ screenshot_size_bytes: 8 }), info: { size: 8 } });
    downloadFailure.storageApi.download.mockResolvedValueOnce({ data: null, error: new Error("download failed") } as never);
    await expect(validateStoredObject(downloadFailure as never, downloadFailure.state.row as never)).rejects.toMatchObject({ code: "storage_missing" });

    const invalidId = makeSupabase();
    await expect(loadReport(invalidId as never, " ")).rejects.toMatchObject({ code: "validation" });
    const missingQuery = {
      select: vi.fn(() => missingQuery),
      eq: vi.fn(() => missingQuery),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    invalidId.from = vi.fn(() => missingQuery) as never;
    await expect(loadReport(invalidId as never, feedbackId)).rejects.toMatchObject({ code: "not_found" });
    await expect(loadReportForAttempt(invalidId as never, feedbackId, attemptA)).rejects.toMatchObject({ code: "not_found" });
  });

  it("keeps ready and pending intent states idempotent and exclusive", async () => {
    const ready = makeSupabase({ row: { screenshot_upload_state: "ready", screenshot_storage_path: attemptPath(attemptA) } });
    await expect(createBugReportScreenshotUploadIntent(ready as never, {
      userId: "owner-1", feedbackId, originalName: "capture.png", mimeType: "image/png", sizeBytes: 8,
    })).resolves.toEqual({ feedbackId, uploadState: "ready" });

    const pending = makeSupabase({ row: { screenshot_upload_state: "pending", screenshot_storage_path: attemptPath(attemptA) } });
    await expect(createBugReportScreenshotUploadIntent(pending as never, {
      userId: "owner-1", feedbackId, originalName: "capture.png", mimeType: "image/png", sizeBytes: 8,
    })).rejects.toMatchObject({ code: "storage_error" });
  });

  it("cleans up a failed upload-intent transition when signing fails", async () => {
    const supabase = makeSupabase();
    supabase.storageApi.createSignedUploadUrl.mockResolvedValueOnce({ data: null, error: new Error("sign failed") } as never);
    await expect(createBugReportScreenshotUploadIntent(supabase as never, {
      userId: "owner-1", feedbackId, originalName: "capture.png", mimeType: "image/png", sizeBytes: 8,
    })).rejects.toMatchObject({ code: "storage_error" });
    expect(supabase.state.row.screenshot_upload_state).toBeNull();
  });

  it("handles finalized, absent and superseded attempts without overwriting the winner", async () => {
    const ready = makeSupabase({ row: screenshotRow({ screenshot_upload_state: "ready" }) });
    await expect(finalizeBugReportScreenshot(ready as never, { userId: "owner-1", feedbackId, attemptId: attemptA }))
      .resolves.toMatchObject({ alreadyReady: true });

    const absent = makeSupabase({ row: screenshotRow({ screenshot_upload_state: "failed", screenshot_storage_path: null }) });
    await expect(finalizeBugReportScreenshot(absent as never, { userId: "owner-1", feedbackId, attemptId: attemptA }))
      .rejects.toMatchObject({ code: "not_found" });

    const superseded = makeSupabase({
      row: screenshotRow({ screenshot_storage_path: attemptPath(attemptA), screenshot_size_bytes: 8 }),
      beforeUpdate: ({ payload }) => {
        if (payload.screenshot_upload_state === "ready") superseded.state.row.screenshot_storage_path = attemptPath(attemptB);
      },
    });
    const oldPath = attemptPath(attemptA);
    superseded.storageApi.info.mockResolvedValueOnce({ data: { size: 8 }, error: null });
    superseded.storageApi.download.mockResolvedValueOnce({ data: new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]), error: null });
    await expect(finalizeBugReportScreenshot(superseded as never, { userId: "owner-1", feedbackId, attemptId: attemptA }))
      .rejects.toMatchObject({ code: "storage_error" });
    expect(superseded.storageApi.remove).toHaveBeenCalledWith([oldPath]);
  });

  it("maps signed-read, delete and cleanup failures without a false success", async () => {
    const ready = makeSupabase({ row: screenshotRow({ screenshot_upload_state: "ready" }) });
    ready.storageApi.createSignedUrl.mockResolvedValueOnce({ data: null, error: new Error("signed read failed") } as never);
    await expect(getBugReportScreenshot(ready as never, { userId: "owner-1", feedbackId })).rejects.toMatchObject({ code: "storage_error" });

    const deletion = makeSupabase({ row: screenshotRow({ screenshot_upload_state: "ready" }) });
    deletion.storageApi.list.mockResolvedValueOnce({ data: [], error: null });
    deletion.storageApi.remove.mockResolvedValueOnce({ data: null, error: new Error("delete failed") });
    await expect(deleteBugReportScreenshot(deletion as never, { userId: "owner-1", feedbackId })).rejects.toMatchObject({ code: "storage_error" });

    const readyCleanup = makeSupabase({ row: screenshotRow({ screenshot_upload_state: "ready" }) });
    await expect(cleanupBugReportScreenshotAttempt(readyCleanup as never, { userId: "owner-1", feedbackId, attemptId: attemptA })).rejects.toMatchObject({ code: "not_found" });
  });

  it("fails closed for storage query errors and invalid provider metadata", async () => {
    const failing = makeSupabase();
    const query = makeFailingQuery("database unavailable");
    failing.from = vi.fn(() => query) as never;
    await expect(loadReport(failing as never, feedbackId)).rejects.toMatchObject({ code: "storage_error" });
    await expect(loadReportForAttempt(failing as never, feedbackId, attemptA)).rejects.toMatchObject({ code: "storage_error" });
    await expect(clearScreenshotColumns(failing as never, feedbackId)).rejects.toMatchObject({ code: "storage_error" });
    await expect(markScreenshotFailed(failing as never, feedbackId, attemptPath(attemptA))).rejects.toMatchObject({ code: "storage_error" });
    await expect(claimScreenshotUpload(failing as never, {
      feedbackId,
      expectedState: null,
      path: attemptPath(attemptA),
      originalName: "capture.png",
      mimeType: "image/png",
      sizeBytes: 8,
    })).rejects.toMatchObject({ code: "storage_error" });

    const invalidInfo = makeSupabase({ row: screenshotRow({ screenshot_size_bytes: 8 }), info: { size: 0 } });
    await expect(validateStoredObject(invalidInfo as never, invalidInfo.state.row as never)).rejects.toMatchObject({ code: "storage_invalid" });
    const invalidDownload = makeSupabase({ row: screenshotRow({ screenshot_size_bytes: 8 }), info: { size: 8 } });
    invalidDownload.storageApi.download.mockResolvedValueOnce({ data: new Blob([]), error: null });
    await expect(validateStoredObject(invalidDownload as never, invalidDownload.state.row as never)).rejects.toMatchObject({ code: "storage_invalid" });
  });

  it("does not delete an active replacement and handles cleanup races explicitly", async () => {
    const replacement = makeSupabase({
      row: screenshotRow({ screenshot_upload_state: "failed", screenshot_storage_path: attemptPath(attemptB) }),
    });
    replacement.storageApi.remove.mockResolvedValueOnce({ data: [], error: null });
    await expect(cleanupBugReportScreenshotAttempt(replacement as never, {
      userId: "owner-1", feedbackId, attemptId: attemptA,
    })).rejects.toMatchObject({ code: "not_found" });
    expect(replacement.storageApi.remove).not.toHaveBeenCalledWith([attemptPath(attemptB)]);

    const noLongerPresent = makeSupabase({ row: screenshotRow({ screenshot_upload_state: "pending" }) });
    noLongerPresent.from = vi.fn(() => {
      const query = makeFailingQuery("gone");
      query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
      query.then = vi.fn((resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve));
      return query;
    }) as never;
    await expect(cleanupBugReportScreenshotAttempt(noLongerPresent as never, {
      userId: "owner-1", feedbackId, attemptId: attemptA,
    })).rejects.toMatchObject({ code: "not_found" });
  });

});
