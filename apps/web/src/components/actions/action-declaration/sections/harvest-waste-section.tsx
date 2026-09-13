"use client";

import { useState } from "react";
import { Trash2, TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";
import { VolumeSliderWidget } from "../ui/VolumeSliderWidget";
import { TrashBinGauge } from "../ui/harvest-gauges";
import { formatKg, formatSignedPercent } from "../utils/harvest-utils";
import { cn } from "@/lib/utils";
import type { FormState } from "../form/model";
import { WasteCategorySelector, WasteFieldSummary } from "@/components/waste/waste-category-selector";
import {
  compareWasteBreakdownToTotal,
  type ActionWasteMeasurementMethod,
  type WasteCategorySlug,
} from "@/lib/waste";

type HarvestWasteSectionProps = {
  wasteKg: string;
  wasteKgClamped: number;
  wasteBenchmarkKg: number;
  wasteCurrentPerVolunteer: number;
  wasteBenchmarkPerVolunteer: number;
  wasteDeltaPercent: number;
  sourceLabel: string;
  confidenceLabel: string | null;
  onWasteKgChange: (value: string) => void;
  // Tri détaillé
  wasteMeasurementMethod: ActionWasteMeasurementMethod | "";
  wasteRecyclablesKg: string;
  wasteGlassKg: string;
  wasteHouseholdKg: string;
  wasteOtherKg: string;
  wasteUnusualObjects: string;
  wasteSpecialHandlingWaste: string;
  onMeasurementMethodChange: (value: ActionWasteMeasurementMethod | "") => void;
  notes: string;
  wasteCategories: WasteCategorySlug[];
  onTriChange: <K extends "wasteRecyclablesKg" | "wasteGlassKg" | "wasteHouseholdKg" | "wasteOtherKg" | "wasteUnusualObjects" | "wasteSpecialHandlingWaste" | "notes" | "wasteCategories">(
    key: K, value: FormState[K]
  ) => void;
};

const triInputCls = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

export function HarvestWasteSection({
  wasteKg,
  wasteKgClamped,
  wasteBenchmarkKg,
  wasteCurrentPerVolunteer,
  wasteBenchmarkPerVolunteer,
  wasteDeltaPercent,
  sourceLabel,
  confidenceLabel,
  onWasteKgChange,
  wasteMeasurementMethod,
  wasteRecyclablesKg,
  wasteGlassKg,
  wasteHouseholdKg,
  wasteOtherKg,
  wasteUnusualObjects,
  wasteSpecialHandlingWaste,
  onMeasurementMethodChange,
  notes,
  wasteCategories,
  onTriChange,
}: HarvestWasteSectionProps) {
  const [triOpen, setTriOpen] = useState(false);
  const delta = wasteDeltaPercent;
  const parseKg = (value: string): number | null => {
    const parsed = Number(value);
    return value.trim().length > 0 && Number.isFinite(parsed) && parsed >= 0
      ? parsed
      : null;
  };
  const coherence = compareWasteBreakdownToTotal(parseKg(wasteKg), {
    recyclablesKg: parseKg(wasteRecyclablesKg),
    glassKg: parseKg(wasteGlassKg),
    householdWasteKg: parseKg(wasteHouseholdKg),
    otherWasteKg: parseKg(wasteOtherKg),
  });
  const TrendIcon = delta > 5 ? TrendingUp : delta < -5 ? TrendingDown : Minus;
  const trendColor = delta > 5 ? "text-emerald-600" : delta < -5 ? "text-orange-500" : "text-slate-400";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Trash2 size={15} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Déchets collectés</p>
            <p className="text-xs text-slate-400">Masse totale en kilogrammes</p>
          </div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
          0 – 100 kg
        </span>
      </div>

      {/* Input */}
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-500">Masse totale hors mégots (kg)</span>
        <input
          id="harvest-waste-kg"
          inputMode="decimal"
          type="number"
          step="0.1"
          min="0"
          max="100"
          className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-slate-300"
          value={wasteKg}
          onChange={(e) => onWasteKgChange(e.target.value)}
          placeholder="Ex : 12,5"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-500">Méthode de mesure (facultatif)</span>
        <select
          value={wasteMeasurementMethod}
          onChange={(event) =>
            onMeasurementMethodChange(event.target.value as ActionWasteMeasurementMethod | "")
          }
          className={triInputCls}
        >
          <option value="">Non renseignée</option>
          <option value="balance_suspendue">Balance suspendue</option>
          <option value="balance_au_sol">Balance au sol</option>
          <option value="estimation_visuelle">Estimation visuelle</option>
          <option value="autre">Autre</option>
          <option value="inconnue">Inconnue</option>
        </select>
      </label>

      {/* Slider */}
      <VolumeSliderWidget
        value={wasteKgClamped}
        onChange={(val) => onWasteKgChange(val.toString())}
        label="Déchets collectés"
        max={100}
        unit="kg"
        inputId="harvest-waste-slider"
      />

      {/* Gauge */}
      <TrashBinGauge value={wasteKgClamped} comparisonValue={Math.min(100, wasteBenchmarkKg)} />

      {/* Benchmark */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-slate-500">Par bénévole</p>
          <p className="text-sm font-semibold text-slate-900">
            {formatKg(wasteCurrentPerVolunteer)} kg
            <span className="ml-1 text-xs text-slate-400">vs {formatKg(wasteBenchmarkPerVolunteer)} kg moyen</span>
          </p>
        </div>
        <div className={cn("flex items-center gap-1 text-sm font-bold", trendColor)}>
          <TrendIcon size={15} />
          {formatSignedPercent(delta)}
        </div>
      </div>

      {/* Source */}
      <p className="text-[10px] text-slate-400 text-right">
        {sourceLabel}{confidenceLabel ? ` · ${confidenceLabel}` : ""}
      </p>

      <div className="border-t border-slate-100 pt-4">
        <WasteCategorySelector
          value={wasteCategories}
          onChange={(value) => onTriChange("wasteCategories", value)}
          idPrefix="harvest-waste"
        />
        <WasteFieldSummary value={wasteCategories} className="mt-4" />
        {coherence.status === "warning" ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            Attention : la somme des catégories diffère de la masse totale de plus de 20 %. La saisie reste acceptée ; vérifiez la ventilation si possible.
          </p>
        ) : null}
      </div>

      {/* ── Tri détaillé (dépliable) ──────────────────────────────────── */}
      <div className="border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => setTriOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <span>Détail du tri (optionnel)</span>
          <ChevronDown size={14} className={cn("transition-transform", triOpen && "rotate-180")} />
        </button>

        {triOpen && (
          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "wasteRecyclablesKg" as const, label: "Recyclables (kg)", value: wasteRecyclablesKg },
                { key: "wasteGlassKg" as const,       label: "Verre (kg)",       value: wasteGlassKg },
                { key: "wasteHouseholdKg" as const,   label: "Déchets ménagers (kg)", value: wasteHouseholdKg },
                { key: "wasteOtherKg" as const,       label: "Autres déchets (kg)", value: wasteOtherKg },
              ].map(({ key, label, value }) => (
                <label key={key} className="block space-y-1">
                  <span className="text-[10px] font-medium text-slate-400">{label}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    className={triInputCls}
                    value={value}
                    onChange={(e) => onTriChange(key, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-[10px] font-medium text-slate-400">Objets insolites (facultatif)</span>
              <textarea
                rows={2}
                maxLength={2000}
                placeholder="Ex. objet trouvé ou volume inhabituel"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 resize-none"
                value={wasteUnusualObjects}
                onChange={(e) => onTriChange("wasteUnusualObjects", e.target.value)}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-medium text-slate-400">Filière ou point spécialisé (facultatif)</span>
              <textarea
                rows={2}
                maxLength={2000}
                placeholder="Ex. pile, seringue, DEEE ou objet à orienter"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 resize-none"
                value={wasteSpecialHandlingWaste}
                onChange={(e) => onTriChange("wasteSpecialHandlingWaste", e.target.value)}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-medium text-slate-400">Notes sur la collecte</span>
              <textarea
                rows={3}
                placeholder="Observations, contexte particulier, difficultés rencontrées…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 resize-none"
                value={notes}
                onChange={(e) => onTriChange("notes", e.target.value)}
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
