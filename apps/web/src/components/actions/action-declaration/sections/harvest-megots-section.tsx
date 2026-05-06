"use client";

import { ArrowLeftRight, Scale } from "lucide-react";

import type { ActionMegotsCondition } from "@/lib/actions/types";
import { ProgressGauge } from "../ui/harvest-gauges";
import { formatCount, formatKg, formatSignedPercent } from "../utils/harvest-utils";
import { cn } from "@/lib/utils";

type HarvestMegotsSectionProps = {
  wasteMegotsKg: string;
  wasteMegotsCondition: ActionMegotsCondition;
  megotsKg: number;
  megotsCount: number;
  cigaretteButtsCount: number;
  comparisonTone: "emerald" | "orange";
  megotsCurrentPerVolunteer: number;
  wasteBenchmarkPerVolunteer: number;
  megotsDeltaPercent: number;
  wasteBenchmarkKg: number;
  sourceLabel: string;
  confidenceLabel: string | null;
  onMegotsWeightChange: (value: string) => void;
  onMegotsCountChange: (value: string) => void;
  onMegotsConditionChange: (value: ActionMegotsCondition) => void;
};

export function HarvestMegotsSection({
  wasteMegotsKg,
  wasteMegotsCondition,
  megotsKg,
  megotsCount,
  cigaretteButtsCount,
  comparisonTone,
  megotsCurrentPerVolunteer,
  wasteBenchmarkPerVolunteer,
  megotsDeltaPercent,
  wasteBenchmarkKg,
  sourceLabel,
  confidenceLabel,
  onMegotsWeightChange,
  onMegotsCountChange,
  onMegotsConditionChange,
}: HarvestMegotsSectionProps) {
  return (
    <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Scale size={14} className="text-emerald-600" />
            <p className="text-[10px] font-black tracking-widest text-emerald-800 uppercase">
              Déclaration des mégots
            </p>
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-900/70">
            Masse, nombre et état restent synchronisés dans une seule carte.
          </p>
        </div>
        <div
          className={cn(
            "shrink-0 rounded-full border px-3 py-2 text-[10px] font-black shadow-sm",
            comparisonTone === "orange"
              ? "border-orange-200 bg-orange-50 text-orange-700"
              : "border-emerald-200 bg-white text-emerald-700",
          )}
        >
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={14} />
            <div className="text-right">
              <p className="uppercase tracking-[0.18em]">Par bénévole</p>
              <p className="text-[10px] font-semibold opacity-80 normal-case tracking-normal">
                {formatKg(megotsCurrentPerVolunteer)} kg vs {formatKg(wasteBenchmarkPerVolunteer)} kg moyen
              </p>
              <p className="text-[10px] font-semibold opacity-80 normal-case tracking-normal">
                {formatSignedPercent(megotsDeltaPercent)} vs autres actions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.85fr]">
        <label className="space-y-2">
          <span
            id="harvest-megots-kg-label"
            className="block text-sm font-semibold text-emerald-900"
          >
            Masse des mégots (kg)
          </span>
          <input
            id="harvest-megots-kg"
            aria-labelledby="harvest-megots-kg-label"
            inputMode="decimal"
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            value={wasteMegotsKg}
            onChange={(e) => onMegotsWeightChange(e.target.value)}
            placeholder="Ex: 0.25"
          />
        </label>

        <label className="space-y-2">
          <span
            id="harvest-megots-condition-label"
            className="block text-sm font-semibold text-emerald-900"
          >
            État des mégots
          </span>
          <select
            id="harvest-megots-condition"
            aria-labelledby="harvest-megots-condition-label"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            value={wasteMegotsCondition}
            onChange={(e) => onMegotsConditionChange(e.target.value as ActionMegotsCondition)}
          >
            <option value="propre">Sec / Propre</option>
            <option value="humide">Humide</option>
            <option value="mouille">Très Mouillé</option>
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-3 rounded-[1.6rem] border border-emerald-100 bg-white/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <p id="harvest-megots-count-label" className="text-sm font-semibold text-emerald-900">
            Nombre de mégots
          </p>
          <p className="text-sm font-black text-emerald-700">{formatCount(megotsCount)}</p>
        </div>
        <input
          id="harvest-megots-count"
          aria-labelledby="harvest-megots-count-label"
          inputMode="numeric"
          type="range"
          min="0"
          max="10000"
          step="1"
          value={megotsCount}
          onChange={(e) => onMegotsCountChange(e.target.value)}
          className="h-3 w-full cursor-pointer appearance-none rounded-full bg-emerald-100 accent-emerald-500"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          <span>0 mégot</span>
          <span>métadonnée synchronisée</span>
          <span>{formatCount(megotsCount)} mégots</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
          <div>
            <p className="text-[10px] font-black tracking-widest text-emerald-800 uppercase">
              Conversion automatique
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">
              {megotsCount > 0
                ? `${formatKg(megotsKg)} kg (${formatCount(megotsCount)} mégots)`
                : "La masse se met à jour dès qu'un nombre est choisi"}
            </p>
          </div>
          <div className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-black text-emerald-700">
            {cigaretteButtsCount > 0 ? `≈ ${formatCount(cigaretteButtsCount)} mégots` : "Conversion"}
          </div>
        </div>
        <ProgressGauge
          value={megotsKg}
          comparisonValue={wasteBenchmarkKg}
          tone={comparisonTone}
          comparisonLabel="Référence moyenne"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[1.6rem] border border-emerald-100 bg-white/80 px-4 py-3">
        <div>
          <p className="text-[10px] font-black tracking-widest text-emerald-800 uppercase">
            Comparaison terrain
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-900">
            ≈ {formatKg(megotsCurrentPerVolunteer)} kg/bénévole vs {formatKg(wasteBenchmarkPerVolunteer)} kg moyen ({formatSignedPercent(megotsDeltaPercent)})
          </p>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
          {sourceLabel}
          {confidenceLabel ? ` · ${confidenceLabel}` : ""}
        </div>
      </div>
    </section>
  );
}
