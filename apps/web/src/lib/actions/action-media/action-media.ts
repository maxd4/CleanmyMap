import type { SupabaseClient } from "@supabase/supabase-js";
import { canManageAction, type ActionPermissionIdentity } from "@/lib/actions/permissions";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import {
  ACTION_MEDIA_ALLOWED_MIME_TYPES,
  ACTION_MEDIA_BUCKET,
  ACTION_MEDIA_MAX_MEDIA,
  ACTION_MEDIA_MAX_SIZE_BYTES,
  ACTION_MEDIA_SIGNED_URL_TTL_SECONDS,
  type ActionMediaMimeType,
  type ActionMediaRecord,
  type ActionMediaReadItem,
} from "./action-media-contract";
import { verifyActionMediaStorageObject } from "./action-media-storage";
import {
  markActionMediaFailedIfCurrent,
  markActionMediaReady,
  prepareRetryState,
  type ActionMediaReadyResult,
  type ActionMediaRow,
} from "./action-media-transitions";

export type { ActionMediaReadyResult } from "./action-media-transitions";

export type ActionMediaUploadIntent = {
  mediaId: string;
  bucket: typeof ACTION_MEDIA_BUCKET;
  path: string;
  token: string;
  uploadState: "pending";
};

type ActionMediaParent = {
  id: string;
  created_by_clerk_id: string;
  action_phase: "pre_action" | "post_action_complete" | null;
  status: string;
};

export class ActionMediaError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "validation"
      | "unauthorized"
      | "forbidden"
      | "not_found"
      | "not_admissible"
      | "limit_reached"
      | "conflict"
      | "storage_missing"
      | "storage_invalid"
      | "storage_error",
  ) {
    super(message);
    this.name = "ActionMediaError";
  }
}

function isActionMediaMimeType(value: string): value is ActionMediaMimeType {
  return (ACTION_MEDIA_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function validateActionMediaInput(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  clientUploadId: string;
}): asserts input is {
  originalName: string;
  mimeType: ActionMediaMimeType;
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
    throw new ActionMediaError("Les métadonnées photo sont invalides.", "validation");
  }
  if (!isActionMediaMimeType(input.mimeType)) {
    throw new ActionMediaError("Le format de photo n'est pas accepté.", "validation");
  }
  if (
    !Number.isInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > ACTION_MEDIA_MAX_SIZE_BYTES
  ) {
    throw new ActionMediaError("La photo dépasse la taille autorisée.", "validation");
  }
  for (const dimension of [input.width, input.height]) {
    if (
      dimension !== undefined &&
      dimension !== null &&
      (!Number.isInteger(dimension) || dimension < 1 || dimension > 10000)
    ) {
      throw new ActionMediaError("Les dimensions photo sont invalides.", "validation");
    }
  }
  if (
    input.sortOrder !== undefined &&
    (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 2)
  ) {
    throw new ActionMediaError("L'ordre des photos est invalide.", "validation");
  }
}

function extensionForMimeType(mimeType: ActionMediaMimeType): string {
  return mimeType === "image/jpeg" ? "jpg" : mimeType.slice("image/".length);
}

export function buildActionMediaPath(
  actionId: string,
  mediaId: string,
  mimeType: ActionMediaMimeType,
): string {
  return `${actionId}/${mediaId}.${extensionForMimeType(mimeType)}`;
}

function toRecord(row: ActionMediaRow): ActionMediaRecord {
  return {
    id: row.id,
    actionId: row.action_id,
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

async function getAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionMediaParent> {
  const result = await supabase
    .from("actions")
    .select("id, created_by_clerk_id, action_phase, status")
    .eq("id", actionId)
    .maybeSingle();
  if (result.error) {
    throw new ActionMediaError("L'action ne peut pas être vérifiée.", "storage_error");
  }
  if (!result.data) {
    throw new ActionMediaError("Action introuvable.", "not_found");
  }
  return result.data as ActionMediaParent;
}

async function assertActionAccess(params: {
  supabase: SupabaseClient;
  actionId: string;
  userId: string;
  identity: ActionPermissionIdentity | null;
}): Promise<ActionMediaParent> {
  const action = await getAction(params.supabase, params.actionId);
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
    params.supabase,
    params.actionId,
  );
  const allowed = canManageAction(
    params.identity ?? { userId: params.userId, role: null, activeRole: null },
    {
      createdByClerkId: action.created_by_clerk_id,
      actionPhase: action.action_phase ?? undefined,
    },
    organizerIds,
  );
  if (!allowed) {
    throw new ActionMediaError("Accès refusé.", "forbidden");
  }
  if (
    action.action_phase !== "post_action_complete" ||
    action.status === "cancelled" ||
    action.status === "rejected"
  ) {
    throw new ActionMediaError(
      "Les photos de bilan ne sont pas admissibles dans l'état actuel de l'action.",
      "not_admissible",
    );
  }
  return action;
}

function storageError(message: string): ActionMediaError {
  return new ActionMediaError(message, "storage_error");
}

async function verifyStoredActionMediaObject(
  supabase: SupabaseClient,
  row: ActionMediaRow,
): Promise<void> {
  const verification = await verifyActionMediaStorageObject(supabase, {
    storagePath: row.storage_path,
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
  });
  if (verification === "missing") {
    throw new ActionMediaError("La photo n'a pas été reçue par le stockage.", "storage_missing");
  }
  if (verification === "invalid") {
    throw new ActionMediaError(
      "Les propriétés de la photo reçue ne correspondent pas aux métadonnées enregistrées.",
      "storage_invalid",
    );
  }
  if (verification === "error") {
    throw new ActionMediaError("Le stockage ne peut pas être vérifié pour le moment.", "storage_error");
  }
}

const transitionDependencies = {
  storageError,
  verifyStoredActionMediaObject,
  toRecord,
};

function assertImmutableRetryMetadata(
  actionId: string,
  row: ActionMediaRow,
  params: {
    originalName: string;
    mimeType: ActionMediaMimeType;
    sizeBytes: number;
    width?: number | null;
    height?: number | null;
    sortOrder?: number;
  },
): void {
  if (
    row.storage_bucket !== ACTION_MEDIA_BUCKET ||
    row.storage_path !== buildActionMediaPath(actionId, row.id, row.mime_type)
  ) {
    throw new ActionMediaError("Le chemin photo enregistré est invalide.", "storage_invalid");
  }

  const matches =
    row.original_name === params.originalName.trim() &&
    row.mime_type === params.mimeType &&
    row.size_bytes === params.sizeBytes &&
    row.width === (params.width ?? null) &&
    row.height === (params.height ?? null) &&
    (params.sortOrder === undefined || row.sort_order === params.sortOrder);
  if (!matches) {
    throw new ActionMediaError(
      "Cette nouvelle tentative ne correspond pas aux métadonnées initiales de la photo.",
      "conflict",
    );
  }
}

export async function createActionMediaUploadIntent(
  supabase: SupabaseClient,
  params: {
    userId: string;
    identity: ActionPermissionIdentity | null;
    actionId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    width?: number | null;
    height?: number | null;
    sortOrder?: number;
    clientUploadId: string;
  },
): Promise<ActionMediaUploadIntent | { mediaId: string; uploadState: "ready" }> {
  validateActionMediaInput(params);
  await assertActionAccess({ supabase, ...params });

  const existing = await supabase
    .from("action_media")
    .select("*")
    .eq("action_id", params.actionId)
    .eq("created_by_clerk_id", params.userId)
    .eq("client_upload_id", params.clientUploadId.trim())
    .maybeSingle();
  if (existing.error) throw storageError("La photo ne peut pas être préparée.");

  let row: ActionMediaRow;
  let isRetry = false;
  if (existing.data) {
    row = existing.data as ActionMediaRow;
    isRetry = true;
  } else {
    const active = await supabase
      .from("action_media")
      .select("id", { count: "exact", head: true })
      .eq("action_id", params.actionId)
      .in("upload_state", ["pending", "ready"]);
    if (active.error) throw storageError("Le quota photo ne peut pas être vérifié.");
    if ((active.count ?? 0) >= ACTION_MEDIA_MAX_MEDIA) {
      throw new ActionMediaError(
        "Cette action contient déjà le nombre maximal de photos de bilan.",
        "limit_reached",
      );
    }

    const mediaId = globalThis.crypto?.randomUUID?.();
    if (!mediaId) throw storageError("Impossible de générer l'identifiant photo.");
    const insert = await supabase
      .from("action_media")
      .insert({
        id: mediaId,
        action_id: params.actionId,
        created_by_clerk_id: params.userId,
        client_upload_id: params.clientUploadId.trim(),
        storage_bucket: ACTION_MEDIA_BUCKET,
        storage_path: buildActionMediaPath(params.actionId, mediaId, params.mimeType),
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
    if (insert.error || !insert.data) {
      const concurrent = await supabase
        .from("action_media")
        .select("*")
        .eq("action_id", params.actionId)
        .eq("created_by_clerk_id", params.userId)
        .eq("client_upload_id", params.clientUploadId.trim())
        .maybeSingle();
      if (concurrent.error || !concurrent.data) {
        throw storageError("La photo ne peut pas être enregistrée.");
      }
      row = concurrent.data as ActionMediaRow;
      isRetry = true;
    } else {
      row = insert.data as ActionMediaRow;
    }
  }

  if (isRetry) {
    assertImmutableRetryMetadata(params.actionId, row, params);
    if (row.upload_state === "ready") {
      await verifyStoredActionMediaObject(supabase, row);
      return { mediaId: row.id, uploadState: "ready" };
    }

    try {
      await verifyStoredActionMediaObject(supabase, row);
      const ready = await markActionMediaReady(supabase, row, transitionDependencies);
      return { mediaId: ready.media.id, uploadState: "ready" };
    } catch (error) {
      if (!(error instanceof ActionMediaError) || error.code !== "storage_missing") {
        throw error;
      }
    }

    const prepared = await prepareRetryState(supabase, row, transitionDependencies);
    if ("media" in prepared) return { mediaId: prepared.media.id, uploadState: "ready" };
    row = prepared;
  }

  let signedUpload: { data: { token?: string } | null; error: unknown };
  try {
    signedUpload = await supabase.storage
      .from(ACTION_MEDIA_BUCKET)
      .createSignedUploadUrl(row.storage_path);
  } catch (error) {
    signedUpload = { data: null, error };
  }
  if (signedUpload.error || !signedUpload.data?.token) {
    const ready = await markActionMediaFailedIfCurrent(
      supabase,
      row,
      "signed_upload_failed",
      transitionDependencies,
    );
    if (ready) return { mediaId: ready.media.id, uploadState: "ready" };
    throw storageError("La photo ne peut pas recevoir son accès d'upload.");
  }

  return {
    mediaId: row.id,
    bucket: ACTION_MEDIA_BUCKET,
    path: row.storage_path,
    token: signedUpload.data.token,
    uploadState: "pending",
  };
}

export async function finalizeActionMedia(
  supabase: SupabaseClient,
  params: {
    userId: string;
    identity: ActionPermissionIdentity | null;
    actionId: string;
    mediaId: string;
  },
): Promise<ActionMediaReadyResult> {
  await assertActionAccess({ supabase, ...params });
  const result = await supabase
    .from("action_media")
    .select("*")
    .eq("id", params.mediaId)
    .eq("action_id", params.actionId)
    .maybeSingle();
  if (result.error) throw storageError("La photo ne peut pas être finalisée.");
  if (!result.data) throw new ActionMediaError("Photo introuvable.", "not_found");
  const row = result.data as ActionMediaRow;
  if (row.storage_bucket !== ACTION_MEDIA_BUCKET) {
    throw new ActionMediaError("Le bucket photo est invalide.", "validation");
  }
  const expectedPath = buildActionMediaPath(params.actionId, row.id, row.mime_type);
  if (row.storage_path !== expectedPath) {
    throw new ActionMediaError("Le chemin photo est invalide.", "storage_invalid");
  }
  if (row.upload_state === "ready") {
    await verifyStoredActionMediaObject(supabase, row);
    return { media: toRecord(row), alreadyReady: true };
  }

  try {
    await verifyStoredActionMediaObject(supabase, row);
  } catch (error) {
    if (error instanceof ActionMediaError && error.code === "storage_missing") {
      const ready = await markActionMediaFailedIfCurrent(
        supabase,
        row,
        "object_missing",
        transitionDependencies,
      );
      if (ready) return ready;
    } else if (error instanceof ActionMediaError && error.code === "storage_invalid") {
      const ready = await markActionMediaFailedIfCurrent(
        supabase,
        row,
        "object_metadata_mismatch",
        transitionDependencies,
      );
      if (ready) return ready;
    }
    throw error;
  }

  return markActionMediaReady(supabase, row, transitionDependencies);
}

export async function listActionMedia(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
    identity: ActionPermissionIdentity | null;
  },
): Promise<ActionMediaReadItem[]> {
  await assertActionAccess({ supabase, ...params });
  const mediaResult = await supabase
    .from("action_media")
    .select("*")
    .eq("action_id", params.actionId)
    .eq("upload_state", "ready")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (mediaResult.error) throw storageError("Les photos ne peuvent pas être chargées.");

  const items: ActionMediaReadItem[] = [];
  for (const rawRow of (mediaResult.data ?? []) as ActionMediaRow[]) {
    const row = toRecord(rawRow);
    const signed = await supabase.storage
      .from(ACTION_MEDIA_BUCKET)
      .createSignedUrl(row.storagePath, ACTION_MEDIA_SIGNED_URL_TTL_SECONDS);
    if (signed.error || !signed.data?.signedUrl) {
      throw storageError("Une URL photo ne peut pas être générée.");
    }
    items.push({ ...row, signedUrl: signed.data.signedUrl });
  }
  return items;
}
