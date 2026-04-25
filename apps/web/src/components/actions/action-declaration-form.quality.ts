import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import type { FormState } from "./action-declaration-form.model";
import { estimateWasteKg } from "./action-declaration-form.estimation";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function uniqueMessages(messages: string[]): string[] {
  return Array.from(new Set(messages));
}

export type ActionDataQualityResult = {
  score: number;
  warnings: string[];
};

type ComputeActionDataQualityParams = {
  form: FormState;
  declarationMode: "quick" | "complete";
  hasLocationProof: boolean;
  hasDrawingProof: boolean;
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
};

export function computeActionDataQuality({
  declarationMode,
  form,
  hasLocationProof,
  hasDrawingProof,
  photoAssets,
  visionEstimate,
}: ComputeActionDataQualityParams): ActionDataQualityResult {
  const warnings: string[] = [];
  let score = 30;

  if (visionEstimate) {
    score += 5;
  }

  if (form.locationLabel.trim().length >= 2) {
    score += 10;
  }

  if (hasLocationProof) {
    score += 20;
  } else if (declarationMode === "complete") {
    warnings.push(
      "Une position GPS ou un tracé de parcours précis améliore la fiabilité du signal.",
    );
  }

  if (hasDrawingProof) {
    score += 20;
  } else if (declarationMode === "complete") {
    warnings.push(
      "Un dessin ou un itinéraire visible aide à vérifier le lieu exact.",
    );
  }

  if (photoAssets.length > 0) {
    score += 15;
  } else if (declarationMode === "complete") {
    warnings.push(
      "Ajouter des photos ne bloque pas l'envoi et renforce la confiance dans le volume.",
    );
  }

  const hasExplicitDetails =
    form.notes.trim().length > 10 ||
    form.wastePlastiqueKg.trim().length > 0 ||
    form.wasteVerreKg.trim().length > 0 ||
    form.wasteMetalKg.trim().length > 0 ||
    form.wasteMixteKg.trim().length > 0;

  if (hasExplicitDetails) {
    score += 5;
  } else if (declarationMode === "complete") {
    warnings.push(
      "Plus de détails de tri ou un commentaire enrichissent la déclaration.",
    );
  }

  if (form.visionBagsCount.trim().length > 0 || form.visionFillLevel || form.visionDensity) {
    score += 5;
  }

  const actualWasteKg = Number(form.wasteKg);
  if (Number.isFinite(actualWasteKg) && actualWasteKg > 0) {
    const estimatedWasteKg = estimateWasteKg({
      volunteersCount: form.volunteersCount,
      durationMinutes: form.durationMinutes,
      placeType: form.placeType,
      wasteMegotsKg: form.wasteMegotsKg,
    });
    const deviation = Math.abs(actualWasteKg - estimatedWasteKg) / Math.max(1, estimatedWasteKg);

    if (deviation <= 0.4) {
      score += 20;
    } else if (deviation <= 0.7) {
      score += 10;
      warnings.push(
        "La quantité déclarée est moyenne par rapport aux bénévoles et à la durée, vérifie si c'est bien le bon ordre de grandeur.",
      );
    } else {
      warnings.push(
        "Le poids déclaré paraît incohérent avec le nombre de bénévoles et la durée.",
      );
    }
  }

  return {
    score: clamp(score, 0, 100),
    warnings: uniqueMessages(warnings),
  };
}
