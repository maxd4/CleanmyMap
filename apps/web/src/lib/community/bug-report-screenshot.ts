import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminAccess } from "@/lib/authz";
import {
  BUG_REPORT_SCREENSHOT_ALLOWED_MIME_TYPES,
  BUG_REPORT_SCREENSHOT_BUCKET,
  BUG_REPORT_SCREENSHOT_MAX_SIZE_BYTES,
  BUG_REPORT_SCREENSHOT_SIGNED_URL_TTL_SECONDS,
  type BugReportScreenshotMimeType,
  type BugReportScreenshotReadItem,
  type BugReportScreenshotRecord,
  type BugReportScreenshotUploadState,
} from "./bug-report-screenshot-contract";

const BUG_REPORT_SCREENSHOT_COLUMNS = [
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BugReportScreenshotRow = {
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

export type BugReportScreenshotUploadIntent = {
  feedbackId: string;
  bucket: typeof BUG_REPORT_SCREENSHOT_BUCKET;
  path: string;
  token: string;
  uploadState: "pending";
};

export class BugReportScreenshotError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "validation"
      | "unauthorized"
      | "forbidden"
      | "not_found"
      | "storage_missing"
      | "storage_invalid"
      | "storage_error",
  ) {
    super(message);
    this.name = "BugReportScreenshotError";
  }
}

function isAllowedMimeType(value: string): value is BugReportScreenshotMimeType {
  return (BUG_REPORT_SCREENSHOT_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function validateBugReportScreenshotInput(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
}): asserts input is {
  originalName: string;
  mimeType: BugReportScreenshotMimeType;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
} {
  if (input.originalName.trim().length < 1 || input.originalName.trim().length > 255) {
    throw new BugReportScreenshotError("Le nom de la capture est invalide.", "validation");
  }
  if (!isAllowedMimeType(input.mimeType)) {
    throw new BugReportScreenshotError("Le format de capture n'est pas accepté.", "validation");
  }
  if (
    !Number.isInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > BUG_REPORT_SCREENSHOT_MAX_SIZE_BYTES
  ) {
    throw new BugReportScreenshotError("La capture dépasse la taille autorisée.", "validation");
  }
  for (const dimension of [input.width, input.height]) {
    if (
      dimension !== undefined &&
      dimension !== null &&
      (!Number.isInteger(dimension) || dimension < 1 || dimension > 10000)
    ) {
      throw new BugReportScreenshotError("Les dimensions de la capture sont invalides.", "validation");
    }
  }
}

function assertFeedbackId(feedbackId: string): void {
  if (!UUID_PATTERN.test(feedbackId)) {
    throw new BugReportScreenshotError("La référence du feedback est invalide.", "validation");
  }
}

export function buildBugReportScreenshotPath(feedbackId: string): string {
  assertFeedbackId(feedbackId);
  return `feedback/${feedbackId}/screenshot`;
}

function toRecord(row: BugReportScreenshotRow): BugReportScreenshotRecord {
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

async function loadReport(
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

async function assertOwner(
  userId: string,
  row: BugReportScreenshotRow,
): Promise<void> {
  if (row.submitted_by_user_id === userId) return;
  throw new BugReportScreenshotError("Accès refusé.", "forbidden");
}

async function assertOwnerOrAdmin(
  userId: string,
  row: BugReportScreenshotRow,
): Promise<void> {
  if (row.submitted_by_user_id === userId) return;
  const adminAccess = await requireAdminAccess();
  if (!adminAccess.ok) {
    throw new BugReportScreenshotError("Accès refusé.", "forbidden");
  }
}

function assertBugReport(row: BugReportScreenshotRow): void {
  if (row.report_type !== "bug") {
    throw new BugReportScreenshotError(
      "Une capture ne peut être jointe qu'à un signalement Bug.",
      "validation",
    );
  }
}

function storageError(message: string): BugReportScreenshotError {
  return new BugReportScreenshotError(message, "storage_error");
}

async function removeStorageObject(
  supabase: SupabaseClient,
  path: string,
): Promise<boolean> {
  const result = await supabase.storage.from(BUG_REPORT_SCREENSHOT_BUCKET).remove([path]);
  return !result.error;
}

async function clearScreenshotColumns(
  supabase: SupabaseClient,
  feedbackId: string,
): Promise<void> {
  const result = await supabase
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
  if (result.error) {
    throw storageError("La référence de capture ne peut pas être nettoyée.");
  }
}

async function markFailedAndCleanup(
  supabase: SupabaseClient,
  feedbackId: string,
  path: string,
): Promise<void> {
  const removed = await removeStorageObject(supabase, path).catch(() => false);
  if (removed) {
    await clearScreenshotColumns(supabase, feedbackId);
    return;
  }
  await supabase
    .from("community_bug_reports")
    .update({ screenshot_upload_state: "failed" })
    .eq("id", feedbackId);
}

function detectImageMimeType(bytes: Uint8Array): BugReportScreenshotMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function validateStoredObject(
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
  const infoSize = Number(info.data.metadata?.size ?? info.data.size ?? NaN);
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

  const path = buildBugReportScreenshotPath(params.feedbackId);
  const updated = await supabase
    .from("community_bug_reports")
    .update({
      screenshot_storage_bucket: BUG_REPORT_SCREENSHOT_BUCKET,
      screenshot_storage_path: path,
      screenshot_original_name: params.originalName.trim(),
      screenshot_mime_type: params.mimeType,
      screenshot_size_bytes: params.sizeBytes,
      screenshot_width: params.width ?? null,
      screenshot_height: params.height ?? null,
      screenshot_upload_state: "pending",
    })
    .eq("id", params.feedbackId)
    .select(BUG_REPORT_SCREENSHOT_COLUMNS)
    .single();
  if (updated.error || !updated.data) {
    throw storageError("La capture ne peut pas être préparée.");
  }

  const signedUpload = await supabase.storage
    .from(BUG_REPORT_SCREENSHOT_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (signedUpload.error || !signedUpload.data?.token) {
    await supabase
      .from("community_bug_reports")
      .update({ screenshot_upload_state: "failed" })
      .eq("id", params.feedbackId);
    throw storageError("La capture ne peut pas recevoir son accès d'upload.");
  }

  return {
    feedbackId: params.feedbackId,
    bucket: BUG_REPORT_SCREENSHOT_BUCKET,
    path,
    token: signedUpload.data.token,
    uploadState: "pending",
  };
}

export async function finalizeBugReportScreenshot(
  supabase: SupabaseClient,
  params: { userId: string; feedbackId: string },
): Promise<{ screenshot: BugReportScreenshotRecord; alreadyReady: boolean }> {
  const row = await loadReport(supabase, params.feedbackId);
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
    await markFailedAndCleanup(supabase, params.feedbackId, row.screenshot_storage_path);
    throw error;
  }

  const updated = await supabase
    .from("community_bug_reports")
    .update({ screenshot_upload_state: "ready" })
    .eq("id", params.feedbackId)
    .select(BUG_REPORT_SCREENSHOT_COLUMNS)
    .single();
  if (updated.error || !updated.data) {
    await markFailedAndCleanup(supabase, params.feedbackId, row.screenshot_storage_path);
    throw storageError("La capture ne peut pas être finalisée.");
  }
  return { screenshot: toRecord(updated.data as unknown as BugReportScreenshotRow), alreadyReady: false };
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
    signedUrlExpiresAt: new Date(Date.now() + BUG_REPORT_SCREENSHOT_SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
  };
}

export async function deleteBugReportScreenshot(
  supabase: SupabaseClient,
  params: { userId: string; feedbackId: string },
): Promise<void> {
  const row = await loadReport(supabase, params.feedbackId);
  await assertOwner(params.userId, row);
  if (!row.screenshot_storage_path) return;
  const removed = await removeStorageObject(supabase, row.screenshot_storage_path);
  if (!removed) {
    throw storageError("La capture ne peut pas être supprimée.");
  }
  await clearScreenshotColumns(supabase, params.feedbackId);
}

export async function removeBugReportScreenshotForDeletedReport(
  supabase: SupabaseClient,
  feedbackId: string,
): Promise<void> {
  let row: BugReportScreenshotRow;
  try {
    row = await loadReport(supabase, feedbackId);
  } catch (error) {
    if (error instanceof BugReportScreenshotError && error.code === "not_found") {
      return;
    }
    throw error;
  }
  if (!row.screenshot_storage_path) return;
  const removed = await removeStorageObject(supabase, row.screenshot_storage_path);
  if (!removed) {
    throw storageError("La capture liée au feedback ne peut pas être supprimée.");
  }
}
