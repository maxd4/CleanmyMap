"use client";

import { Cigarette, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
  const delta = megotsDeltaPercent;
  const TrendIcon = delta > 5 ? TrendingUp : delta < -5 ? TrendingDown : Minus;
  const trendColor = comparisonTone === "orange" ? "text-orange-500" : "text-emerald-600";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center">
            <Cigarette size={15} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Mégots collectés</p>
            <p className="text-xs text-slate-400">Masse ou nombre — synchronisés</p>
          </div>
        </div>
        {megotsCount > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
            ≈ {formatCount(megotsCount)} mégots
          </span>
        )}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-500">Masse (kg)</span>
          <input
            id="harvest-megots-kg"
            inputMode="decimal"
            type="number"
            step="0.01"
            min="0"
            className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 placeholder:text-slate-300"
            value={wasteMegotsKg}
            onChange={(e) => onMegotsWeightChange(e.target.value)}
            placeholder="Ex : 0,25"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-500">État</span>
          <select
            id="harvest-megots-condition"
            className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 appearance-none cursor-pointer"
            value={wasteMegotsCondition}
            onChange={(e) => onMegotsConditionChange(e.target.value as ActionMegotsCondition)}
          >
            <option value="propre">Sec / Propre</option>
            <option value="humide">Humide</option>
            <option value="mouille">Très mouillé</option>
          </select>
        </label>
      </div>

      {/* Count slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Nombre de mégots</span>
          <span className="text-sm font-bold text-slate-900">{formatCount(megotsCount)}</span>
        </div>
        <input
          id="harvest-megots-count"
          inputMode="numeric"
          type="range"
          min="0"
          max="10000"
          step="1"
          value={megotsCount}
          onChange={(e) => onMegotsCountChange(e.target.value)}
          className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-amber-100 accent-amber-500"
        />
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>0</span>
          <span>10 000</span>
        </div>
      </div>

      {/* Auto-conversion */}
      {megotsCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800">
            Conversion automatique
          </p>
          <p className="text-sm font-bold text-amber-900">
            {formatKg(megotsKg)} kg
          </p>
        </div>
      )}

      {/* Gauge */}
      <ProgressGauge
        value={megotsKg}
        comparisonValue={wasteBenchmarkKg}
        tone={comparisonTone}
        comparisonLabel="Référence moyenne"
      />

      {/* Benchmark */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-slate-500">Par bénévole</p>
          <p className="text-sm font-semibold text-slate-900">
            {formatKg(megotsCurrentPerVolunteer)} kg
            <span className="ml-1 text-xs text-slate-400">vs {formatKg(wasteBenchmarkPerVolunteer)} kg moyen</span>
          </p>
        </div>
        <div className={cn("flex items-center gap-1 text-sm font-bold", trendColor)}>
          <TrendIcon size={15} />
          {formatSignedPercent(delta)}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 text-right">
        {sourceLabel}{confidenceLabel ? ` · ${confidenceLabel}` : ""}
      </p>
    </section>
  );
}
