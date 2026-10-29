import { useState } from "react";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import { ACTION_VISION_ESTIMATION_ENABLED, normalizeActionPhotos } from "@/lib/actions/vision";
import {
  ACTION_MEDIA_ALLOWED_MIME_TYPES,
  ACTION_MEDIA_MAX_MEDIA,
  ACTION_MEDIA_MAX_SIZE_BYTES,
} from "@/lib/actions/action-media/action-media-contract";

function validatePhotoAsset(asset: ActionPhotoAsset): void {
  if (!ACTION_MEDIA_ALLOWED_MIME_TYPES.includes(asset.mimeType as (typeof ACTION_MEDIA_ALLOWED_MIME_TYPES)[number])) {
    throw new Error("Format photo non pris en charge. Utilisez JPG, PNG ou WebP.");
  }
  if (asset.size <= 0 || asset.size > ACTION_MEDIA_MAX_SIZE_BYTES) {
    throw new Error("La photo dépasse la taille autorisée de 5 Mo.");
  }
}

async function normalizeOnePhoto(file: File): Promise<ActionPhotoAsset> {
  const asset = (await normalizeActionPhotos([file]))[0];
  if (!asset) throw new Error("La photo sélectionnée est invalide.");
  validatePhotoAsset(asset);
  return asset;
}

export function useActionDeclarationFormMedia() {
  const [photoAssets, setPhotoAssets] = useState<ActionPhotoAsset[]>([]);
  const [visionEstimate, setVisionEstimate] = useState<ActionVisionEstimate | null>(null);
  const [visionStatus, setVisionStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function handlePhotoUpload(files: FileList | null) {
    const selected = files ? Array.from(files) : [];
    if (selected.length === 0) return;
    const availableSlots = ACTION_MEDIA_MAX_MEDIA - photoAssets.length;
    if (availableSlots <= 0) {
      setPhotoError(`La limite de ${ACTION_MEDIA_MAX_MEDIA} photos est atteinte. Supprimez ou remplacez une photo.`);
      setVisionStatus("error");
      return;
    }

    setVisionStatus("processing");
    const accepted = selected.slice(0, availableSlots);
    const prepared: ActionPhotoAsset[] = [];
    const failures: string[] = [];
    for (const file of accepted) {
      try {
        prepared.push(await normalizeOnePhoto(file));
      } catch (error) {
        failures.push(error instanceof Error ? error.message : "Une photo n’a pas pu être préparée.");
      }
    }
    setPhotoAssets((current) => [...current, ...prepared].slice(0, ACTION_MEDIA_MAX_MEDIA));
    setVisionEstimate(null);
    const wasTruncated = selected.length > accepted.length;
    const messages = [...failures, wasTruncated ? `Sélection limitée à ${ACTION_MEDIA_MAX_MEDIA} photos : ${accepted.length} ajoutée(s).` : null].filter(Boolean);
    setPhotoError(messages.length > 0 ? messages.join(" ") : null);
    setVisionStatus(messages.length > 0 ? "error" : "idle");
  }

  async function handlePhotoReplace(photoId: string, file: File | null) {
    if (!file) return;
    setVisionStatus("processing");
    try {
      const replacement = await normalizeOnePhoto(file);
      setPhotoAssets((current) => current.map((asset) => asset.id === photoId ? { ...replacement, id: photoId } : asset));
      setPhotoError(null);
      setVisionEstimate(null);
      setVisionStatus("idle");
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "La photo de remplacement n’a pas pu être préparée.");
      setVisionStatus("error");
    }
  }

  function removePhoto(photoId: string) {
    setPhotoAssets((current) => current.filter((asset) => asset.id !== photoId));
    setPhotoError(null);
    setVisionEstimate(null);
    setVisionStatus("idle");
  }

  function clearPhotos() {
    setPhotoAssets([]);
    setVisionEstimate(null);
    setPhotoError(null);
    setVisionStatus("idle");
  }

  const exposedVisionEstimate = ACTION_VISION_ESTIMATION_ENABLED ? visionEstimate : null;

  return {
    photoAssets,
    visionEstimate: exposedVisionEstimate,
    visionStatus,
    photoError,
    handlePhotoUpload,
    handlePhotoReplace,
    removePhoto,
    clearPhotos,
  };
}
