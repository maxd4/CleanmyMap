import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminAccess } from "@/lib/authz";
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

export {
  SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES,
  SIGNALEMENT_EVIDENCE_BUCKET,
  SIGNALEMENT_EVIDENCE_MAX_MEDIA,
  SIGNALEMENT_EVIDENCE_MAX_SIZE_BYTES,
  SIGNALEMENT_EVIDENCE_SIGNED_URL_TTL_SECONDS,
} from "./signalement-media-contract";
export type {
  SignalementEvidenceMimeType,
  SignalementMediaUploadState,
} from "./signalement-media-contract";

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

export class SignalementMediaError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "validation"
      | "unauthorized"
      | "forbidden"
      | "not_found"
      | "limit_reached"
      | "storage_missing"
      | "storage_error",
  ) {
    super(message);
    this.name = "SignalementMediaError";
  }
}

export function isSignalementEvidenceMimeType(
  value: string,
): value is SignalementEvidenceMimeType {
  return (SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES as readonly string[]).includes(
    value,
  );
}

export function validateSignalementMediaInput(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  clientUploadId: string;
}): asserts input is {
  originalName: string;
  mimeType: SignalementEvidenceMimeType;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  clientUploadId: string;
} {
  if (
    input.originalName.trim().length < 1 ||
    input.originalName.trim().length > 255 ||
    input.clientUploadId.trim().length < 1 ||
    input.clientUploadId.trim().length > 128
  ) {
    throw new SignalementMediaError("Les métadonnées photo sont invalides.", "validation");
  }
  if (!isSignalementEvidenceMimeType(input.mimeType)) {
    throw new SignalementMediaError("Le format de photo n'est pas accepté.", "validation");
  }
  if (
    !Number.isInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > SIGNALEMENT_EVIDENCE_MAX_SIZE_BYTES
  ) {
    throw new SignalementMediaError("La photo dépasse la taille autorisée.", "validation");
  }
  for (const dimension of [input.width, input.height]) {
    if (
      dimension !== undefined &&
      dimension !== null &&
      (!Number.isInteger(dimension) || dimension < 1 || dimension > 10000)
    ) {
      throw new SignalementMediaError("Les dimensions photo sont invalides.", "validation");
    }
  }
  if (
    input.sortOrder !== undefined &&
    (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 2)
  ) {
    throw new SignalementMediaError("L'ordre des photos est invalide.", "validation");
  }
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
    id: row.id,
    signalementId: row.signalement_id,
    createdAt: row.created_at,
    createdByClerkId: row.created_by_clerk_id,
    clientUploadId: row.client_upload_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    sortOrder: row.sort_order,
    uploadState: row.upload_state,
  };
}

async function getParent(
  supabase: SupabaseClient,
  signalementId: string,
): Promise<SignalementParent> {
  const { data, error } = await supabase
    .from("trash_spotter_spots")
    .select("id, created_by_clerk_id, user_id, status, spot_type")
    .eq("id", signalementId)
    .maybeSingle();

  if (error) {
    throw new SignalementMediaError("Le signalement ne peut pas être vérifié.", "storage_error");
  }
  if (!data) {
    throw new SignalementMediaError("Signalement introuvable.", "not_found");
  }
  return data as SignalementParent;
}

async function assertOwnerOrAdmin(
  supabase: SupabaseClient,
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

export async function createSignalementMediaUploadIntent(
  supabase: SupabaseClient,
  params: {
    userId: string;
    signalementId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    width?: number | null;
    height?: number | null;
    sortOrder?: number;
    clientUploadId: string;
  },
): Promise<SignalementMediaUploadIntent | { mediaId: string; uploadState: "ready" }> {
  validateSignalementMediaInput(params);
  const parent = await getParent(supabase, params.signalementId);
  await assertOwnerOrAdmin(supabase, params.userId, parent);

  const existingResult = await supabase
    .from("signalement_media")
    .select("*")
    .eq("signalement_id", params.signalementId)
    .eq("created_by_clerk_id", params.userId)
    .eq("client_upload_id", params.clientUploadId)
    .maybeSingle();
  if (existingResult.error) {
    throw normalizeStorageError("La preuve photo ne peut pas être préparée.");
  }

  let row: SignalementMediaRow;
  if (existingResult.data) {
    row = existingResult.data as SignalementMediaRow;
    if (row.upload_state === "ready") {
      return { mediaId: row.id, uploadState: "ready" };
    }
    if (row.upload_state === "failed") {
      const { data, error } = await supabase
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
      if (error || !data) {
        throw normalizeStorageError("La nouvelle tentative photo ne peut pas être préparée.");
      }
      row = data as SignalementMediaRow;
    }
  } else {
    const activeResult = await supabase
      .from("signalement_media")
      .select("id", { count: "exact", head: true })
      .eq("signalement_id", params.signalementId)
      .in("upload_state", ["pending", "ready"]);
    if (activeResult.error) {
      throw normalizeStorageError("Le nombre de preuves existantes ne peut pas être vérifié.");
    }
    if ((activeResult.count ?? 0) >= SIGNALEMENT_EVIDENCE_MAX_MEDIA) {
      throw new SignalementMediaError(
        "Ce signalement contient déjà le nombre maximal de preuves photo.",
        "limit_reached",
      );
    }

    const mediaId = globalThis.crypto?.randomUUID?.();
    if (!mediaId) {
      throw normalizeStorageError("Impossible de générer l'identifiant de preuve.");
    }
    const mimeType = params.mimeType as SignalementEvidenceMimeType;
    const insertResult = await supabase
      .from("signalement_media")
      .insert({
        id: mediaId,
        signalement_id: params.signalementId,
        created_by_clerk_id: params.userId,
        client_upload_id: params.clientUploadId.trim(),
        storage_bucket: SIGNALEMENT_EVIDENCE_BUCKET,
        storage_path: buildSignalementEvidencePath(params.signalementId, mediaId, mimeType),
        original_name: params.originalName.trim(),
        mime_type: mimeType,
        size_bytes: params.sizeBytes,
        width: params.width ?? null,
        height: params.height ?? null,
        sort_order: params.sortOrder ?? 0,
        upload_state: "pending",
      })
      .select("*")
      .single();
    if (insertResult.error || !insertResult.data) {
      throw normalizeStorageError("La preuve photo ne peut pas être enregistrée.");
    }
    row = insertResult.data as SignalementMediaRow;
  }

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
  await assertOwnerOrAdmin(supabase, params.userId, parent);
  const result = await supabase
    .from("signalement_media")
    .select("*")
    .eq("id", params.mediaId)
    .eq("signalement_id", params.signalementId)
    .maybeSingle();
  if (result.error) {
    throw normalizeStorageError("La preuve photo ne peut pas être finalisée.");
  }
  if (!result.data) {
    throw new SignalementMediaError("Preuve photo introuvable.", "not_found");
  }
  const row = result.data as SignalementMediaRow;
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

  const updated = await supabase
    .from("signalement_media")
    .update({ upload_state: "ready", failure_reason: null })
    .eq("id", row.id)
    .select("*")
    .single();
  if (updated.error || !updated.data) {
    throw normalizeStorageError("La preuve photo ne peut pas être marquée comme prête.");
  }
  return { media: toRecord(updated.data as SignalementMediaRow), alreadyReady: false };
}

export async function listSignalementMedia(
  supabase: SupabaseClient,
  params: { signalementId: string; userId: string | null },
): Promise<SignalementMediaReadItem[]> {
  const parent = await getParent(supabase, params.signalementId);
  const isPubliclyReadable = parent.status === "validated" || parent.status === "cleaned";
  let canRead = isPubliclyReadable;
  if (params.userId && (parent.created_by_clerk_id === params.userId || parent.user_id === params.userId)) {
    canRead = true;
  } else if (params.userId && !canRead) {
    const adminAccess = await requireAdminAccess();
    canRead = adminAccess.ok;
  }
  if (!canRead) {
    throw new SignalementMediaError("Les preuves de ce signalement ne sont pas publiques.", "forbidden");
  }

  const mediaResult = await supabase
    .from("signalement_media")
    .select("*")
    .eq("signalement_id", params.signalementId)
    .eq("upload_state", "ready")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (mediaResult.error) {
    throw normalizeStorageError("Les preuves photo ne peuvent pas être chargées.");
  }

  const items: SignalementMediaReadItem[] = [];
  for (const rawRow of (mediaResult.data ?? []) as SignalementMediaRow[]) {
    const row = toRecord(rawRow);
    const signed = await supabase.storage
      .from(SIGNALEMENT_EVIDENCE_BUCKET)
      .createSignedUrl(row.storagePath, SIGNALEMENT_EVIDENCE_SIGNED_URL_TTL_SECONDS);
    if (signed.error || !signed.data?.signedUrl) {
      throw normalizeStorageError("Une URL de preuve ne peut pas être générée.");
    }
    items.push({ ...row, signedUrl: signed.data.signedUrl });
  }
  return items;
}

export async function cleanupPendingSignalementMedia(
  supabase: SupabaseClient,
  params: { olderThanMinutes?: number; maxRows?: number } = {},
): Promise<{ inspected: number; markedFailed: number }> {
  const olderThanMinutes = Math.min(24 * 60, Math.max(15, Math.trunc(params.olderThanMinutes ?? 24 * 60)));
  const maxRows = Math.min(50, Math.max(1, Math.trunc(params.maxRows ?? 25)));
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  const stale = await supabase
    .from("signalement_media")
    .select("id, storage_bucket, storage_path")
    .eq("upload_state", "pending")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(maxRows);
  if (stale.error) {
    throw normalizeStorageError("Les preuves orphelines ne peuvent pas être inspectées.");
  }
  const rows = (stale.data ?? []) as Array<{ id: string; storage_bucket: string; storage_path: string }>;
  if (rows.length === 0) {
    return { inspected: 0, markedFailed: 0 };
  }
  const paths = rows
    .filter((row) => row.storage_bucket === SIGNALEMENT_EVIDENCE_BUCKET)
    .map((row) => row.storage_path);
  if (paths.length > 0) {
    await supabase.storage.from(SIGNALEMENT_EVIDENCE_BUCKET).remove(paths);
  }
  const ids = rows.map((row) => row.id);
  const update = await supabase
    .from("signalement_media")
    .update({ upload_state: "failed", failure_reason: "pending_expired" })
    .in("id", ids);
  if (update.error) {
    throw normalizeStorageError("Les preuves orphelines ne peuvent pas être clôturées.");
  }
  return { inspected: rows.length, markedFailed: rows.length };
}
