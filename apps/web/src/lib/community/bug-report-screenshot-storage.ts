import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminAccess } from "@/lib/authz";
import {
  BUG_REPORT_SCREENSHOT_BUCKET,
  BUG_REPORT_SCREENSHOT_MAX_SIZE_BYTES,
  type BugReportScreenshotMimeType,
  type BugReportScreenshotRecord,
  type BugReportScreenshotUploadState,
} from "./bug-report-screenshot-contract";
import {
  assertFeedbackId,
  buildBugReportScreenshotAttemptPath,
  buildBugReportScreenshotPrefix,
  BugReportScreenshotError,
  detectImageMimeType,
} from "./bug-report-screenshot-validation";

export const BUG_REPORT_SCREENSHOT_COLUMNS = [
  "id",
  "submitted_by_user_id",
  "report_type",
  "screenshot_storage_bucket",
  "screenshot_storage_path",
  "screenshot_original_name",
  "screenshot_mime_type",
  "screenshot_size_bytes",
  "screenshot_width",
  "screenshot_height",
  "screenshot_upload_state",
].join(", ");

export type BugReportScreenshotRow = {
  id: string;
  submitted_by_user_id: string;
  report_type: string;
  screenshot_storage_bucket: typeof BUG_REPORT_SCREENSHOT_BUCKET | null;
  screenshot_storage_path: string | null;
  screenshot_original_name: string | null;
  screenshot_mime_type: BugReportScreenshotMimeType | null;
  screenshot_size_bytes: number | null;
  screenshot_width: number | null;
  screenshot_height: number | null;
  screenshot_upload_state: BugReportScreenshotUploadState | null;
};

export function toRecord(row: BugReportScreenshotRow): BugReportScreenshotRecord {
  if (
    row.screenshot_storage_bucket !== BUG_REPORT_SCREENSHOT_BUCKET ||
    !row.screenshot_storage_path ||
    !row.screenshot_original_name ||
    !row.screenshot_mime_type ||
    !row.screenshot_size_bytes ||
    !row.screenshot_upload_state
  ) {
    throw new BugReportScreenshotError("Les métadonnées de capture sont incomplètes.", "storage_error");
  }
  return {
    feedbackId: row.id,
    storageBucket: row.screenshot_storage_bucket,
    storagePath: row.screenshot_storage_path,
    originalName: row.screenshot_original_name,
    mimeType: row.screenshot_mime_type,
    sizeBytes: row.screenshot_size_bytes,
    width: row.screenshot_width,
    height: row.screenshot_height,
    uploadState: row.screenshot_upload_state,
  };
}

export async function loadReport(
  supabase: SupabaseClient,
  feedbackId: string,
): Promise<BugReportScreenshotRow> {
  assertFeedbackId(feedbackId);
  const result = await supabase
    .from("community_bug_reports")
    .select(BUG_REPORT_SCREENSHOT_COLUMNS)
    .eq("id", feedbackId)
    .maybeSingle();
  if (result.error) {
    throw new BugReportScreenshotError("Le feedback ne peut pas être vérifié.", "storage_error");
  }
  if (!result.data) {
    throw new BugReportScreenshotError("Feedback introuvable.", "not_found");
  }
  return result.data as unknown as BugReportScreenshotRow;
}

export async function loadReportForAttempt(
  supabase: SupabaseClient,
  feedbackId: string,
  attemptId: string,
): Promise<BugReportScreenshotRow> {
  const path = buildBugReportScreenshotAttemptPath(feedbackId, attemptId);
  const result = await supabase
    .from("community_bug_reports")
    .select(BUG_REPORT_SCREENSHOT_COLUMNS)
    .eq("id", feedbackId)
    .eq("screenshot_storage_path", path)
    .maybeSingle();
  if (result.error) {
    throw new BugReportScreenshotError("La tentative de capture ne peut pas être vérifiée.", "storage_error");
  }
  if (!result.data) {
    throw new BugReportScreenshotError("La tentative de capture n'est plus active.", "not_found");
  }
  return result.data as unknown as BugReportScreenshotRow;
}

export async function assertOwner(
  userId: string,
  row: BugReportScreenshotRow,
): Promise<void> {
  if (row.submitted_by_user_id === userId) return;
  throw new BugReportScreenshotError("Accès refusé.", "forbidden");
}

export async function assertOwnerOrAdmin(
  userId: string,
  row: BugReportScreenshotRow,
): Promise<void> {
  if (row.submitted_by_user_id === userId) return;
  const adminAccess = await requireAdminAccess();
  if (!adminAccess.ok) {
    throw new BugReportScreenshotError("Accès refusé.", "forbidden");
  }
}

export function assertBugReport(row: BugReportScreenshotRow): void {
  if (row.report_type !== "bug") {
    throw new BugReportScreenshotError(
      "Une capture ne peut être jointe qu'à un signalement Bug.",
      "validation",
    );
  }
}

export function storageError(message: string): BugReportScreenshotError {
  return new BugReportScreenshotError(message, "storage_error");
}

export async function removeStorageObject(
  supabase: SupabaseClient,
  path: string,
): Promise<boolean> {
  const result = await supabase.storage.from(BUG_REPORT_SCREENSHOT_BUCKET).remove([path]);
  return !result.error;
}

export async function clearScreenshotColumns(
  supabase: SupabaseClient,
  feedbackId: string,
  expected: { path: string; state: "pending" | "failed" } | undefined = undefined,
): Promise<boolean> {
  let query = supabase
    .from("community_bug_reports")
    .update({
      screenshot_storage_bucket: null,
      screenshot_storage_path: null,
      screenshot_original_name: null,
      screenshot_mime_type: null,
      screenshot_size_bytes: null,
      screenshot_width: null,
      screenshot_height: null,
      screenshot_upload_state: null,
    })
    .eq("id", feedbackId);
  if (expected) {
    query = query
      .eq("screenshot_upload_state", expected.state)
      .eq("screenshot_storage_path", expected.path);
  }
  const result = await query.select("id").maybeSingle();
  if (result.error) {
    throw storageError("La référence de capture ne peut pas être nettoyée.");
  }
  return Boolean(result.data);
}

export async function markScreenshotFailed(
  supabase: SupabaseClient,
  feedbackId: string,
  path: string,
): Promise<boolean> {
  const result = await supabase
    .from("community_bug_reports")
    .update({ screenshot_upload_state: "failed" })
    .eq("id", feedbackId)
    .eq("screenshot_upload_state", "pending")
    .eq("screenshot_storage_path", path)
    .select("id")
    .maybeSingle();
  if (result.error) {
    throw storageError("L'état de la capture ne peut pas être mis à jour.");
  }
  return Boolean(result.data);
}

export async function markFailedAndCleanup(
  supabase: SupabaseClient,
  feedbackId: string,
  attemptId: string,
  path: string,
): Promise<void> {
  const markedFailed = await markScreenshotFailed(supabase, feedbackId, path);
  if (!markedFailed) {
    let latest: BugReportScreenshotRow | null = null;
    try {
      latest = await loadReportForAttempt(supabase, feedbackId, attemptId);
    } catch (error) {
      if (!(error instanceof BugReportScreenshotError) || error.code !== "not_found") {
        throw error;
      }
    }
    if (!latest || latest.screenshot_upload_state !== "failed") return;
  }

  const removed = await removeStorageObject(supabase, path).catch(() => false);
  if (!removed) {
    throw storageError("La capture échouée ne peut pas être supprimée.");
  }
  await clearScreenshotColumns(supabase, feedbackId, { path, state: "failed" });
}

export async function removeAllBugReportScreenshotObjects(
  supabase: SupabaseClient,
  feedbackId: string,
  knownPath?: string | null,
): Promise<boolean> {
  const prefix = buildBugReportScreenshotPrefix(feedbackId);
  const paths = new Set<string>();
  if (knownPath) paths.add(knownPath);
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const listed = await supabase.storage
      .from(BUG_REPORT_SCREENSHOT_BUCKET)
      .list(prefix, { limit: pageSize, offset });
    if (listed.error) return false;
    for (const file of listed.data ?? []) {
      if (file.name?.trim()) paths.add(`${prefix}/${file.name}`);
    }
    if (!listed.data || listed.data.length < pageSize) break;
  }
  if (paths.size === 0) return true;
  const removed = await supabase.storage
    .from(BUG_REPORT_SCREENSHOT_BUCKET)
    .remove(Array.from(paths));
  return !removed.error;
}

export async function claimScreenshotUpload(
  supabase: SupabaseClient,
  params: {
    feedbackId: string;
    expectedState: null | "failed";
    path: string;
    originalName: string;
    mimeType: BugReportScreenshotMimeType;
    sizeBytes: number;
    width?: number | null;
    height?: number | null;
  },
): Promise<BugReportScreenshotRow | null> {
  let query = supabase
    .from("community_bug_reports")
    .update({
      screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
      screenshot_storage_path: params.path,
      screenshot_original_name: params.originalName,
      screenshot_mime_type: params.mimeType,
      screenshot_size_bytes: params.sizeBytes,
      screenshot_width: params.width ?? null,
      screenshot_height: params.height ?? null,
      screenshot_upload_state: "pending",
    })
    .eq("id", params.feedbackId);
  if (params.expectedState === null) {
    query = query.is("screenshot_upload_state", null);
  } else {
    query = query.eq("screenshot_upload_state", params.expectedState);
  }
  const result = await query.select(BUG_REPORT_SCREENSHOT_COLUMNS).maybeSingle();
  if (result.error) {
    throw storageError("La capture ne peut pas être préparée.");
  }
  return (result.data as unknown as BugReportScreenshotRow | null) ?? null;
}

export async function validateStoredObject(
  supabase: SupabaseClient,
  row: BugReportScreenshotRow,
): Promise<void> {
  if (!row.screenshot_storage_path || !row.screenshot_mime_type || !row.screenshot_size_bytes) {
    throw new BugReportScreenshotError("La capture n'a pas de métadonnées valides.", "storage_invalid");
  }
  const info = await supabase.storage
    .from(BUG_REPORT_SCREENSHOT_BUCKET)
    .info(row.screenshot_storage_path);
  if (info.error || !info.data) {
    throw new BugReportScreenshotError("La capture n'a pas été reçue par le stockage.", "storage_missing");
  }
  const infoSize = Number(info.data.metadata?.size ?? info.data.size ?? Number.NaN);
  if (!Number.isInteger(infoSize) || infoSize <= 0 || infoSize > BUG_REPORT_SCREENSHOT_MAX_SIZE_BYTES) {
    throw new BugReportScreenshotError("La taille réelle de la capture est invalide.", "storage_invalid");
  }
  if (infoSize !== row.screenshot_size_bytes) {
    throw new BugReportScreenshotError("La taille de la capture ne correspond pas à sa déclaration.", "storage_invalid");
  }

  const downloaded = await supabase.storage
    .from(BUG_REPORT_SCREENSHOT_BUCKET)
    .download(row.screenshot_storage_path);
  if (downloaded.error || !downloaded.data) {
    throw new BugReportScreenshotError("La capture ne peut pas être vérifiée.", "storage_missing");
  }
  if (downloaded.data.size !== row.screenshot_size_bytes) {
    throw new BugReportScreenshotError("La taille de la capture ne correspond pas à son contenu.", "storage_invalid");
  }
  const detected = detectImageMimeType(new Uint8Array(await downloaded.data.arrayBuffer()));
  if (!detected || detected !== row.screenshot_mime_type) {
    throw new BugReportScreenshotError("Le contenu de la capture ne correspond pas à son type déclaré.", "storage_invalid");
  }
}
