import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTION_MEDIA_BUCKET } from "./action-media-contract";
import {
  verifyMediaStorageObject,
  type MediaStorageVerification,
} from "../media/media-storage-verification";

export type ActionMediaStorageVerification = MediaStorageVerification;

export async function verifyActionMediaStorageObject(
  supabase: SupabaseClient,
  params: { storagePath: string; sizeBytes: number; mimeType: string },
): Promise<ActionMediaStorageVerification> {
  return verifyMediaStorageObject(supabase, { ...params, bucket: ACTION_MEDIA_BUCKET });
}
