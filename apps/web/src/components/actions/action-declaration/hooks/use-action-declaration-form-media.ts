import { useState } from "react";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import { ACTION_VISION_ESTIMATION_ENABLED, normalizeActionPhotos } from "@/lib/actions/vision";

export function useActionDeclarationFormMedia() {
  const [photoAssets, setPhotoAssets] = useState<ActionPhotoAsset[]>([]);
  const [visionEstimate, setVisionEstimate] = useState<ActionVisionEstimate | null>(null);
  const [visionStatus, setVisionStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");

  async function handlePhotoUpload(files: FileList | null) {
    const selected = files ? Array.from(files) : [];
    if (selected.length === 0) {
      clearPhotos();
      return;
    }
    setVisionStatus("processing");
    try {
      setPhotoAssets(await normalizeActionPhotos(selected));
      setVisionEstimate(null);
      setVisionStatus("idle");
    } catch {
      setVisionStatus("error");
    }
  }

  function clearPhotos() {
    setPhotoAssets([]);
    setVisionEstimate(null);
    setVisionStatus("idle");
  }

  const exposedVisionEstimate = ACTION_VISION_ESTIMATION_ENABLED ? visionEstimate : null;

  return { photoAssets, visionEstimate: exposedVisionEstimate, visionStatus, handlePhotoUpload, clearPhotos };
}
