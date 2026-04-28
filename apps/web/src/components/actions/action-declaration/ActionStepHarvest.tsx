"use client";


import { Scale, Camera, Trash2, Sparkles, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

import type { FormState } from "../action-declaration-form.model";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import { VolumeSliderWidget } from "./ui/VolumeSliderWidget";

interface ActionStepHarvestProps {
  form: FormState;
  updateField: (key: keyof FormState, value: any) => void;
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
  visionStatus: "idle" | "processing" | "ready" | "error";
  onPhotoUpload: (files: FileList | null) => void;
  onClearPhotos: () => void;
}

export function ActionStepHarvest({
  form,
  updateField,
  photoAssets,
  visionEstimate,
  visionStatus,
  onPhotoUpload,
  onClearPhotos,
}: ActionStepHarvestProps) {
  const isActionSpontanee = form.associationName === "Action spontanée";
  const hasPhotos = photoAssets.length > 0;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Main Harvest Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-8 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Bilan de la récolte</h3>
          </div>
          
          <VolumeSliderWidget
            value={parseFloat(form.wasteKg || "0")}
            onChange={(val) => updateField("wasteKg", val.toString())}
            label="Volume récolté"
            max={100}
            unit="kg"
          />

          {/* Mégots (Specific for Spontaneous or can be toggled) */}
          {(isActionSpontanee || form.cigaretteButtsCount) && (
            <div className="p-8 rounded-[2rem] bg-amber-50 border border-amber-100 space-y-6 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-200/50 text-amber-700">
                    <Trash2 size={18} />
                  </div>
                  <span className="text-xs font-black tracking-widest text-amber-900 uppercase">Détails Mégots</span>
                </div>
                {form.cigaretteButtsCount && (
                  <div className="px-3 py-1 rounded-full bg-white text-[10px] font-black text-amber-600 border border-amber-200">
                    +{form.cigaretteButts} KG AUTO
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-amber-800 tracking-widest uppercase ml-2">Quantité Estimée</p>
                  <input
                    type="number"
                    placeholder="Ex: 150"
                    className="w-full h-14 px-6 rounded-xl bg-white border border-amber-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-slate-900"
                    value={form.cigaretteButtsCount}
                    onChange={(e) => updateField("cigaretteButtsCount", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-amber-800 tracking-widest uppercase ml-2">État des filtres</p>
                  <select
                    className="w-full h-14 px-6 rounded-xl bg-white border border-amber-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-slate-900 appearance-none"
                    value={form.cigaretteButtsCondition}
                    onChange={(e) => updateField("cigaretteButtsCondition", e.target.value)}
                  >
                    <option value="propre">Sec / Propre</option>
                    <option value="humide">Humide</option>
                    <option value="mouille">Très Mouillé</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Photo & AI Vision */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-8 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Preuve & IA Vision</h3>
          </div>

          <div className={cn(
            "relative h-64 rounded-[2.5rem] border-2 border-dashed transition-all duration-700 overflow-hidden group",
            hasPhotos ? "border-violet-200 bg-violet-50/30" : "border-slate-200 hover:border-violet-400 hover:bg-slate-50"
          )}>
            {!hasPhotos ? (
              <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                <div className="p-5 rounded-3xl bg-white shadow-xl text-violet-600 mb-4 group-hover:scale-110 transition-transform">
                  <Camera size={32} />
                </div>
                <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Ajouter des photos</p>
                <p className="text-[10px] text-slate-400 font-bold mt-2">JPG, PNG JUSQU'À 10 MO</p>
                <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => onPhotoUpload(e.target.files)} />
              </label>
            ) : (
              <div className="absolute inset-0 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-4 py-2 rounded-full bg-white shadow-sm border border-violet-100 text-[10px] font-black text-violet-600 tracking-widest uppercase">
                    {photoAssets.length} PHOTO(S) ANALYSÉE(S)
                  </span>
                  <button onClick={onClearPhotos} className="p-2 rounded-xl bg-white text-rose-500 shadow-sm border border-rose-100 hover:bg-rose-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {photoAssets.map((asset, i) => (
                    <img key={i} src={asset.previewUrl} alt="Preview" className="h-full aspect-square object-cover rounded-2xl ring-2 ring-white shadow-lg" />
                  ))}
                </div>
              </div>
            )}

            {/* AI Processing Overlay */}
            {visionStatus === "processing" && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-violet-500 blur-2xl opacity-40 animate-pulse" />
                  <Sparkles size={48} className="relative animate-spin duration-[3s] text-violet-300" />
                </div>
                <p className="text-lg font-black tracking-tighter uppercase italic">Analyse par intelligence artificielle...</p>
                <div className="mt-4 w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 animate-progress w-[60%]" />
                </div>
              </div>
            )}
          </div>

          {/* Vision Estimate Result */}
          {visionEstimate && (
            <div className="p-6 rounded-[2rem] bg-white border border-violet-100 shadow-xl space-y-4 animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-2 text-violet-600">
                <Sparkles size={16} />
                <span className="text-[10px] font-black tracking-widest uppercase">Estimation Vision</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Sacs</p>
                  <p className="text-xl font-black text-slate-900">{visionEstimate.bagsCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Volume</p>
                  <p className="text-xl font-black text-slate-900">{visionEstimate.totalVolumeL}L</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Confiance</p>
                  <p className="text-xl font-black text-emerald-600">{Math.round(visionEstimate.confidenceScore * 100)}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Common Info Panel & Methodology */}
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-6 rounded-3xl bg-slate-900 text-white shadow-2xl">
          <div className="p-3 rounded-2xl bg-white/10">
            <Info size={24} className="text-sky-300" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black tracking-tight leading-tight">Pourquoi mesurer votre impact ?</p>
            <p className="text-xs font-medium text-slate-400 leading-relaxed">
              Vos données permettent d'évaluer l'impact réel de la propreté à Paris et d'aider les services de voirie à optimiser leurs tournées.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[2rem] bg-emerald-50/50 border border-emerald-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-emerald-900">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span className="text-[10px] font-black tracking-[0.2em] uppercase">Méthodologie Scientifique</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] text-emerald-800/80 font-medium leading-relaxed">
            <div className="space-y-2">
              <p className="font-black text-emerald-900 uppercase tracking-wider">Calcul de conversion</p>
              <p>
                Le poids automatique est calculé sur une base de <span className="font-bold text-emerald-700">0.2g (0.0002kg) par mégot</span>. 
                Ce facteur est pondéré par l'état des filtres : <span className="font-bold">x1.2</span> pour humide et <span className="font-bold">x1.5</span> pour mouillé.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-black text-emerald-900 uppercase tracking-wider">Estimation Vision IA</p>
              <p>
                L'IA analyse le nombre de sacs, leur niveau de remplissage et la densité visuelle des déchets. 
                Une densité moyenne de <span className="font-bold text-emerald-700">150kg/m³</span> est appliquée pour le tout-venant urbain.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
