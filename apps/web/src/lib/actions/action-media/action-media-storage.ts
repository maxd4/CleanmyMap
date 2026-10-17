import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTION_MEDIA_BUCKET } from "./action-media-contract";

type ActionMediaStorageObjectInfo = {
  size?: number | string | null;
  contentType?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ActionMediaStorageVerification = "valid" | "missing" | "invalid" | "error";

function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  return (
    candidate.status === 404 ||
    candidate.statusCode === 404 ||
    candidate.code === "404" ||
    candidate.code === "not_found"
  );
}

function storageMimeType(data: ActionMediaStorageObjectInfo): string | null {
  const metadataMimeType = data.metadata?.mimetype ?? data.metadata?.contentType;
  const value = metadataMimeType ?? data.contentType;
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

function storageSizeBytes(data: ActionMediaStorageObjectInfo): number | null {
  const value = data.metadata?.size ?? data.size;
  const size = typeof value === "number" ? value : Number(value);
  return Number.isInteger(size) && size > 0 ? size : null;
}

export async function verifyActionMediaStorageObject(
  supabase: SupabaseClient,
  params: { storagePath: string; sizeBytes: number; mimeType: string },
): Promise<ActionMediaStorageVerification> {
  const objectInfo = await supabase.storage
    .from(ACTION_MEDIA_BUCKET)
    .info(params.storagePath);
  if (objectInfo.error) return isMissingObjectError(objectInfo.error) ? "missing" : "error";
  if (!objectInfo.data) return "missing";

  const data = objectInfo.data as ActionMediaStorageObjectInfo;
  return storageSizeBytes(data) === params.sizeBytes && storageMimeType(data) === params.mimeType
    ? "valid"
    : "invalid";
}
