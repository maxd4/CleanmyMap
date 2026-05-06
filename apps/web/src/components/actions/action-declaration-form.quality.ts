import type { ActionPhotoAsset, ActionQualityGrade, ActionVisionEstimate } from"@/lib/actions/types";
import type { FormState } from"./action-declaration-form.model";
import { estimateWasteKg } from"./action-declaration-form.estimation";

function clamp(value: number, min: number, max: number): number {
 return Math.min(max, Math.max(min, value));
}

function uniqueMessages(messages: string[]): string[] {
 return Array.from(new Set(messages));
}

export type ActionDataQualityResult = {
 score: number;
 level: ActionQualityGrade;
 warnings: string[];
};

type ComputeActionDataQualityParams = {
 form: FormState;
 declarationMode:"quick" |"complete";
 recordType?: "action" |"clean_place" |"spot";
 hasLocationProof: boolean;
 hasDrawingProof: boolean;
 photoAssets: ActionPhotoAsset[];
 visionEstimate: ActionVisionEstimate | null;
};

export function computeActionDataQuality({
 declarationMode,
 form,
 recordType,
 hasLocationProof,
 hasDrawingProof,
 photoAssets,
 visionEstimate,
}: ComputeActionDataQualityParams): ActionDataQualityResult {
 const warnings: string[] = [];
 let score = 30;
 const isCleanPlaceMode = recordType === "clean_place" || recordType === "spot";

 if (visionEstimate) {
 score += 5;
 }

 if (form.locationLabel.trim().length >= 2) {
 score += 10;
 }

 if (hasLocationProof) {
 score += 20;
 } else if (declarationMode ==="complete") {
 warnings.push(
"Une position GPS ou un tracé de parcours précis améliore la fiabilité du signal.",
 );
 }

 if (hasDrawingProof) {
 score += isCleanPlaceMode ? 10 : 20;
 } else if (declarationMode ==="complete") {
 warnings.push(
"Un dessin ou un itinéraire visible aide à vérifier le lieu exact.",
 );
 }

 if (photoAssets.length > 0) {
 score += 15;
 } else if (declarationMode ==="complete") {
 warnings.push(
 isCleanPlaceMode
 ? "Ajouter au moins une photo renforce la preuve du lieu propre."
 : "Ajouter des photos ne bloque pas l'envoi et renforce la confiance dans le volume.",
 );
 }

 const hasExplicitDetails =
 form.notes.trim().length > 10 ||
 form.wastePlastiqueKg.trim().length > 0 ||
 form.wasteVerreKg.trim().length > 0 ||
 form.wasteMetalKg.trim().length > 0 ||
 form.wasteMixteKg.trim().length > 0;

 if (hasExplicitDetails) {
 score += isCleanPlaceMode ? 3 : 5;
 } else if (declarationMode ==="complete") {
 warnings.push(
 isCleanPlaceMode
 ? "Une note courte aide à contextualiser le lieu propre."
 : "Plus de détails de tri ou un commentaire enrichissent la déclaration.",
 );
 }

 if (!isCleanPlaceMode && (form.visionBagsCount.trim().length > 0 || form.visionFillLevel || form.visionDensity)) {
 score += 5;
 }

 const actualWasteKg = Number(form.wasteKg);
 if (!isCleanPlaceMode && Number.isFinite(actualWasteKg) && actualWasteKg > 0) {
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

 const normalizedScore = clamp(score, 0, 100);

 return {
 score: normalizedScore,
 level: normalizedScore >= 80 ? "A" : normalizedScore >= 55 ? "B" : "C",
 warnings: uniqueMessages(warnings),
 };
}
