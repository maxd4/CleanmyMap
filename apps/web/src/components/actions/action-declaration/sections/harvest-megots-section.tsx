"use client";

import { Cigarette, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ActionMegotsCondition } from "@/lib/actions/types";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";
import { ProgressGauge } from "../ui/harvest-gauges";
import { formatCount, formatKg, formatSignedPercent } from "../utils/harvest-utils";
import { cn } from "@/lib/utils";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";

type HarvestMegotsSectionProps = {
  wasteMegotsKg: string;
  cigaretteButtsVolumeLiters: string;
  wasteMegotsCondition: ActionMegotsCondition;
  megotsKg: number;
  megotsCount: number;
  comparisonTone: "emerald" | "orange";
  megotsCurrentPerVolunteer: number;
  wasteBenchmarkPerVolunteer: number;
  megotsDeltaPercent: number;
  cigaretteButtsCountProvenance: string;
  cigaretteButtsMassProvenance: string;
  cigaretteButtsConversionFormulaVersion: string | null;
  wasteBenchmarkKg: number;
  sourceLabel: string;
  confidenceLabel: string | null;
  onMegotsWeightChange: (value: string) => void;
  onMegotsVolumeChange: (value: string) => void;
  onMegotsCountChange: (value: string) => void;
  onMegotsConditionChange: (value: ActionMegotsCondition) => void;
  hidePrimaryMeasurements?: boolean;
};

export function HarvestMegotsSection({
  wasteMegotsKg,
  cigaretteButtsVolumeLiters,
  wasteMegotsCondition,
  megotsKg,
  megotsCount,
  comparisonTone,
  megotsCurrentPerVolunteer,
  wasteBenchmarkPerVolunteer,
  megotsDeltaPercent,
  cigaretteButtsCountProvenance,
  cigaretteButtsMassProvenance,
  cigaretteButtsConversionFormulaVersion,
  wasteBenchmarkKg,
  sourceLabel,
  confidenceLabel,
  onMegotsWeightChange,
  onMegotsVolumeChange,
  onMegotsCountChange,
  onMegotsConditionChange,
  hidePrimaryMeasurements = false,
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
            <p className="text-xs text-slate-500">Les mesures brutes et les dérivés restent tracés séparément</p>
          </div>
        </div>
        {megotsCount > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            ≈ {formatCount(megotsCount)} mégots
          </span>
        )}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {!hidePrimaryMeasurements ? (
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
            <span className="block text-xs leading-snug text-slate-400">
              Saisie manuelle possible. Le nombre reste séparé ; un dérivé est calculé seulement s’il manque.
            </span>
          </label>
        ) : null}
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-500">Volume (L)</span>
          <input
            id="harvest-megots-volume"
            inputMode="decimal"
            type="number"
            step="0.01"
            min="0"
            className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 placeholder:text-slate-300"
            value={cigaretteButtsVolumeLiters}
            onChange={(e) => onMegotsVolumeChange(e.target.value)}
            placeholder="Ex : 1,5"
          />
          <span className="block text-xs leading-snug text-slate-400">
            Conservé comme mesure brute ; aucune conversion automatique sans relation documentée.
          </span>
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
          <span className="block text-xs leading-snug text-slate-400">
            L’état modifie le poids estimé par mégot.
          </span>
        </label>
      </div>

      {!hidePrimaryMeasurements ? (
        <CmmField
          label={(
            <span className="flex items-center justify-between gap-3">
              <span>Nombre de mégots</span>
              <span className="text-sm font-bold text-slate-900">{formatCount(megotsCount)}</span>
            </span>
          )}
          hint={(
            <>
              Saisissez le nombre brut précisément. Limite maximale : {MAX_CIGARETTE_BUTTS_COUNT.toLocaleString("fr-FR")} mégots ; la masse dérivée reste distincte pour l’envoi.
            </>
          )}
        >
          <CmmInput
            id="harvest-megots-count"
            inputMode="numeric"
            type="number"
            min={0}
            max={MAX_CIGARETTE_BUTTS_COUNT}
            step={1}
            value={megotsCount}
            onChange={(e) => onMegotsCountChange(e.target.value)}
            className="!h-12 !w-full !rounded-xl !border-slate-200 !bg-white !px-4 !text-base !font-bold !text-slate-900 focus:!border-amber-400 focus:!ring-2 focus:!ring-amber-500/15"
          />
        </CmmField>
      ) : null}

      {/* Auto-conversion */}
      {megotsCount > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-amber-800">
            Masse conservée
            </p>
            <p className="text-sm font-bold text-amber-900">
              {formatKg(megotsKg)} kg
            </p>
          </div>
          <p className="mt-1 text-xs leading-snug text-amber-700">
            Comptage : {cigaretteButtsCountProvenance} · masse : {cigaretteButtsMassProvenance} · état : “{wasteMegotsCondition}”.
            {cigaretteButtsConversionFormulaVersion
              ? ` Formule : ${cigaretteButtsConversionFormulaVersion}.`
              : ""}
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

      <p className="text-xs text-slate-400 text-right">
        {sourceLabel}{confidenceLabel ? ` · ${confidenceLabel}` : ""}
      </p>
    </section>
  );
}
