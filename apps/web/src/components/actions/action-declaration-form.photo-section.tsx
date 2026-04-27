import type { ActionPhotoAsset, ActionVisionEstimate } from"@/lib/actions/types";

type ActionDeclarationPhotoSectionProps = {
 photoAssets: ActionPhotoAsset[];
 visionEstimate: ActionVisionEstimate | null;
 visionStatus:"idle" |"processing" |"ready" |"error";
 onPhotoUpload: (files: FileList | null) => void;
 onClearPhotos: () => void;
};

export function ActionDeclarationPhotoSection({
 photoAssets,
 visionEstimate,
 visionStatus,
 onPhotoUpload,
 onClearPhotos,
}: ActionDeclarationPhotoSectionProps) {
 return (
 <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
 <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
 <div>
 <p className="cmm-text-caption uppercase tracking-[0.14em] text-emerald-700">
 Photos & vision IA
 </p>
 <p className="cmm-text-small cmm-text-secondary">
 Aide à estimer le poids collecté.
 </p>
 </div>
 {photoAssets.length > 0 ? (
 <button
 type="button"
 onClick={onClearPhotos}
 className="rounded-full bg-red-50 px-3 py-1 cmm-text-caption font-semibold text-red-700 transition hover:bg-red-100"
 >
 Supprimer
 </button>
 ) : null}
 </div>

 <label className="flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-6 text-center cmm-text-small font-semibold text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-50">
 <span>📷 Ajouter des photos</span>
 <input
 type="file"
 accept="image/*"
 multiple
 className="hidden"
 onChange={(event) => onPhotoUpload(event.target.files)}
 />
 </label>

 {photoAssets.length > 0 ? (
 <div className="mt-3 flex flex-wrap gap-2">
 {photoAssets.map((asset, index) => (
 <div
 key={index}
 className="h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
 >
 <img
 src={asset.dataUrl}
 alt={`Photo ${index + 1}`}
 className="h-full w-full object-cover"
 />
 </div>
 ))}
 </div>
 ) : null}

 <div className="mt-3 flex flex-wrap items-center gap-2 cmm-text-caption">
 <span className="rounded-full bg-white px-3 py-1 font-semibold text-emerald-900">
 {visionStatus ==="processing"
 ?"analyse..."
 : visionStatus ==="ready"
 ?"prêt"
 : visionStatus ==="error"
 ?"erreur"
 :"en attente"}
 </span>
 {visionEstimate ? (
 <span className="text-emerald-800">
 Estimation : {visionEstimate.estimatedWasteKg.toFixed(1)} kg
 </span>
 ) : null}
 </div>
 </div>
 );
}
