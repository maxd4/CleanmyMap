import { useRef, useState, type MutableRefObject } from "react";
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

type ActionDeclarationFormMediaParams = {
  onPhotoMutation?: () => void;
};

type PhotoUploadPreparationParams = {
  files: FileList | null;
  photoAssetsRef: MutableRefObject<ActionPhotoAsset[]>;
  photoErrorRef: MutableRefObject<string | null>;
  pendingPreparationCountRef: MutableRefObject<number>;
  mutationVersionRef: MutableRefObject<number>;
  commitPhotoAssets: (next: ActionPhotoAsset[]) => void;
  commitPhotoError: (next: string | null) => void;
  setPhotoPreparationPending: (pending: boolean) => void;
  setVisionStatus: (status: "idle" | "processing" | "ready" | "error") => void;
  setVisionEstimate: (estimate: ActionVisionEstimate | null) => void;
  onPhotoMutation?: () => void;
};

async function preparePhotoUpload({
  files,
  photoAssetsRef,
  photoErrorRef,
  pendingPreparationCountRef,
  mutationVersionRef,
  commitPhotoAssets,
  commitPhotoError,
  setPhotoPreparationPending,
  setVisionStatus,
  setVisionEstimate,
  onPhotoMutation,
}: PhotoUploadPreparationParams) {
  const selected = files ? Array.from(files) : [];
  if (selected.length === 0) return;
  const availableSlots = ACTION_MEDIA_MAX_MEDIA - photoAssetsRef.current.length - pendingPreparationCountRef.current;
  if (availableSlots <= 0) {
    commitPhotoError(`La limite de ${ACTION_MEDIA_MAX_MEDIA} photos est atteinte. Supprimez ou remplacez une photo.`);
    setVisionStatus("error");
    return;
  }
  const acceptedFiles = selected.slice(0, availableSlots);
  onPhotoMutation?.();
  const operationVersion = mutationVersionRef.current;
  pendingPreparationCountRef.current += acceptedFiles.length;
  setPhotoPreparationPending(true);
  commitPhotoError(null);
  setVisionStatus("processing");
  const prepared: ActionPhotoAsset[] = [];
  const failures: string[] = [];
  try {
    for (const file of acceptedFiles) {
      try {
        prepared.push(await normalizeOnePhoto(file));
      } catch (error) {
        failures.push(error instanceof Error ? error.message : "Une photo n’a pas pu être préparée.");
      }
    }
  } finally {
    pendingPreparationCountRef.current -= acceptedFiles.length;
    if (pendingPreparationCountRef.current === 0) setPhotoPreparationPending(false);
  }
  if (operationVersion !== mutationVersionRef.current) {
    if (pendingPreparationCountRef.current === 0) setVisionStatus("idle");
    return;
  }
  const current = photoAssetsRef.current;
  const retained = prepared.slice(0, ACTION_MEDIA_MAX_MEDIA - current.length);
  const overflowCount = prepared.length - retained.length;
  commitPhotoAssets([...current, ...retained]);
  setVisionEstimate(null);
  const rejectedCount = selected.length - acceptedFiles.length + overflowCount;
  const messages = [
    ...failures,
    rejectedCount > 0
      ? `Sélection limitée à ${ACTION_MEDIA_MAX_MEDIA} photos : ${rejectedCount} photo(s) refusée(s), car la limite est atteinte ou une préparation concurrente occupait les places disponibles.`
      : null,
  ].filter((message): message is string => Boolean(message));
  if (messages.length > 0 || !photoErrorRef.current) {
    commitPhotoError(messages.length > 0 ? messages.join(" ") : null);
  }
  setVisionStatus(pendingPreparationCountRef.current > 0 ? "processing" : messages.length > 0 ? "error" : "idle");
}

export function useActionDeclarationFormMedia({ onPhotoMutation }: ActionDeclarationFormMediaParams = {}) {
  const [photoAssets, setPhotoAssets] = useState<ActionPhotoAsset[]>([]);
  const [visionEstimate, setVisionEstimate] = useState<ActionVisionEstimate | null>(null);
  const [visionStatus, setVisionStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoPreparationPending, setPhotoPreparationPending] = useState(false);
  const photoErrorRef = useRef<string | null>(null);
  const photoAssetsRef = useRef<ActionPhotoAsset[]>([]);
  const pendingPreparationCountRef = useRef(0);
  const mutationVersionRef = useRef(0);

  function commitPhotoAssets(next: ActionPhotoAsset[]) {
    photoAssetsRef.current = next;
    setPhotoAssets(next);
  }

  function commitPhotoError(next: string | null) {
    photoErrorRef.current = next;
    setPhotoError(next);
  }

  const handlePhotoUpload = (files: FileList | null) => preparePhotoUpload({ files, photoAssetsRef, photoErrorRef, pendingPreparationCountRef, mutationVersionRef, commitPhotoAssets, commitPhotoError, setPhotoPreparationPending, setVisionStatus, setVisionEstimate, onPhotoMutation });

  async function handlePhotoReplace(photoId: string, file: File | null) {
    if (!file) return;
    const operationVersion = ++mutationVersionRef.current;
    setVisionStatus("processing");
    try {
      const replacement = await normalizeOnePhoto(file);
      if (operationVersion !== mutationVersionRef.current) return;
      commitPhotoAssets(photoAssetsRef.current.map((asset) => asset.id === photoId ? { ...replacement, id: photoId } : asset));
      onPhotoMutation?.();
      commitPhotoError(null);
      setVisionEstimate(null);
      setVisionStatus("idle");
    } catch (error) {
      commitPhotoError(error instanceof Error ? error.message : "La photo de remplacement n’a pas pu être préparée.");
      setVisionStatus("error");
    }
  }

  function removePhoto(photoId: string) {
    mutationVersionRef.current += 1;
    if (photoAssetsRef.current.some((asset) => asset.id === photoId)) onPhotoMutation?.();
    commitPhotoAssets(photoAssetsRef.current.filter((asset) => asset.id !== photoId));
    commitPhotoError(null);
    setVisionEstimate(null);
    setVisionStatus("idle");
  }

  function clearPhotos() {
    mutationVersionRef.current += 1;
    if (photoAssetsRef.current.length > 0) onPhotoMutation?.();
    commitPhotoAssets([]);
    setVisionEstimate(null);
    commitPhotoError(null);
    setVisionStatus("idle");
  }

  const exposedVisionEstimate = ACTION_VISION_ESTIMATION_ENABLED ? visionEstimate : null;

  return {
    photoAssets,
    visionEstimate: exposedVisionEstimate,
    visionStatus,
    photoError,
    photoPreparationPending,
    handlePhotoUpload,
    handlePhotoReplace,
    removePhoto,
    clearPhotos,
  };
}
