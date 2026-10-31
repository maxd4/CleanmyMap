"use client";

import { Cigarette } from "lucide-react";
import type { ActionMegotsCondition } from "@/lib/actions/types";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";
import { formatCount, formatKg } from "../utils/harvest-utils";
import { ButtsComparisonVisual } from "../ui/harvest-gauges";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import { ACTION_MEASUREMENT_MAX_KG } from "@/lib/waste";

function formatProvenance(provenance: string): string {
  switch (provenance) {
    case "counted": return "compté";
    case "measured": return "mesuré";
    case "weight_converted": return "dérivé par conversion de masse";
    case "volume_converted": return "dérivé par conversion de volume";
    case "estimated": return "estimé";
    case "unknown": return "historique conservé, origine non qualifiée";
    default: return "non renseigné";
  }
}

function MegotsHeader({
  megotsCount,
  provenance,
}: { megotsCount: number | null; provenance: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center"><Cigarette size={15} className="text-amber-600" /></div>
        <div><p className="text-sm font-semibold text-slate-900">Mégots collectés</p><p className="text-xs text-slate-500">Nombre et masse restent tracés séparément</p></div>
      </div>
      {megotsCount !== null ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{provenance === "counted" ? "" : "≈ "}{formatCount(megotsCount)} mégots</span> : null}
    </div>
  );
}

type HarvestMegotsSectionProps = {
  wasteMegotsKg: string;
  cigaretteButtsVolumeLiters: string;
  wasteMegotsCondition: ActionMegotsCondition;
  cigaretteButtsCount: string;
  megotsKg: number | null;
  megotsCount: number | null;
  megotsCurrentPerVolunteer: number | null;
  megotsBenchmarkPerVolunteer: number | null;
  megotsBenchmarkSourceCount: number;
  megotsDeltaPercent: number | null;
  megotsComparisonTone: "emerald" | "orange" | "slate";
  cigaretteButtsCountProvenance: string;
  cigaretteButtsMassProvenance: string;
  cigaretteButtsVolumeProvenance: string;
  cigaretteButtsConversionFormulaVersion: string | null;
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
  cigaretteButtsCount,
  megotsKg,
  megotsCount,
  megotsCurrentPerVolunteer,
  megotsBenchmarkPerVolunteer,
  megotsBenchmarkSourceCount,
  megotsDeltaPercent,
  megotsComparisonTone,
  cigaretteButtsCountProvenance,
  cigaretteButtsMassProvenance,
  cigaretteButtsVolumeProvenance,
  cigaretteButtsConversionFormulaVersion,
  onMegotsWeightChange,
  onMegotsVolumeChange,
  onMegotsCountChange,
  onMegotsConditionChange,
  hidePrimaryMeasurements = false,
}: HarvestMegotsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      <MegotsHeader megotsCount={megotsCount} provenance={cigaretteButtsCountProvenance} />

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-500">État des mégots</span>
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
          L’état modifie uniquement la conversion proxy entre nombre et masse.
        </span>
      </label>

      <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
        Renseignez le nombre ou la masse, selon ce que vous avez mesuré. La dernière valeur modifiée recalcule l’autre champ.
      </p>

      {!hidePrimaryMeasurements ? (
        <>
          <CmmField
            label={(
              <span className="flex items-center justify-between gap-3">
                <span>Nombre de mégots</span>
                <span className="text-sm font-bold text-slate-900">{cigaretteButtsCount.trim() || "Non renseigné"}</span>
              </span>
            )}
            hint={`Limite maximale : ${MAX_CIGARETTE_BUTTS_COUNT.toLocaleString("fr-FR")} mégots.`}
          >
            <CmmInput
              id="harvest-megots-count"
              inputMode="numeric"
              type="number"
              min={0}
              max={MAX_CIGARETTE_BUTTS_COUNT}
              step={1}
              value={cigaretteButtsCount}
              onChange={(e) => onMegotsCountChange(e.target.value)}
              className="!h-12 !w-full !rounded-xl !border-slate-200 !bg-white !px-4 !text-base !font-bold !text-slate-900 focus:!border-amber-400 focus:!ring-2 focus:!ring-amber-500/15"
            />
          </CmmField>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500">Masse de mégots (kg)</span>
            <input
              id="harvest-megots-kg"
              inputMode="decimal"
              type="number"
              step="0.01"
              min="0"
              max={ACTION_MEASUREMENT_MAX_KG}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 placeholder:text-slate-300"
              value={wasteMegotsKg}
              onChange={(e) => onMegotsWeightChange(e.target.value)}
              placeholder="Ex : 0,25"
            />
          </label>
        </>
      ) : null}

      {megotsCount !== null || megotsKg !== null ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {megotsCount !== null ? (
              <div>
                <p className="text-xs font-semibold text-amber-800">Nombre retenu</p>
                <p className="text-sm font-bold text-amber-900">{formatCount(megotsCount)} mégots</p>
                <p className="mt-1 text-xs text-amber-700">Provenance : {formatProvenance(cigaretteButtsCountProvenance)}.</p>
              </div>
            ) : null}
            {megotsKg !== null ? (
              <div>
                <p className="text-xs font-semibold text-amber-800">Masse retenue</p>
                <p className="text-sm font-bold text-amber-900">{formatKg(megotsKg)} kg</p>
                <p className="mt-1 text-xs text-amber-700">Provenance : {formatProvenance(cigaretteButtsMassProvenance)}.</p>
              </div>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-snug text-amber-700">
            État : “{wasteMegotsCondition}”.
            {cigaretteButtsConversionFormulaVersion
              ? ` Formule : ${cigaretteButtsConversionFormulaVersion}.`
              : ""}
          </p>
        </div>
      ) : null}

      <ButtsComparisonVisual
        currentPerVolunteer={megotsCurrentPerVolunteer}
        benchmarkPerVolunteer={megotsBenchmarkPerVolunteer}
        benchmarkSourceCount={megotsBenchmarkSourceCount}
        deltaPercent={megotsDeltaPercent}
        comparisonTone={megotsComparisonTone}
      />

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-500">Volume (L), facultatif</span>
        <input
          id="harvest-megots-volume"
          inputMode="decimal"
          type="number"
          step="0.01"
          min="0"
          max={ACTION_MEASUREMENT_MAX_KG}
          className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 placeholder:text-slate-300"
          value={cigaretteButtsVolumeLiters}
          onChange={(e) => onMegotsVolumeChange(e.target.value)}
          placeholder="Ex : 1,5"
        />
        <span className="block text-xs leading-snug text-slate-400">
          Mesure complémentaire conservée séparément ; elle ne remplace ni le nombre ni la masse.
        </span>
        {cigaretteButtsVolumeLiters.trim() ? (
          <span className="block text-xs leading-snug text-slate-500">
            Provenance : {formatProvenance(cigaretteButtsVolumeProvenance)}.
          </span>
        ) : null}
      </label>
    </section>
  );
}
