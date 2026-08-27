import type { ActionPhotoAsset, ActionVisionEstimate } from"@/lib/actions/types";
import type { FormState } from"./action-declaration-form.model";

function uniqueMessages(messages: string[]): string[] {
 return Array.from(new Set(messages));
}

export type ActionDataQualityResult = {
 warnings: string[];
};

type ComputeActionDataQualityParams = {
 form: FormState;
 declarationMode:"complete";
 recordType?: "action" |"clean_place" |"spot";
 hasLocationProof: boolean;
 hasDrawingProof: boolean;
 photoAssets: ActionPhotoAsset[];
 visionEstimate?: ActionVisionEstimate | null;
};

export function computeActionDataQuality({
 declarationMode,
 form,
 recordType,
 hasLocationProof,
 hasDrawingProof,
 photoAssets,
}: ComputeActionDataQualityParams): ActionDataQualityResult {
 const warnings: string[] = [];
 const isCleanPlaceMode = recordType === "clean_place" || recordType === "spot";

 if (!hasLocationProof && declarationMode ==="complete") {
  warnings.push(
"Une position GPS ou un tracé de parcours précis facilite la traçabilité du signal.",
 );
 }

 if (!hasDrawingProof && declarationMode ==="complete") {
 warnings.push(
"Un dessin ou un itinéraire visible aide à vérifier le lieu exact.",
 );
 }

 if (photoAssets.length === 0 && declarationMode ==="complete") {
 warnings.push(
 isCleanPlaceMode
 ? "Ajouter au moins une photo renforce la preuve du lieu propre."
 : "Ajouter des photos ne bloque pas l'envoi et documente la provenance de la collecte.",
 );
 }

 const hasExplicitDetails =
 form.notes.trim().length > 10 ||
 form.wastePlastiqueKg.trim().length > 0 ||
 form.wasteVerreKg.trim().length > 0 ||
 form.wasteMetalKg.trim().length > 0 ||
 form.wasteMixteKg.trim().length > 0;

 if (!hasExplicitDetails && declarationMode ==="complete") {
 warnings.push(
 isCleanPlaceMode
 ? "Une note courte aide à contextualiser le lieu propre."
 : "Plus de détails de tri ou un commentaire facilitent la relecture de la déclaration.",
 );
 }

 return {
 warnings: uniqueMessages(warnings),
 };
}
