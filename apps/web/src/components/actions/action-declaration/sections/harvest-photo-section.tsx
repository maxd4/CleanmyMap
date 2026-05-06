"use client";

import Image from "next/image";
import { Camera, Info, ShieldCheck, Sparkles, Trash2 } from "lucide-react";

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
    <section className="rounded-[2rem] border border-violet-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-violet-600">
            <Camera size={14} />
            <p className="text-[10px] font-black tracking-widest uppercase">Photo & textes</p>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600">
            La photo reste au centre, avec deux bulles de contexte en dessous.
          </p>
        </div>
        <div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700 shadow-sm">
          {photoAssets.length > 0 ? `${photoAssets.length} photo(s)` : "aucune photo"}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div
          className={cn(
            "relative h-64 overflow-hidden rounded-[2.5rem] border-2 border-dashed transition-all duration-700 group",
            hasPhotos ? "border-violet-200 bg-violet-50/30" : "border-slate-200 hover:border-violet-400 hover:bg-slate-50",
          )}
        >
          {!hasPhotos ? (
            <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center">
              <div className="mb-4 rounded-3xl bg-white p-5 text-violet-600 shadow-xl transition-transform group-hover:scale-110">
                <Camera size={32} />
              </div>
              <p className="text-sm font-black uppercase tracking-widest text-slate-900">Ajouter des photos</p>
              <p className="mt-2 text-[10px] font-bold text-slate-400">JPG, PNG JUSQU&apos;À 10 MO</p>
              <input
                id="harvest-photos"
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => onPhotoUpload(e.target.files)}
              />
            </label>
          ) : (
            <div className="absolute inset-0 flex flex-col p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full border border-violet-100 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-violet-600 shadow-sm">
                  {photoAssets.length} PHOTO(S) ANALYSÉE(S)
                </span>
                <button
                  onClick={onClearPhotos}
                  aria-label="Supprimer les photos jointes"
                  className="rounded-xl border border-rose-100 bg-white p-2 text-rose-500 shadow-sm transition-colors hover:bg-rose-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex flex-1 gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {photoAssets.map((asset, i) => (
                  <Image
                    key={i}
                    src={asset.dataUrl}
                    alt={`Aperçu de la photo ${i + 1}`}
                    width={320}
                    height={320}
                    unoptimized
                    className="aspect-square h-full rounded-2xl object-cover shadow-lg ring-2 ring-white"
                  />
                ))}
              </div>
            </div>
          )}

          {visionStatus === "processing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-white backdrop-blur-md animate-in fade-in duration-500">
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/40 blur-2xl" />
                <Sparkles size={48} className="relative animate-spin duration-[3s] text-violet-300" />
              </div>
              <p className="text-lg font-black italic tracking-tighter uppercase">
                Analyse par intelligence artificielle...
              </p>
              <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[60%] animate-progress bg-violet-400" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {visionEstimate ? (
            <div className="space-y-4 rounded-[1.8rem] border border-violet-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-violet-600">
                <Sparkles size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Estimation Vision</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Sacs</p>
                  <p className="text-xl font-black text-slate-900">{visionEstimate.bagsCount.value}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Poids</p>
                  <p className="text-xl font-black text-slate-900">{visionEstimate.wasteKg.value}kg</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Confiance</p>
                  <p className="text-xl font-black text-emerald-600">
                    {Math.round(visionEstimate.wasteKg.confidence * 100)}%
                  </p>
                </div>
              </div>
              {estimatedWasteKgInterval ? (
                <p className="text-xs font-medium text-slate-600">
                  Intervalle indicatif: {formatKg(estimatedWasteKgInterval[0])}-{formatKg(estimatedWasteKgInterval[1])} kg.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-[1.8rem] bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/10 p-3">
                <Info size={24} className="text-sky-300" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black tracking-tight leading-tight">Pourquoi mesurer votre impact ?</p>
                <p className="text-xs font-medium leading-relaxed text-slate-400">
                  Vos données permettent d&apos;évaluer l&apos;impact réel de la propreté à Paris et d&apos;aider les services de voirie à optimiser leurs tournées.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-emerald-100 bg-emerald-50/50 p-5">
            <div className="mb-4 flex items-center gap-2 text-emerald-900">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase">Méthodologie scientifique</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                <p className="font-black uppercase tracking-wider text-[10px] text-emerald-900">Calcul de conversion</p>
                <p className="mt-2 text-[10px] font-medium leading-relaxed text-emerald-800/80">
                  Le poids automatique est calculé sur une base de <span className="font-bold text-emerald-700">0.2g (0.0002kg) par mégot</span>.
                  Ce facteur est pondéré par l&apos;état des filtres : <span className="font-bold">x1.2</span> pour humide et <span className="font-bold">x1.5</span> pour mouillé.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                <p className="font-black uppercase tracking-wider text-[10px] text-emerald-900">Estimation Vision IA</p>
                <p className="mt-2 text-[10px] font-medium leading-relaxed text-emerald-800/80">
                  L&apos;IA analyse le nombre de sacs, leur niveau de remplissage et la densité visuelle des déchets.
                  Une densité moyenne de <span className="font-bold text-emerald-700">150kg/m³</span> est appliquée pour le tout-venant urbain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
