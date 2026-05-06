"use client";


import { Map as MapIcon, Trees, Waves, Building2, TrainFront, ShoppingBag, Landmark, Calendar, Users, Star, User, Sparkles, MapPin, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { PLACE_TYPE_OPTIONS } from "@/lib/actions/place-type-options";
import { ASSOCIATION_SELECTION_OPTIONS } from "@/lib/actions/association-options";
import type { FormState } from "../action-declaration-form.model";
import { VisualOptionCard } from "./ui/VisualOptionCard";

const PLACE_TYPE_ICONS: Record<string, LucideIcon> = {
  "N° Rue/Allée/Villa/Ruelle/Impasse": MapIcon,
  "Bois/Parc/Jardin/Square/Sentier": Trees,
  "Quai/Pont/Port": Waves,
  "N° Boulevard/Avenue/Place": Building2,
  "Gare/Station/Portique": TrainFront,
  "Galerie/Passage couvert": ShoppingBag,
  "Monument": Landmark,
};

const POPULAR_ASSOCIATIONS = new Set([
  "Action spontanée",
  "Entreprise",
  "Paris Clean Walk",
  "World Cleanup Day France",
  "Wings of the Ocean",
]);

interface ActionStepIdentityProps {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  userMetadata: { displayName?: string; username?: string };
  recordType: FormState["recordType"];
}

export function ActionStepIdentity({ form, updateField, userMetadata, recordType }: ActionStepIdentityProps) {
  const isCleanPlaceMode = recordType === "clean_place";
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Header Contextuel */}
      <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100">
        <div className="h-14 w-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-emerald-600 ring-1 ring-slate-100">
          <User size={28} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">Auteur de la déclaration</p>
          <p className="text-xl font-black text-slate-900 leading-tight">
            {userMetadata.displayName || userMetadata.username || "Explorateur CleanMyMap"}
          </p>
        </div>
        <div className="ml-auto px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest border border-emerald-100">
          VÉRIFIÉ
        </div>
      </div>

      {/* 1b. Mode de déclaration */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-8 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.35)]" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Mode de déclaration</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => updateField("recordType", "action")}
            className={cn(
              "rounded-[1.75rem] border p-5 text-left transition-all duration-300",
              form.recordType === "action"
                ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white flex items-center justify-center text-emerald-600 border border-slate-100 shadow-sm">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-base font-black text-slate-900">Action terrain</p>
                <p className="text-xs font-medium text-slate-500">Collecte, parcours et récolte mesurable.</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateField("recordType", "clean_place")}
            className={cn(
              "rounded-[1.75rem] border p-5 text-left transition-all duration-300",
              form.recordType === "clean_place"
                ? "border-sky-500 bg-sky-50 shadow-lg shadow-sky-100"
                : "border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white flex items-center justify-center text-sky-600 border border-slate-100 shadow-sm">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-base font-black text-slate-900">Déclarer un lieu propre</p>
                <p className="text-xs font-medium text-slate-500">Signalement d&apos;un point déjà propre, avec contexte.</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Cadre d'engagement */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-8 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Cadre d&apos;engagement et calendrier</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative group">
            <select
              className="w-full h-16 pl-6 pr-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all appearance-none font-bold text-slate-900 cursor-pointer"
              value={form.associationName}
              onChange={(e) => updateField("associationName", e.target.value)}
            >
              {[...ASSOCIATION_SELECTION_OPTIONS].sort().map((opt) => (
                <option key={opt} value={opt}>
                  {POPULAR_ASSOCIATIONS.has(opt) ? `⭐ ${opt}` : opt}
                </option>
              ))}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Star size={18} />
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
              <Calendar size={18} />
            </div>
            <input
              type="date"
              className="w-full h-16 pl-14 pr-6 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all font-bold text-slate-900"
              value={form.actionDate}
              onChange={(e) => updateField("actionDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3. Type de lieu (Visual Grid) */}
      {!isCleanPlaceMode ? (
        <>
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-8 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Environnement de collecte</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PLACE_TYPE_OPTIONS.map((option) => {
                const Icon = PLACE_TYPE_ICONS[option] || MapIcon;
                const isSelected = form.placeType === option;

                return (
                  <VisualOptionCard
                    key={option}
                    selected={isSelected}
                    onClick={() => updateField("placeType", option)}
                    icon={Icon}
                    label={option.split('/')[0]}
                    description={option.includes('/') ? option.split('/')[1] : undefined}
                    color="emerald"
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-8 rounded-full bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.5)]" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Bilan des effectifs engagés</h3>
            </div>
            <div className="relative group max-w-sm">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                <Users size={18} />
              </div>
              <input
                type="number"
                min="1"
                placeholder="Nombre de participants"
                className="w-full h-16 pl-14 pr-6 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-bold text-slate-900"
                value={form.volunteersCount}
                onChange={(e) => updateField("volunteersCount", e.target.value)}
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 tracking-widest uppercase">
                PARTICIPANTS
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
