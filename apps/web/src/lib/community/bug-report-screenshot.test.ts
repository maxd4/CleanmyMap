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
import { BUG_REPORT_SCREENSHOT_BUCKET } from "./bug-report-screenshot-contract";

const feedbackId = "11111111-1111-4111-8111-111111111111";
const attemptA = "22222222-2222-4222-8222-222222222222";
const attemptB = "33333333-3333-4333-8333-333333333333";

function attemptPath(attemptId: string): string {
  return `feedback/${feedbackId}/screenshot/${attemptId}`;
}

type ScreenshotUpdate = {
  payload: Record<string, unknown>;
  filters: readonly { type: "eq" | "is"; column: string; value: unknown }[];
};

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
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
    expect((intent as { attemptId: string }).attemptId).toBe(
      (intent as { path: string }).path.split("/").at(-1),
    );
    expect(supabase.storageApi.remove).toHaveBeenCalledWith([oldPath]);
    expect(supabase.state.row.screenshot_upload_state).toBe("pending");
  });

  it("rejects content whose bytes do not match the declared image type and cleans it up", async () => {
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: attemptPath(attemptA),
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
      attemptId: attemptA,
    })).rejects.toMatchObject({ code: "storage_invalid" });
    expect(supabase.state.row.screenshot_upload_state).toBeNull();
  });

  it("finalizes valid PNG bytes and lets only the owner or admin obtain a short-lived URL", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: attemptPath(attemptA),
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

});

describe("bug report screenshot concurrency contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
  });

  it("does not let cleanup remove A after finalization has won its transition", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const failedUpdateEntered = deferred<void>();
    const releaseFailedUpdate = deferred<void>();
    let failedUpdateObserved = false;
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: attemptPath(attemptA),
        screenshot_original_name: "capture.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: png.byteLength,
        screenshot_upload_state: "pending",
      },
      info: { size: png.byteLength },
      download: new Blob([png]),
      beforeUpdate: async ({ payload }) => {
        if (payload.screenshot_upload_state === "failed" && !failedUpdateObserved) {
          failedUpdateObserved = true;
          failedUpdateEntered.resolve();
          await releaseFailedUpdate.promise;
        }
      },
    });

    const cleanup = cleanupBugReportScreenshotAttempt(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
    });
    await failedUpdateEntered.promise;

    await expect(finalizeBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
    })).resolves.toMatchObject({
      screenshot: { uploadState: "ready" },
    });

    releaseFailedUpdate.resolve();
    await expect(cleanup).rejects.toMatchObject({ code: "not_found" });
    expect(supabase.storageApi.remove).not.toHaveBeenCalled();
    expect(supabase.state.row.screenshot_upload_state).toBe("ready");
  });

  it("does not let finalization reach ready after cleanup has won its transition", async () => {
    const failedUpdateEntered = deferred<void>();
    const releaseFailedUpdate = deferred<void>();
    let failedUpdateObserved = false;
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: attemptPath(attemptA),
        screenshot_original_name: "capture.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: 8,
        screenshot_upload_state: "pending",
      },
      afterUpdate: async ({ payload }) => {
        if (payload.screenshot_upload_state === "failed" && !failedUpdateObserved) {
          failedUpdateObserved = true;
          failedUpdateEntered.resolve();
          await releaseFailedUpdate.promise;
        }
      },
    });

    const cleanup = cleanupBugReportScreenshotAttempt(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
    });
    await failedUpdateEntered.promise;

    await expect(finalizeBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
    })).rejects.toMatchObject({ code: "not_found" });

    releaseFailedUpdate.resolve();
    await cleanup;
    expect(supabase.state.row.screenshot_upload_state).toBeNull();
    expect(supabase.storageApi.remove).toHaveBeenCalledWith([attemptPath(attemptA)]);
  });

  it("keeps a ready capture when one of two finalizations fails validation", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const failedUpdateEntered = deferred<void>();
    const releaseFailedUpdate = deferred<void>();
    const readyUpdateEntered = deferred<void>();
    let failedUpdateObserved = false;
    let readyUpdateObserved = false;
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: attemptPath(attemptA),
        screenshot_original_name: "capture.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: png.byteLength,
        screenshot_upload_state: "pending",
      },
      info: { size: png.byteLength },
      download: new Blob([png]),
      beforeUpdate: async ({ payload }) => {
        if (payload.screenshot_upload_state === "failed" && !failedUpdateObserved) {
          failedUpdateObserved = true;
          failedUpdateEntered.resolve();
          await releaseFailedUpdate.promise;
        }
      },
      afterUpdate: ({ payload }) => {
        if (payload.screenshot_upload_state === "ready" && !readyUpdateObserved) {
          readyUpdateObserved = true;
          readyUpdateEntered.resolve();
        }
      },
    });
    supabase.storageApi.download
      .mockImplementationOnce(async () => ({ data: new Blob(["invalid"]), error: null }))
      .mockImplementationOnce(async () => ({ data: new Blob([png]), error: null }));

    const finalizations = [
      finalizeBugReportScreenshot(supabase as never, {
        userId: "owner-1",
        feedbackId,
        attemptId: attemptA,
      }),
      finalizeBugReportScreenshot(supabase as never, {
        userId: "owner-1",
        feedbackId,
        attemptId: attemptA,
      }),
    ];
    await failedUpdateEntered.promise;
    await readyUpdateEntered.promise;
    releaseFailedUpdate.resolve();

    const results = await Promise.allSettled(finalizations);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      status: "rejected",
      reason: { code: "storage_invalid" },
    });
    expect(supabase.state.row.screenshot_upload_state).toBe("ready");
    expect(supabase.storageApi.remove).not.toHaveBeenCalled();
  });

  it("does not let a stale finalization replace a newer ready attempt", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const oldPath = attemptPath(attemptA);
    const newPath = attemptPath(attemptB);
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
      attemptId: attemptA,
    })).rejects.toMatchObject({ code: "storage_error" });
    expect(supabase.state.row.screenshot_storage_path).toBe(newPath);
    expect(supabase.state.row.screenshot_upload_state).toBe("ready");
    expect(supabase.state.row.screenshot_original_name).toBe("new.png");
    expect(supabase.state.row.screenshot_size_bytes).toBe(png.byteLength);
    expect(supabase.storageApi.remove).toHaveBeenCalledWith([oldPath]);
  });

  it("ignores a late finalization for A while B is pending", async () => {
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: attemptPath(attemptB),
        screenshot_original_name: "b.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: 12,
        screenshot_upload_state: "pending",
      },
    });

    await expect(finalizeBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
    })).rejects.toMatchObject({ code: "not_found" });
    expect(supabase.state.row).toMatchObject({
      screenshot_storage_path: attemptPath(attemptB),
      screenshot_upload_state: "pending",
      screenshot_size_bytes: 12,
    });
    expect(supabase.storageApi.info).not.toHaveBeenCalled();
    expect(supabase.storageApi.download).not.toHaveBeenCalled();
    expect(supabase.storageApi.remove).not.toHaveBeenCalled();
  });

  it("ignores a late finalization for A after B is ready", async () => {
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: attemptPath(attemptB),
        screenshot_original_name: "b.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: 12,
        screenshot_upload_state: "ready",
      },
    });

    await expect(finalizeBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
    })).rejects.toMatchObject({ code: "not_found" });
    expect(supabase.state.row).toMatchObject({
      screenshot_storage_path: attemptPath(attemptB),
      screenshot_upload_state: "ready",
      screenshot_original_name: "b.png",
      screenshot_size_bytes: 12,
    });
    expect(supabase.storageApi.info).not.toHaveBeenCalled();
    expect(supabase.storageApi.remove).not.toHaveBeenCalled();
  });

  it("cleans a failed attempt only when its path is still current", async () => {
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: attemptPath(attemptA),
        screenshot_original_name: "a.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: 12,
        screenshot_upload_state: "failed",
      },
    });

    await expect(cleanupBugReportScreenshotAttempt(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
    })).resolves.toBeUndefined();
    expect(supabase.storageApi.remove).toHaveBeenCalledWith([attemptPath(attemptA)]);
    expect(supabase.state.row.screenshot_storage_path).toBeNull();
    expect(supabase.state.row.screenshot_upload_state).toBeNull();
  });

  it("does not let late cleanup for A touch pending or ready B", async () => {
    for (const state of ["pending", "ready"] as const) {
      const supabase = makeSupabase({
        row: {
          screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
          screenshot_storage_path: attemptPath(attemptB),
          screenshot_original_name: "b.png",
          screenshot_mime_type: "image/png",
          screenshot_size_bytes: 12,
          screenshot_upload_state: state,
        },
      });

      await expect(cleanupBugReportScreenshotAttempt(supabase as never, {
        userId: "owner-1",
        feedbackId,
        attemptId: attemptA,
      })).rejects.toMatchObject({ code: "not_found" });
      expect(supabase.state.row).toMatchObject({
        screenshot_storage_path: attemptPath(attemptB),
        screenshot_upload_state: state,
        screenshot_original_name: "b.png",
        screenshot_size_bytes: 12,
      });
      expect(supabase.storageApi.remove).not.toHaveBeenCalled();
    }
  });

  it("does not let cleanup of A clear a later B after A became failed", async () => {
    const oldPath = attemptPath(attemptA);
    const failedUpdateEntered = deferred<void>();
    const releaseFailedUpdate = deferred<void>();
    let failedUpdateObserved = false;
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: oldPath,
        screenshot_original_name: "a.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: 8,
        screenshot_upload_state: "pending",
      },
      afterUpdate: async ({ payload }) => {
        if (payload.screenshot_upload_state === "failed" && !failedUpdateObserved) {
          failedUpdateObserved = true;
          failedUpdateEntered.resolve();
          await releaseFailedUpdate.promise;
        }
      },
    });

    const cleanup = cleanupBugReportScreenshotAttempt(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
    });
    await failedUpdateEntered.promise;

    const intent = await createBugReportScreenshotUploadIntent(supabase as never, {
      userId: "owner-1",
      feedbackId,
      originalName: "b.png",
      mimeType: "image/png",
      sizeBytes: 12,
    });
    const newPath = (intent as { path: string }).path;
    Object.assign(supabase.state.row, {
      screenshot_original_name: "b.png",
      screenshot_size_bytes: 12,
      screenshot_upload_state: "ready",
    });
    supabase.state.row.screenshot_storage_path = newPath;
    supabase.storedPaths.add(newPath);

    releaseFailedUpdate.resolve();
    await cleanup;
    expect(supabase.state.row).toMatchObject({
      screenshot_storage_path: newPath,
      screenshot_upload_state: "ready",
      screenshot_original_name: "b.png",
      screenshot_size_bytes: 12,
    });
    expect(supabase.storedPaths.has(newPath)).toBe(true);
    expect(supabase.storageApi.remove).not.toHaveBeenCalledWith([newPath]);
  });

  it("keeps a failed state explicit when Storage cleanup fails", async () => {
    const path = attemptPath(attemptA);
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: path,
        screenshot_original_name: "capture.png",
        screenshot_mime_type: "image/png",
        screenshot_size_bytes: 8,
        screenshot_upload_state: "pending",
      },
    });
    supabase.storageApi.remove.mockImplementation(async () => ({
      data: null,
      error: new Error("storage unavailable"),
    }));

    await expect(cleanupBugReportScreenshotAttempt(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: attemptA,
    })).rejects.toMatchObject({ code: "storage_error" });
    expect(supabase.state.row).toMatchObject({
      screenshot_storage_path: path,
      screenshot_upload_state: "failed",
    });
  });

  it("rejects absent or malformed attempt identifiers before Storage access", async () => {
    const supabase = makeSupabase({
      row: {
        screenshot_storage_path: attemptPath(attemptB),
        screenshot_upload_state: "pending",
      },
    });
    await expect(finalizeBugReportScreenshot(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: "not-an-attempt",
    })).rejects.toMatchObject({ code: "validation" });
    await expect(cleanupBugReportScreenshotAttempt(supabase as never, {
      userId: "owner-1",
      feedbackId,
      attemptId: undefined as never,
    })).rejects.toMatchObject({ code: "validation" });
    expect(supabase.storageApi.info).not.toHaveBeenCalled();
    expect(supabase.storageApi.remove).not.toHaveBeenCalled();
  });

  it("removes the Storage object before clearing the attachment reference", async () => {
    const supabase = makeSupabase({
      row: {
        screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
        screenshot_storage_path: attemptPath(attemptA),
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
    const orphanPath = attemptPath(attemptB);
    const supabase = makeSupabase({
      row: {
        screenshot_storage_path: orphanPath,
        screenshot_upload_state: "failed",
      },
    });
    await expect(
      (await import("./bug-report-screenshot")).removeBugReportScreenshotForDeletedReport(
        supabase as never,
        feedbackId,
      ),
    ).resolves.toBeUndefined();
    expect(supabase.storageApi.remove).toHaveBeenCalledWith([orphanPath]);
  });
});
