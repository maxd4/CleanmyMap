"use client";

import Image from "next/image";
import { Camera, Trash2 } from "lucide-react";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

type HarvestPhotoSectionProps = {
  photoAssets: ActionPhotoAsset[];
  /** Kept for the existing form/view-model contract; the engine is disabled here. */
  visionEstimate: ActionVisionEstimate | null;
  visionStatus: "idle" | "processing" | "ready" | "error";
  /** Kept for the existing form/view-model contract; never rendered while disabled. */
  estimatedWasteKgInterval: [number, number] | null;
  hasPhotos: boolean;
  onPhotoUpload: (files: FileList | null) => void;
  onClearPhotos: () => void;
};

export function HarvestPhotoSection({
  photoAssets,
  visionStatus,
  hasPhotos,
  onPhotoUpload,
  onClearPhotos,
}: HarvestPhotoSectionProps) {
  return (
    <div className="space-y-4">
      {/* ── Photo upload ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-violet-100 flex items-center justify-center">
              <Camera size={15} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Photos de bilan</p>
              <p className="text-xs text-slate-400">Optionnelles — documentent la collecte</p>
            </div>
          </div>
          {hasPhotos && (
            <button
              type="button"
              onClick={onClearPhotos}
              aria-label="Supprimer les photos de bilan"
              className="flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
            >
              <Trash2 size={13} />
              Supprimer
            </button>
          )}
        </div>

        {!hasPhotos ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Upload fichier */}
            <label className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 cursor-pointer transition-all hover:border-violet-300 hover:bg-violet-50/40"
            )}>
              <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-violet-500 shadow-sm">
                <Camera size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-700 text-center">Choisir un fichier</p>
              <p className="text-xs text-slate-400 text-center">JPG, PNG, WebP · 3 photos · 5 Mo max</p>
              <input
                id="harvest-photos"
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => onPhotoUpload(e.target.files)}
              />
            </label>

            {/* Prise de photo mobile */}
            <label className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 cursor-pointer transition-all hover:border-violet-300 hover:bg-violet-50/40"
            )}>
              <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-violet-500 shadow-sm">
                <Camera size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-700 text-center">Prendre une photo</p>
              <p className="text-xs text-slate-400 text-center">Caméra en direct</p>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={(e) => onPhotoUpload(e.target.files)}
              />
            </label>
          </div>
        ) : (
          <div className="relative">
            {/* Aperçu photos */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photoAssets.map((asset, i) => (
                <Image
                  key={i}
                  src={asset.dataUrl}
                  alt={`Photo ${i + 1}`}
                  width={120}
                  height={120}
                  unoptimized
                  className="h-24 w-24 shrink-0 rounded-xl object-cover border border-slate-200 shadow-sm"
                />
              ))}
            </div>

          </div>
        )}

        <div
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          data-testid="vision-estimation-disabled"
          role="status"
        >
          <p className="text-xs font-semibold text-slate-700">Estimation photo désactivée</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Le moteur d’estimation est conservé pour de futures itérations, mais il reste désactivé ici car il n’est pas encore suffisamment mature ni validé. Les photos servent uniquement à documenter la collecte.
          </p>
        </div>

        {visionStatus === "error" && (
          <p className="text-xs text-rose-500">Préparation des photos impossible. Vérifiez le fichier sélectionné.</p>
        )}
      </section>

    </div>
  );
}
