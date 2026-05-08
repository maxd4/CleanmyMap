"use client";

import { useState } from "react";
import { Trash2, TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";
import { VolumeSliderWidget } from "../ui/VolumeSliderWidget";
import { TrashBinGauge } from "../ui/harvest-gauges";
import { formatKg, formatSignedPercent } from "../utils/harvest-utils";
import { cn } from "@/lib/utils";
import type { FormState } from "../../action-declaration-form.model";

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
  wastePlastiqueKg: string;
  wasteVerreKg: string;
  wasteMetalKg: string;
  wasteMixteKg: string;
  triQuality: FormState["triQuality"];
  notes: string;
  onTriChange: <K extends "wastePlastiqueKg" | "wasteVerreKg" | "wasteMetalKg" | "wasteMixteKg" | "triQuality" | "notes">(
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
  wastePlastiqueKg,
  wasteVerreKg,
  wasteMetalKg,
  wasteMixteKg,
  triQuality,
  notes,
  onTriChange,
}: HarvestWasteSectionProps) {
  const [triOpen, setTriOpen] = useState(false);
  const delta = wasteDeltaPercent;
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
        <span className="text-xs font-medium text-slate-500">Masse totale (kg)</span>
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
                { key: "wastePlastiqueKg" as const, label: "Plastique (kg)", value: wastePlastiqueKg },
                { key: "wasteVerreKg" as const,     label: "Verre (kg)",     value: wasteVerreKg },
                { key: "wasteMetalKg" as const,     label: "Métal (kg)",     value: wasteMetalKg },
                { key: "wasteMixteKg" as const,     label: "Mixte (kg)",     value: wasteMixteKg },
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

            <div className="space-y-1">
              <span className="text-[10px] font-medium text-slate-400">Qualité du tri</span>
              <div className="flex gap-2">
                {(["faible", "moyenne", "elevee"] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onTriChange("triQuality", q)}
                    className={cn(
                      "flex-1 rounded-lg border py-2 text-xs font-semibold transition-all",
                      triQuality === q
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {q === "faible" ? "Faible" : q === "moyenne" ? "Moyenne" : "Élevée"}
                  </button>
                ))}
              </div>
            </div>

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
