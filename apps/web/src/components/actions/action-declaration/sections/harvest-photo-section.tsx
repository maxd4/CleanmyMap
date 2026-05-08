"use client";

import Image from "next/image";
import { Camera, Sparkles, Trash2, ShieldCheck, Info } from "lucide-react";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import { formatKg } from "../utils/harvest-utils";
import { cn } from "@/lib/utils";

type HarvestPhotoSectionProps = {
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
  visionStatus: "idle" | "processing" | "ready" | "error";
  estimatedWasteKgInterval: [number, number] | null;
  hasPhotos: boolean;
  onPhotoUpload: (files: FileList | null) => void;
  onClearPhotos: () => void;
};

export function HarvestPhotoSection({
  photoAssets,
  visionEstimate,
  visionStatus,
  estimatedWasteKgInterval,
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
              <p className="text-sm font-semibold text-slate-900">Photo de preuve</p>
              <p className="text-xs text-slate-400">Optionnelle — améliore la fiabilité</p>
            </div>
          </div>
          {hasPhotos && (
            <button
              type="button"
              onClick={onClearPhotos}
              aria-label="Supprimer les photos"
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
              <p className="text-[10px] text-slate-400 text-center">JPG, PNG · max 10 Mo</p>
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
              <p className="text-[10px] text-slate-400 text-center">Caméra en direct</p>
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

            {/* Analyse IA en cours */}
            {visionStatus === "processing" && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                <Sparkles size={15} className="text-violet-500 animate-pulse" />
                <p className="text-xs font-medium text-violet-700">Analyse en cours…</p>
              </div>
            )}

            {/* Résultat IA */}
            {visionEstimate && visionStatus === "ready" && (
              <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-violet-500" />
                  <p className="text-xs font-semibold text-violet-800">Estimation IA</p>
                  <span className="ml-auto text-[10px] font-bold text-violet-600">
                    {Math.round(visionEstimate.wasteKg.confidence * 100)}% confiance
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white border border-violet-100 px-3 py-2 text-center">
                    <p className="text-[10px] text-slate-400">Sacs</p>
                    <p className="text-base font-bold text-slate-900">{visionEstimate.bagsCount.value}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-violet-100 px-3 py-2 text-center">
                    <p className="text-[10px] text-slate-400">Poids estimé</p>
                    <p className="text-base font-bold text-slate-900">{visionEstimate.wasteKg.value} kg</p>
                  </div>
                </div>
                {estimatedWasteKgInterval && (
                  <p className="text-[10px] text-slate-400">
                    Intervalle : {formatKg(estimatedWasteKgInterval[0])} – {formatKg(estimatedWasteKgInterval[1])} kg
                  </p>
                )}
              </div>
            )}

            {visionStatus === "error" && (
              <p className="mt-2 text-xs text-rose-500">Analyse impossible. Vérifiez la qualité de la photo.</p>
            )}
          </div>
        )}
      </section>

      {/* ── Pourquoi mesurer ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 shrink-0 rounded-xl bg-sky-100 flex items-center justify-center">
            <Info size={15} className="text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Pourquoi mesurer votre impact ?</p>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Vos données permettent d&apos;évaluer l&apos;impact réel de la propreté urbaine et d&apos;aider les services de voirie à optimiser leurs tournées.
            </p>
          </div>
        </div>
      </section>

      {/* ── Méthodologie ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-emerald-600" />
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Méthode de calcul</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Mégots → masse</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              0,2 g par mégot sec · ×1,2 si humide · ×1,5 si mouillé.
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Vision IA</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Analyse sacs, remplissage et densité. Densité moyenne : 150 kg/m³ (tout-venant urbain).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
