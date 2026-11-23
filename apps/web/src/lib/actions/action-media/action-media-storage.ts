import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTION_MEDIA_BUCKET } from "./action-media-contract";
import {
  isMissingMediaStorageObjectError,
  verifyMediaStorageObject,
  type MediaStorageVerification,
} from "../media/media-storage-verification";

export type ActionMediaStorageVerification = MediaStorageVerification;

export async function removeActionMediaObjectIfPresent(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<void> {
  const storage = supabase.storage.from(ACTION_MEDIA_BUCKET);
  const existing = await storage.info(storagePath);
  if (existing.error && !isMissingMediaStorageObjectError(existing.error)) {
    throw new Error("Le stockage de la référence ne peut pas être vérifié.");
  }
  if (existing.error || !existing.data) return;

  const removed = await storage.remove([storagePath]);
  if (removed.error && !isMissingMediaStorageObjectError(removed.error)) {
    throw new Error("La référence ne peut pas être supprimée du stockage.");
  }
}

export async function verifyActionMediaStorageObject(
  supabase: SupabaseClient,
  params: { storagePath: string; sizeBytes: number; mimeType: string },
): Promise<ActionMediaStorageVerification> {
  return verifyMediaStorageObject(supabase, { ...params, bucket: ACTION_MEDIA_BUCKET });
}

export async function verifyActionRouteReferenceObject(
  supabase: SupabaseClient,
  params: { storagePath: string; sizeBytes: number; mimeType: string; width?: number | null; height?: number | null },
): Promise<MediaStorageVerification> {
  const metadata = await verifyActionMediaStorageObject(supabase, params);
  if (metadata !== "valid") return metadata;

  const downloaded = await supabase.storage.from(ACTION_MEDIA_BUCKET).download(params.storagePath);
  if (downloaded.error) {
    const details = downloaded.error as { status?: unknown; statusCode?: unknown; code?: unknown };
    return details.status === 404 || details.statusCode === 404 || details.code === "404" || details.code === "not_found"
      ? "missing"
      : "error";
  }
  if (!downloaded.data) return "missing";

  try {
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    if (bytes.byteLength !== params.sizeBytes) return "invalid";
    const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
    const detectedMime = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "image/jpeg"
      : bytes.length >= 8 && bytes[0] === 0x89 && ascii(1, 4) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a ? "image/png"
        : bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP" ? "image/webp"
          : null;
    if (detectedMime !== params.mimeType) return "invalid";

    const { default: sharp } = await import("sharp");
    const image = await sharp(Buffer.from(bytes), { limitInputPixels: 100_000_000, failOn: "error" }).metadata();
    const decodedMime = image.format === "jpeg" ? "image/jpeg" : image.format === "png" ? "image/png" : image.format === "webp" ? "image/webp" : null;
    return decodedMime === params.mimeType
      && (params.width == null || image.width === params.width)
      && (params.height == null || image.height === params.height)
      ? "valid"
      : "invalid";
  } catch {
    return "invalid";
  }
}
