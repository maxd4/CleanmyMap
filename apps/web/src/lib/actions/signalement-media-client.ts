"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  compressImageFile,
  readImageDimensions,
} from "@/lib/media/image-compression";
import {
  buildStorageBusinessMetadata,
} from "@/lib/supabase/storage-business-classification";
import {
  SIGNALEMENT_EVIDENCE_BUCKET,
  SIGNALEMENT_EVIDENCE_MAX_SIZE_BYTES,
  type SignalementEvidenceMimeType,
} from "./signalement-media-contract";

export type SignalementEvidenceUploadItem = {
  file: File;
  clientUploadId: string;
};

export type SignalementEvidenceUploadResult = {
  uploadedCount: number;
  failed: Array<{ item: SignalementEvidenceUploadItem; message: string }>;
};

function randomClientUploadId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `signalement-photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSignalementEvidenceUploadItem(file: File): SignalementEvidenceUploadItem {
  return { file, clientUploadId: randomClientUploadId() };
}

function isAllowedMimeType(value: string): value is SignalementEvidenceMimeType {
  return value === "image/jpeg" || value === "image/png" || value === "image/webp";
}

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" && body.error.trim() ? body.error : fallback;
  } catch {
    return fallback;
  }
}

async function uploadOne(
  signalementId: string,
  item: SignalementEvidenceUploadItem,
  sortOrder: number,
): Promise<void> {
  const preparedFile = await compressImageFile(item.file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
  });
  const mimeType = preparedFile.type || item.file.type;
  if (!isAllowedMimeType(mimeType)) {
    throw new Error("Le format de photo n'est pas accepté.");
  }
  if (preparedFile.size <= 0 || preparedFile.size > SIGNALEMENT_EVIDENCE_MAX_SIZE_BYTES) {
    throw new Error("La photo dépasse la taille autorisée.");
  }
  const dimensions = await readImageDimensions(preparedFile).catch(() => ({
    width: null,
    height: null,
  }));

  const intentResponse = await fetch(
    `/api/signalements/${encodeURIComponent(signalementId)}/media/intents`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalName: preparedFile.name,
        mimeType,
        sizeBytes: preparedFile.size,
        width: dimensions.width,
        height: dimensions.height,
        sortOrder,
        clientUploadId: item.clientUploadId,
      }),
    },
  );
  if (!intentResponse.ok) {
    throw new Error(await parseError(intentResponse, "La préparation de la photo a échoué."));
  }
  const intentBody = (await intentResponse.json()) as {
    intent?: {
      mediaId: string;
      bucket: string;
      path: string;
      token: string;
      uploadState: "pending" | "ready";
    };
  };
  const intent = intentBody.intent;
  if (!intent) {
    throw new Error("La réponse d'upload est incomplète.");
  }
  if (intent.uploadState === "ready") {
    return;
  }
  if (intent.bucket !== SIGNALEMENT_EVIDENCE_BUCKET) {
    throw new Error("Le bucket de preuve retourné est invalide.");
  }

  const storage = getSupabaseBrowserClient();
  const upload = await storage.storage
    .from(SIGNALEMENT_EVIDENCE_BUCKET)
    .uploadToSignedUrl(intent.path, intent.token, preparedFile, {
      upsert: true,
      contentType: mimeType,
      cacheControl: "3600",
      metadata: buildStorageBusinessMetadata({
        businessDomain: "pieces_jointes_photo",
        sourceTable: "trash_spotter_spots",
        businessContext: "signalement_evidence",
        extra: { signalementId },
      }),
    });
  if (upload.error) {
    throw new Error("La transmission de la photo a échoué.");
  }

  const finalizeResponse = await fetch(
    `/api/signalements/${encodeURIComponent(signalementId)}/media/${encodeURIComponent(intent.mediaId)}/finalize`,
    { method: "POST" },
  );
  if (!finalizeResponse.ok) {
    throw new Error(await parseError(finalizeResponse, "La finalisation de la photo a échoué."));
  }
}

export async function uploadSignalementEvidence(
  signalementId: string,
  items: SignalementEvidenceUploadItem[],
): Promise<SignalementEvidenceUploadResult> {
  const failed: SignalementEvidenceUploadResult["failed"] = [];
  let uploadedCount = 0;
  for (const [index, item] of items.slice(0, 3).entries()) {
    try {
      await uploadOne(signalementId, item, index);
      uploadedCount += 1;
    } catch (error) {
      failed.push({
        item,
        message: error instanceof Error ? error.message : "La transmission de la photo a échoué.",
      });
    }
  }
  return { uploadedCount, failed };
}
