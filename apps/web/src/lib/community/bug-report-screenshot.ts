import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BUG_REPORT_SCREENSHOT_BUCKET,
  BUG_REPORT_SCREENSHOT_SIGNED_URL_TTL_SECONDS,
  type BugReportScreenshotReadItem,
  type BugReportScreenshotRecord,
} from "./bug-report-screenshot-contract";
import {
  assertFeedbackId,
  buildBugReportScreenshotAttemptPath,
  BugReportScreenshotError,
  validateBugReportScreenshotInput,
} from "./bug-report-screenshot-validation";
import {
  assertBugReport,
  assertOwner,
  assertOwnerOrAdmin,
  BUG_REPORT_SCREENSHOT_COLUMNS,
  type BugReportScreenshotRow,
  clearScreenshotColumns,
  claimScreenshotUpload,
  loadReport,
  loadReportForAttempt,
  markFailedAndCleanup,
  markScreenshotFailed,
  removeAllBugReportScreenshotObjects,
  removeStorageObject,
  storageError,
  toRecord,
  validateStoredObject,
} from "./bug-report-screenshot-storage";

export {
  BugReportScreenshotError,
  buildBugReportScreenshotPath,
  validateBugReportScreenshotInput,
} from "./bug-report-screenshot-validation";

export type BugReportScreenshotUploadIntent = {
  feedbackId: string;
  attemptId: string;
  bucket: typeof BUG_REPORT_SCREENSHOT_BUCKET;
  path: string;
  token: string;
  uploadState: "pending";
};

export async function createBugReportScreenshotUploadIntent(
  supabase: SupabaseClient,
  params: {
    userId: string;
    feedbackId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    width?: number | null;
    height?: number | null;
  },
): Promise<BugReportScreenshotUploadIntent | { feedbackId: string; uploadState: "ready" }> {
  validateBugReportScreenshotInput(params);
  const row = await loadReport(supabase, params.feedbackId);
  await assertOwner(params.userId, row);
  assertBugReport(row);

  if (row.screenshot_upload_state === "ready") {
    return { feedbackId: params.feedbackId, uploadState: "ready" };
  }
  if (row.screenshot_upload_state === "pending") {
    throw storageError("Une capture est déjà en cours de préparation.");
  }

  const attemptId = crypto.randomUUID();
  const path = buildBugReportScreenshotAttemptPath(params.feedbackId, attemptId);
  const updated = await claimScreenshotUpload(supabase, {
    feedbackId: params.feedbackId,
    expectedState: row.screenshot_upload_state,
    path,
    originalName: params.originalName.trim(),
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
    width: params.width,
    height: params.height,
  });
  if (!updated) {
    const latest = await loadReport(supabase, params.feedbackId);
    if (latest.screenshot_upload_state === "ready") {
      return { feedbackId: params.feedbackId, uploadState: "ready" };
    }
    throw storageError("Une autre tentative de capture est déjà active.");
  }

  if (row.screenshot_storage_path) {
    const oldObjectRemoved = await removeStorageObject(
      supabase,
      row.screenshot_storage_path,
    ).catch(() => false);
    if (!oldObjectRemoved) {
      await markFailedAndCleanup(supabase, params.feedbackId, attemptId, path);
      throw storageError("La capture précédente ne peut pas être nettoyée.");
    }
  }

  const signedUpload = await supabase.storage
    .from(BUG_REPORT_SCREENSHOT_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (signedUpload.error || !signedUpload.data?.token) {
    await markFailedAndCleanup(supabase, params.feedbackId, attemptId, path);
    throw storageError("La capture ne peut pas recevoir son accès d'upload.");
  }

  return {
    feedbackId: params.feedbackId,
    attemptId,
    bucket: BUG_REPORT_SCREENSHOT_BUCKET,
    path,
    token: signedUpload.data.token,
    uploadState: "pending",
  };
}

export async function finalizeBugReportScreenshot(
  supabase: SupabaseClient,
  params: { userId: string; feedbackId: string; attemptId: string },
): Promise<{ screenshot: BugReportScreenshotRecord; alreadyReady: boolean }> {
  const row = await loadReportForAttempt(supabase, params.feedbackId, params.attemptId);
  await assertOwner(params.userId, row);
  assertBugReport(row);
  if (row.screenshot_upload_state === "ready") {
    return { screenshot: toRecord(row), alreadyReady: true };
  }
  if (row.screenshot_upload_state !== "pending" || !row.screenshot_storage_path) {
    throw new BugReportScreenshotError("Aucune capture en attente n'a été trouvée.", "not_found");
  }

  try {
    await validateStoredObject(supabase, row);
  } catch (error) {
    await markFailedAndCleanup(
      supabase,
      params.feedbackId,
      params.attemptId,
      row.screenshot_storage_path,
    );
    throw error;
  }

  const updated = await supabase
    .from("community_bug_reports")
    .update({ screenshot_upload_state: "ready" })
    .eq("id", params.feedbackId)
    .eq("screenshot_upload_state", "pending")
    .eq("screenshot_storage_path", row.screenshot_storage_path)
    .select(BUG_REPORT_SCREENSHOT_COLUMNS)
    .maybeSingle();
  if (updated.error) {
    throw storageError("La capture ne peut pas être finalisée.");
  }
  if (!updated.data) {
    let latest: Awaited<ReturnType<typeof loadReport>> | null = null;
    try {
      latest = await loadReport(supabase, params.feedbackId);
    } catch (error) {
      if (!(error instanceof BugReportScreenshotError) || error.code !== "not_found") {
        throw error;
      }
    }
    if (!latest || latest.screenshot_storage_path !== row.screenshot_storage_path) {
      await removeStorageObject(supabase, row.screenshot_storage_path).catch(() => undefined);
    }
    throw storageError("La capture ne peut pas être finalisée.");
  }
  return {
    screenshot: toRecord(updated.data as unknown as BugReportScreenshotRow),
    alreadyReady: false,
  };
}

export async function getBugReportScreenshot(
  supabase: SupabaseClient,
  params: { userId: string; feedbackId: string },
): Promise<BugReportScreenshotReadItem> {
  const row = await loadReport(supabase, params.feedbackId);
  await assertOwnerOrAdmin(params.userId, row);
  assertBugReport(row);
  if (row.screenshot_upload_state !== "ready") {
    throw new BugReportScreenshotError("Aucune capture prête n'est disponible.", "not_found");
  }
  const record = toRecord(row);
  const signed = await supabase.storage
    .from(BUG_REPORT_SCREENSHOT_BUCKET)
    .createSignedUrl(record.storagePath, BUG_REPORT_SCREENSHOT_SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    throw storageError("La capture ne peut pas être chargée.");
  }
  return {
    ...record,
    signedUrl: signed.data.signedUrl,
    signedUrlExpiresAt: new Date(
      Date.now() + BUG_REPORT_SCREENSHOT_SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString(),
  };
}

export async function deleteBugReportScreenshot(
  supabase: SupabaseClient,
  params: { userId: string; feedbackId: string },
): Promise<void> {
  const row = await loadReport(supabase, params.feedbackId);
  await assertOwner(params.userId, row);
  const removed = await removeAllBugReportScreenshotObjects(
    supabase,
    params.feedbackId,
    row.screenshot_storage_path,
  );
  if (!removed) {
    throw storageError("La capture ne peut pas être supprimée.");
  }
  if (row.screenshot_storage_path) {
    await clearScreenshotColumns(supabase, params.feedbackId);
  }
}

export async function cleanupBugReportScreenshotAttempt(
  supabase: SupabaseClient,
  params: { userId: string; feedbackId: string; attemptId: string },
): Promise<void> {
  const row = await loadReportForAttempt(supabase, params.feedbackId, params.attemptId);
  await assertOwner(params.userId, row);
  assertBugReport(row);
  if (
    !row.screenshot_storage_path ||
    (row.screenshot_upload_state !== "pending" && row.screenshot_upload_state !== "failed")
  ) {
    throw new BugReportScreenshotError("La tentative de capture n'est plus nettoyable.", "not_found");
  }

  if (row.screenshot_upload_state === "pending") {
    const markedFailed = await markScreenshotFailed(
      supabase,
      params.feedbackId,
      row.screenshot_storage_path,
    );
    if (!markedFailed) {
      const latest = await loadReportForAttempt(supabase, params.feedbackId, params.attemptId);
      if (latest.screenshot_upload_state !== "failed") {
        throw new BugReportScreenshotError(
          "La tentative de capture n'est plus nettoyable.",
          "not_found",
        );
      }
    }
  }

  const removed = await removeStorageObject(supabase, row.screenshot_storage_path).catch(() => false);
  if (!removed) {
    throw storageError("La capture échouée ne peut pas être supprimée.");
  }
  const cleared = await clearScreenshotColumns(supabase, params.feedbackId, {
    path: row.screenshot_storage_path,
    state: "failed",
  });
  if (!cleared) return;
}

export async function removeBugReportScreenshotForDeletedReport(
  supabase: SupabaseClient,
  feedbackId: string,
): Promise<void> {
  assertFeedbackId(feedbackId);
  let row: Awaited<ReturnType<typeof loadReport>>;
  try {
    row = await loadReport(supabase, feedbackId);
  } catch (error) {
    if (!(error instanceof BugReportScreenshotError) || error.code !== "not_found") {
      throw error;
    }
    if (!(await removeAllBugReportScreenshotObjects(supabase, feedbackId))) {
      throw storageError("Les captures liées au feedback ne peuvent pas être supprimées.");
    }
    return;
  }
  const removed = await removeAllBugReportScreenshotObjects(
    supabase,
    feedbackId,
    row.screenshot_storage_path,
  );
  if (!removed) {
    throw storageError("La capture liée au feedback ne peut pas être supprimée.");
  }
}
