"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildStorageBusinessMetadata } from "@/lib/supabase/storage-business-classification";
import {
  ACTION_MEDIA_ALLOWED_MIME_TYPES,
  ACTION_MEDIA_BUCKET,
  ACTION_MEDIA_MAX_SIZE_BYTES,
  type ActionMediaReadItem,
} from "./action-media-contract";

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch { return fallback; }
}

export async function uploadActionRouteReference(actionId: string, file: File): Promise<ActionMediaReadItem> {
  if (!ACTION_MEDIA_ALLOWED_MIME_TYPES.includes(file.type as (typeof ACTION_MEDIA_ALLOWED_MIME_TYPES)[number])) {
    throw new Error("Choisissez une image JPEG, PNG ou WebP.");
  }
  if (!file.size || file.size > ACTION_MEDIA_MAX_SIZE_BYTES) throw new Error("L’image dépasse la taille maximale de 5 Mo.");
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/media/intents`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose: "route_reference", originalName: file.name, mimeType: file.type, sizeBytes: file.size, clientUploadId: crypto.randomUUID() }),
  });
  if (!response.ok) throw new Error(await responseError(response, "La préparation de l’image a échoué."));
  const body = await response.json() as { intent?: { mediaId: string; bucket: string; path: string; token: string; uploadState: "pending" | "ready" } };
  const intent = body.intent;
  if (!intent || intent.bucket !== ACTION_MEDIA_BUCKET) throw new Error("La réponse d’upload est invalide.");
  if (intent.uploadState !== "ready") {
    const uploaded = await getSupabaseBrowserClient().storage.from(ACTION_MEDIA_BUCKET).uploadToSignedUrl(intent.path, intent.token, file, {
      upsert: false, contentType: file.type, cacheControl: "3600",
      metadata: buildStorageBusinessMetadata({ businessDomain: "pieces_jointes_photo", sourceTable: "action_media", businessContext: "action_route_reference", extra: { actionId } }),
    });
    if (uploaded.error) throw new Error("La transmission de l’image a échoué.");
    const finalized = await fetch(`/api/actions/${encodeURIComponent(actionId)}/media/${encodeURIComponent(intent.mediaId)}/finalize`, { method: "POST" });
    if (!finalized.ok) {
      const message = await responseError(finalized, "La vérification de l’image a échoué.");
      try {
        await deleteActionRouteReference(actionId, intent.mediaId);
      } catch {
        // The server leaves a retryable tombstone when cleanup itself fails.
      }
      throw new Error(message);
    }
  }
  const items = await readActionRouteReferences(actionId);
  const item = items.find((candidate) => candidate.id === intent.mediaId && candidate.signedUrl);
  if (!item) throw new Error("L’image enregistrée n’a pas pu être relue.");
  return item;
}

export async function readActionRouteReferences(actionId: string): Promise<ActionMediaReadItem[]> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/media?purpose=route_reference`, { cache: "no-store" });
  if (!response.ok) throw new Error(await responseError(response, "La référence privée n’a pas pu être chargée."));
  const body = await response.json() as { items?: ActionMediaReadItem[] };
  return body.items ?? [];
}

export async function deleteActionRouteReference(actionId: string, mediaId: string): Promise<void> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/media/intents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "remove_route_reference", mediaId }),
  });
  if (!response.ok) throw new Error(await responseError(response, "La suppression de l’image a échoué."));
}
