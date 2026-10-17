"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildStorageBusinessMetadata } from "@/lib/supabase/storage-business-classification";
import { ACTION_MEDIA_BUCKET, ACTION_MEDIA_MAX_SIZE_BYTES, type ActionMediaReadItem } from "./action-media-contract";
import type { ActionPhotoAsset } from "@/lib/actions/types";

export type ActionMediaUploadFailure = { asset: ActionPhotoAsset; message: string };
export type ActionMediaUploadResult = { uploadedCount: number; failed: ActionMediaUploadFailure[] };

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" && body.error.trim() ? body.error : fallback;
  } catch {
    return fallback;
  }
}

function dataUrlToFile(asset: ActionPhotoAsset): File {
  const [header, encoded] = asset.dataUrl.split(",", 2);
  if (!header || !encoded || !header.startsWith("data:")) throw new Error("La photo locale est invalide.");
  const mimeType = header.slice(5).split(";", 1)[0] || asset.mimeType;
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  return new File([bytes], asset.name, { type: mimeType });
}

async function uploadOne(actionId: string, asset: ActionPhotoAsset, sortOrder: number): Promise<void> {
  const file = dataUrlToFile(asset);
  if (file.size <= 0 || file.size > ACTION_MEDIA_MAX_SIZE_BYTES) throw new Error("La photo dépasse la taille autorisée.");
  const intentResponse = await fetch(`/api/actions/${encodeURIComponent(actionId)}/media/intents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      originalName: asset.name,
      mimeType: asset.mimeType,
      sizeBytes: file.size,
      width: asset.width,
      height: asset.height,
      sortOrder,
      clientUploadId: asset.id,
    }),
  });
  if (!intentResponse.ok) throw new Error(await parseError(intentResponse, "La préparation de la photo a échoué."));
  const body = (await intentResponse.json()) as { intent?: { mediaId: string; bucket: string; path: string; token: string; uploadState: "pending" | "ready" } };
  const intent = body.intent;
  if (!intent) throw new Error("La réponse d'upload est incomplète.");
  if (intent.uploadState === "ready") return;
  if (intent.bucket !== ACTION_MEDIA_BUCKET) throw new Error("Le bucket photo retourné est invalide.");

  const upload = await getSupabaseBrowserClient().storage.from(ACTION_MEDIA_BUCKET).uploadToSignedUrl(intent.path, intent.token, file, {
    upsert: true,
    contentType: asset.mimeType,
    cacheControl: "3600",
    metadata: buildStorageBusinessMetadata({
      businessDomain: "pieces_jointes_photo",
      sourceTable: "action_media",
      businessContext: "action_photo",
      extra: { actionId },
    }),
  });
  if (upload.error) throw new Error("La transmission de la photo a échoué.");
  const finalizeResponse = await fetch(`/api/actions/${encodeURIComponent(actionId)}/media/${encodeURIComponent(intent.mediaId)}/finalize`, { method: "POST" });
  if (!finalizeResponse.ok) throw new Error(await parseError(finalizeResponse, "La finalisation de la photo a échoué."));
}

export async function uploadActionMedia(actionId: string, assets: ActionPhotoAsset[]): Promise<ActionMediaUploadResult> {
  const failed: ActionMediaUploadFailure[] = [];
  let uploadedCount = 0;
  for (const [index, asset] of assets.slice(0, 3).entries()) {
    try {
      await uploadOne(actionId, asset, index);
      uploadedCount += 1;
    } catch (error) {
      failed.push({ asset, message: error instanceof Error ? error.message : "La transmission de la photo a échoué." });
    }
  }
  return { uploadedCount, failed };
}

export async function fetchActionMedia(actionId: string): Promise<ActionMediaReadItem[]> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/media`, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(await parseError(response, "Les photos de bilan n'ont pas pu être chargées."));
  const body = (await response.json()) as { items?: unknown };
  if (!Array.isArray(body.items)) throw new Error("La réponse des photos de bilan est invalide.");
  return body.items as ActionMediaReadItem[];
}

export type ActionMediaReadSnapshot = { status: "idle" | "loading" | "ready" | "empty" | "error"; items: ActionMediaReadItem[]; error: Error | null };

export function createActionMediaReadController(actionId: string, onChange: () => void) {
  let snapshot: ActionMediaReadSnapshot = { status: "idle", items: [], error: null };
  let inFlight: Promise<void> | null = null;
  const load = () => {
    if (["loading", "ready", "empty"].includes(snapshot.status)) return inFlight ?? Promise.resolve();
    if (inFlight) return inFlight;
    snapshot = { status: "loading", items: [], error: null }; onChange();
    inFlight = fetchActionMedia(actionId).then((items) => {
      snapshot = { status: items.length ? "ready" : "empty", items, error: null }; onChange();
    }).catch((error: unknown) => {
      snapshot = { status: "error", items: [], error: error instanceof Error ? error : new Error("Lecture impossible.") }; onChange();
    }).finally(() => { inFlight = null; });
    return inFlight;
  };
  return { getSnapshot: () => snapshot, load, retry: () => snapshot.status === "error" ? load() : Promise.resolve() };
}
