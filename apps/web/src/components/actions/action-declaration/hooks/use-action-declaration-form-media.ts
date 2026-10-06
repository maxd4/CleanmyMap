import { useEffect, useState } from "react";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import { normalizeActionPhotos, inferActionVisionEstimate } from "@/lib/actions/vision";

type ActionDeclarationFormMediaParams = {
  locationLabel: string;
  placeType: string;
  volunteersCount: string;
  durationMinutes: string;
};

export function useActionDeclarationFormMedia({
  locationLabel,
  placeType,
  volunteersCount,
  durationMinutes,
}: ActionDeclarationFormMediaParams) {
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
    } catch {
      setVisionStatus("error");
    }
  }

  function clearPhotos() {
    setPhotoAssets([]);
    setVisionEstimate(null);
    setVisionStatus("idle");
  }

  useEffect(() => {
    let active = true;
    if (photoAssets.length === 0) return;
    inferActionVisionEstimate(photoAssets, {
      locationLabel,
      placeType,
      volunteersCount: Number(volunteersCount),
      durationMinutes: Number(durationMinutes),
    }).then((result) => {
      if (!active) return;
      setVisionEstimate(result);
      setVisionStatus("ready");
    }).catch(() => {
      if (!active) return;
      setVisionStatus("error");
    });
    return () => { active = false; };
  }, [photoAssets, locationLabel, placeType, volunteersCount, durationMinutes]);

  return { photoAssets, visionEstimate, visionStatus, handlePhotoUpload, clearPhotos };
}
