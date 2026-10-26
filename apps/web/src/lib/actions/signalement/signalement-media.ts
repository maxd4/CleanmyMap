import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminAccess } from "@/lib/authz";
import { validateMediaUploadInput } from "../media/media-upload-validation";
import {
  SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES,
  SIGNALEMENT_EVIDENCE_BUCKET,
  SIGNALEMENT_EVIDENCE_MAX_MEDIA,
  SIGNALEMENT_EVIDENCE_MAX_SIZE_BYTES,
  SIGNALEMENT_EVIDENCE_SIGNED_URL_TTL_SECONDS,
  type SignalementEvidenceMimeType,
  type SignalementMediaReadItem,
  type SignalementMediaRecord,
  type SignalementMediaUploadState,
} from "./signalement-media-contract";
import {
  isActionRecord,
  parseActionSupabaseResult,
} from "../query";
import { SignalementMediaError } from "./signalement-media-error";
import { mapCommonMediaRecord } from "../media/media-record-mapper";

export { SIGNALEMENT_EVIDENCE_BUCKET, SIGNALEMENT_EVIDENCE_MAX_MEDIA } from "./signalement-media-contract";
export type { SignalementEvidenceMimeType } from "./signalement-media-contract";
export { SignalementMediaError } from "./signalement-media-error";

export type SignalementMediaUploadIntent = {
  mediaId: string;
  bucket: typeof SIGNALEMENT_EVIDENCE_BUCKET;
  path: string;
  token: string;
  uploadState: "pending";
};

export type SignalementMediaReadyResult = {
  media: SignalementMediaRecord;
  alreadyReady: boolean;
};

type SignalementParent = {
  id: string;
  created_by_clerk_id: string;
  user_id: string;
  status: "new" | "validated" | "cleaned";
  spot_type: "spot" | "clean_place";
};

type SignalementMediaRow = {
  id: string;
  signalement_id: string;
  created_at: string;
  created_by_clerk_id: string;
  client_upload_id: string;
  storage_bucket: typeof SIGNALEMENT_EVIDENCE_BUCKET;
  storage_path: string;
  original_name: string;
  mime_type: SignalementEvidenceMimeType;
  size_bytes: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  upload_state: SignalementMediaUploadState;
};

function isSignalementEvidenceMimeType(value: unknown): value is SignalementEvidenceMimeType {
  return typeof value === "string" &&
    SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES.some((allowed) => allowed === value);
}

function isSignalementMediaUploadState(value: unknown): value is SignalementMediaUploadState {
  return value === "pending" || value === "ready" || value === "failed";
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isSignalementParent(value: unknown): value is SignalementParent {
  return isActionRecord(value) &&
    typeof value.id === "string" &&
    typeof value.created_by_clerk_id === "string" &&
    typeof value.user_id === "string" &&
    (value.status === "new" || value.status === "validated" || value.status === "cleaned") &&
    (value.spot_type === "spot" || value.spot_type === "clean_place");
}

function hasSignalementMediaIdentity(value: Record<string, unknown>): boolean {
  return typeof value.id === "string" && typeof value.signalement_id === "string" &&
    typeof value.created_at === "string" && typeof value.created_by_clerk_id === "string" &&
    typeof value.client_upload_id === "string";
}

function hasSignalementMediaStorage(value: Record<string, unknown>): boolean {
  return value.storage_bucket === SIGNALEMENT_EVIDENCE_BUCKET &&
    typeof value.storage_path === "string" && typeof value.original_name === "string" &&
    isSignalementEvidenceMimeType(value.mime_type) && isSignalementMediaUploadState(value.upload_state);
}

function hasSignalementMediaDimensions(value: Record<string, unknown>): boolean {
  return typeof value.size_bytes === "number" && Number.isFinite(value.size_bytes) &&
    isNullableFiniteNumber(value.width) && isNullableFiniteNumber(value.height) &&
    typeof value.sort_order === "number" && Number.isFinite(value.sort_order);
}

function isSignalementMediaRow(value: unknown): value is SignalementMediaRow {
  return isActionRecord(value) && hasSignalementMediaIdentity(value) &&
    hasSignalementMediaStorage(value) && hasSignalementMediaDimensions(value);
}

type SignalementMediaUploadInput = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  clientUploadId: string;
};

type SignalementMediaUploadParams = SignalementMediaUploadInput & {
  userId: string;
  signalementId: string;
};

type ValidatedSignalementMediaUploadParams = Omit<SignalementMediaUploadParams, "mimeType"> & {
  mimeType: SignalementEvidenceMimeType;
};

export function validateSignalementMediaInput<T extends SignalementMediaUploadInput>(input: T): T & {
  originalName: string;
  mimeType: SignalementEvidenceMimeType;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  clientUploadId: string;
} {
  validateMediaUploadInput(input, {
    allowedMimeTypes: SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES,
    maxSizeBytes: SIGNALEMENT_EVIDENCE_MAX_SIZE_BYTES,
    createError: (message) => new SignalementMediaError(message, "validation"),
  });
  if (!isSignalementEvidenceMimeType(input.mimeType)) {
    throw new SignalementMediaError("Le type MIME de la preuve est invalide.", "validation");
  }
  return input;
}

function extensionForMimeType(mimeType: SignalementEvidenceMimeType): string {
  return mimeType === "image/jpeg" ? "jpg" : mimeType.slice("image/".length);
}

export function buildSignalementEvidencePath(
  signalementId: string,
  mediaId: string,
  mimeType: SignalementEvidenceMimeType,
): string {
  return `${signalementId}/${mediaId}.${extensionForMimeType(mimeType)}`;
}

function toRecord(row: SignalementMediaRow): SignalementMediaRecord {
  return {
    ...mapCommonMediaRecord(row),
    signalementId: row.signalement_id,
  };
}

async function getParent(
  supabase: SupabaseClient,
  signalementId: string,
): Promise<SignalementParent> {
  const rawResult: unknown = await supabase
    .from("trash_spotter_spots")
    .select("id, created_by_clerk_id, user_id, status, spot_type")
    .eq("id", signalementId)
    .maybeSingle();
  const result = parseActionSupabaseResult(rawResult);

  if (result.error) {
    throw new SignalementMediaError("Le signalement ne peut pas être vérifié.", "storage_error");
  }
  if (result.data === null) {
    throw new SignalementMediaError("Signalement introuvable.", "not_found");
  }
  if (!isSignalementParent(result.data)) {
    throw new SignalementMediaError("Le signalement ne peut pas être vérifié.", "storage_error");
  }
  return result.data;
}

async function assertOwnerOrAdmin(
  userId: string,
  parent: SignalementParent,
): Promise<void> {
  if (parent.created_by_clerk_id === userId || parent.user_id === userId) {
    return;
  }

  const adminAccess = await requireAdminAccess();
  if (!adminAccess.ok) {
    throw new SignalementMediaError("Accès refusé.", "forbidden");
  }
}

function normalizeStorageError(message: string): SignalementMediaError {
  return new SignalementMediaError(message, "storage_error");
}

async function retryFailedSignalementMediaRow(
  supabase: SupabaseClient,
  params: ValidatedSignalementMediaUploadParams,
  row: SignalementMediaRow,
): Promise<SignalementMediaRow> {
  const rawUpdateResult: unknown = await supabase
    .from("signalement_media")
    .update({
      upload_state: "pending",
      failure_reason: null,
      original_name: params.originalName.trim(),
      mime_type: params.mimeType,
      size_bytes: params.sizeBytes,
      width: params.width ?? null,
      height: params.height ?? null,
      sort_order: params.sortOrder ?? row.sort_order,
    })
    .eq("id", row.id)
    .select("*")
    .single();
  const updateResult = parseActionSupabaseResult(rawUpdateResult);
  if (updateResult.error || !isSignalementMediaRow(updateResult.data)) {
    throw normalizeStorageError("La nouvelle tentative photo ne peut pas être préparée.");
  }
  return updateResult.data;
}

async function resolveExistingSignalementMediaRow(
  supabase: SupabaseClient,
  params: ValidatedSignalementMediaUploadParams,
  value: unknown,
): Promise<{ row: SignalementMediaRow; alreadyReady: boolean }> {
  if (!isSignalementMediaRow(value)) {
    throw normalizeStorageError("La preuve photo ne peut pas être vérifiée.");
  }
  if (value.upload_state === "ready") return { row: value, alreadyReady: true };
  if (value.upload_state === "failed") {
    return { row: await retryFailedSignalementMediaRow(supabase, params, value), alreadyReady: false };
  }
  return { row: value, alreadyReady: false };
}

async function ensureSignalementMediaCapacity(
  supabase: SupabaseClient,
  signalementId: string,
): Promise<void> {
  const rawActiveResult: unknown = await supabase
    .from("signalement_media")
    .select("id", { count: "exact", head: true })
    .eq("signalement_id", signalementId)
    .in("upload_state", ["pending", "ready"]);
  const activeResult = parseActionSupabaseResult(rawActiveResult);
  if (activeResult.error) {
    throw normalizeStorageError("Le nombre de preuves existantes ne peut pas être vérifié.");
  }
  if ((activeResult.count ?? 0) >= SIGNALEMENT_EVIDENCE_MAX_MEDIA) {
    throw new SignalementMediaError(
      "Ce signalement contient déjà le nombre maximal de preuves photo.",
      "limit_reached",
    );
  }
}

async function insertSignalementMediaRow(
  supabase: SupabaseClient,
  params: ValidatedSignalementMediaUploadParams,
): Promise<SignalementMediaRow> {
  const mediaId = globalThis.crypto?.randomUUID?.();
  if (!mediaId) {
    throw normalizeStorageError("Impossible de générer l'identifiant de preuve.");
  }
  const rawInsertResult: unknown = await supabase
    .from("signalement_media")
    .insert({
      id: mediaId,
      signalement_id: params.signalementId,
      created_by_clerk_id: params.userId,
      client_upload_id: params.clientUploadId.trim(),
      storage_bucket: SIGNALEMENT_EVIDENCE_BUCKET,
      storage_path: buildSignalementEvidencePath(params.signalementId, mediaId, params.mimeType),
      original_name: params.originalName.trim(),
      mime_type: params.mimeType,
      size_bytes: params.sizeBytes,
      width: params.width ?? null,
      height: params.height ?? null,
      sort_order: params.sortOrder ?? 0,
      upload_state: "pending",
    })
    .select("*")
    .single();
  const insertResult = parseActionSupabaseResult(rawInsertResult);
  if (insertResult.error || !isSignalementMediaRow(insertResult.data)) {
    throw normalizeStorageError("La preuve photo ne peut pas être enregistrée.");
  }
  return insertResult.data;
}

async function loadOrCreateSignalementMediaRow(
  supabase: SupabaseClient,
  params: ValidatedSignalementMediaUploadParams,
): Promise<{ row: SignalementMediaRow; alreadyReady: boolean }> {
  const rawExistingResult: unknown = await supabase
    .from("signalement_media")
    .select("*")
    .eq("signalement_id", params.signalementId)
    .eq("created_by_clerk_id", params.userId)
    .eq("client_upload_id", params.clientUploadId)
    .maybeSingle();
  const existingResult = parseActionSupabaseResult(rawExistingResult);
  if (existingResult.error) {
    throw normalizeStorageError("La preuve photo ne peut pas être préparée.");
  }
  if (existingResult.data) {
    return resolveExistingSignalementMediaRow(supabase, params, existingResult.data);
  }
  await ensureSignalementMediaCapacity(supabase, params.signalementId);
  return { row: await insertSignalementMediaRow(supabase, params), alreadyReady: false };
}

export async function createSignalementMediaUploadIntent(
  supabase: SupabaseClient,
  params: SignalementMediaUploadParams,
): Promise<SignalementMediaUploadIntent | { mediaId: string; uploadState: "ready" }> {
  const validatedParams = validateSignalementMediaInput(params);
  const parent = await getParent(supabase, validatedParams.signalementId);
  await assertOwnerOrAdmin(validatedParams.userId, parent);
  const { row, alreadyReady } = await loadOrCreateSignalementMediaRow(supabase, validatedParams);
  if (alreadyReady) return { mediaId: row.id, uploadState: "ready" };

  const signedUpload = await supabase.storage
    .from(SIGNALEMENT_EVIDENCE_BUCKET)
    .createSignedUploadUrl(row.storage_path, { upsert: true });
  if (signedUpload.error || !signedUpload.data?.token) {
    await supabase
      .from("signalement_media")
      .update({ upload_state: "failed", failure_reason: "signed_upload_failed" })
      .eq("id", row.id);
    throw normalizeStorageError("La preuve photo ne peut pas recevoir son accès d'upload.");
  }

  return {
    mediaId: row.id,
    bucket: SIGNALEMENT_EVIDENCE_BUCKET,
    path: row.storage_path,
    token: signedUpload.data.token,
    uploadState: "pending",
  };
}

export async function finalizeSignalementMedia(
  supabase: SupabaseClient,
  params: { userId: string; signalementId: string; mediaId: string },
): Promise<SignalementMediaReadyResult> {
  const parent = await getParent(supabase, params.signalementId);
  await assertOwnerOrAdmin(params.userId, parent);
  const rawResult: unknown = await supabase
    .from("signalement_media")
    .select("*")
    .eq("id", params.mediaId)
    .eq("signalement_id", params.signalementId)
    .maybeSingle();
  const result = parseActionSupabaseResult(rawResult);
  if (result.error) {
    throw normalizeStorageError("La preuve photo ne peut pas être finalisée.");
  }
  if (!result.data) {
    throw new SignalementMediaError("Preuve photo introuvable.", "not_found");
  }
  if (!isSignalementMediaRow(result.data)) {
    throw normalizeStorageError("La preuve photo ne peut pas être vérifiée.");
  }
  const row = result.data;
  if (row.storage_bucket !== SIGNALEMENT_EVIDENCE_BUCKET) {
    throw new SignalementMediaError("Le bucket de preuve est invalide.", "validation");
  }
  const expectedPath = buildSignalementEvidencePath(
    params.signalementId,
    row.id,
    row.mime_type,
  );
  if (row.storage_path !== expectedPath) {
    throw new SignalementMediaError("Le chemin de preuve est invalide.", "validation");
  }
  if (row.upload_state === "ready") {
    return { media: toRecord(row), alreadyReady: true };
  }

  const objectInfo = await supabase.storage
    .from(SIGNALEMENT_EVIDENCE_BUCKET)
    .info(row.storage_path);
  if (objectInfo.error || !objectInfo.data) {
    await supabase
      .from("signalement_media")
      .update({ upload_state: "failed", failure_reason: "object_missing" })
      .eq("id", row.id);
    throw new SignalementMediaError("La photo n'a pas été reçue par le stockage.", "storage_missing");
  }

  const rawUpdated: unknown = await supabase
    .from("signalement_media")
    .update({ upload_state: "ready", failure_reason: null })
    .eq("id", row.id)
    .select("*")
    .single();
  const updated = parseActionSupabaseResult(rawUpdated);
  if (updated.error || !isSignalementMediaRow(updated.data)) {
    throw normalizeStorageError("La preuve photo ne peut pas être marquée comme prête.");
  }
  return { media: toRecord(updated.data), alreadyReady: false };
}

async function assertCanReadSignalementMedia(
  parent: SignalementParent,
  userId: string | null,
): Promise<void> {
  const isPubliclyReadable = parent.status === "validated" || parent.status === "cleaned";
  if (isPubliclyReadable || userId === null) {
    if (isPubliclyReadable) return;
    throw new SignalementMediaError("Les preuves de ce signalement ne sont pas publiques.", "forbidden");
  }
  if (parent.created_by_clerk_id === userId || parent.user_id === userId) return;
  const adminAccess = await requireAdminAccess();
  if (!adminAccess.ok) {
    throw new SignalementMediaError("Les preuves de ce signalement ne sont pas publiques.", "forbidden");
  }
}

async function loadReadySignalementMediaRows(
  supabase: SupabaseClient,
  signalementId: string,
): Promise<SignalementMediaRow[]> {
  const rawMediaResult: unknown = await supabase
    .from("signalement_media")
    .select("*")
    .eq("signalement_id", signalementId)
    .eq("upload_state", "ready")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const mediaResult = parseActionSupabaseResult(rawMediaResult);
  if (mediaResult.error) throw normalizeStorageError("Les preuves photo ne peuvent pas être chargées.");
  if (mediaResult.data === null) return [];
  if (!Array.isArray(mediaResult.data) || !mediaResult.data.every(isSignalementMediaRow)) {
    throw normalizeStorageError("Les preuves photo reçues sont invalides.");
  }
  return mediaResult.data;
}

async function signSignalementMediaRows(
  supabase: SupabaseClient,
  rows: SignalementMediaRow[],
): Promise<SignalementMediaReadItem[]> {
  const items: SignalementMediaReadItem[] = [];
  for (const row of rows) {
    const record = toRecord(row);
    const signed = await supabase.storage
      .from(SIGNALEMENT_EVIDENCE_BUCKET)
      .createSignedUrl(record.storagePath, SIGNALEMENT_EVIDENCE_SIGNED_URL_TTL_SECONDS);
    if (signed.error || !signed.data?.signedUrl) {
      throw normalizeStorageError("Une URL de preuve ne peut pas être générée.");
    }
    items.push({ ...record, signedUrl: signed.data.signedUrl });
  }
  return items;
}

export async function listSignalementMedia(
  supabase: SupabaseClient,
  params: { signalementId: string; userId: string | null },
): Promise<SignalementMediaReadItem[]> {
  const parent = await getParent(supabase, params.signalementId);
  await assertCanReadSignalementMedia(parent, params.userId);
  const rows = await loadReadySignalementMediaRows(supabase, params.signalementId);
  return signSignalementMediaRows(supabase, rows);
}
