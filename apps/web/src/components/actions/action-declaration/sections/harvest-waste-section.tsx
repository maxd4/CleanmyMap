"use client";

import { Trash2 } from "lucide-react";

import { VolumeSliderWidget } from "../ui/VolumeSliderWidget";
import { formatKg, formatSignedPercent } from "../utils/harvest-utils";

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
};

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
}: HarvestWasteSectionProps) {
  return (
    <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Trash2 size={14} className="text-emerald-600" />
            <p className="text-[10px] font-black tracking-widest text-emerald-800 uppercase">
              Déchets collectés
            </p>
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-900/70">
            Une carte unique pour la masse totale avec sa jauge visuelle.
          </p>
        </div>
        <div className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-[10px] font-black text-emerald-700 shadow-sm">
          0 à 100 kg
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.9fr]">
        <label className="space-y-2">
          <span
            id="harvest-waste-kg-label"
            className="block text-sm font-semibold text-emerald-900"
          >
            Déchets collectés totaux (kg)
          </span>
          <input
            id="harvest-waste-kg"
            aria-labelledby="harvest-waste-kg-label"
            inputMode="decimal"
            type="number"
            step="0.1"
            min="0"
            max="100"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            value={wasteKg}
            onChange={(event) => onWasteKgChange(event.target.value)}
            placeholder="Ex: 12.5"
          />
        </label>

        <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
          <p className="text-[10px] font-black tracking-widest text-emerald-800 uppercase">
            Repère moyen
          </p>
          <p className="mt-2 text-sm font-semibold text-emerald-900">
            {formatKg(wasteBenchmarkKg)} kg
          </p>
          <p className="mt-1 text-xs text-emerald-900/70">
            {formatKg(wasteCurrentPerVolunteer)} kg/bénévole vs {formatKg(wasteBenchmarkPerVolunteer)} kg moyen ({formatSignedPercent(wasteDeltaPercent)})
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <VolumeSliderWidget
          value={wasteKgClamped}
          onChange={(val) => onWasteKgChange(val.toString())}
          label="Déchets collectés"
          max={100}
          unit="kg"
          inputId="harvest-waste-slider"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1.6rem] border border-emerald-100 bg-white/80 px-4 py-3">
          <div>
            <p className="text-[10px] font-black tracking-widest text-emerald-800 uppercase">
              Comparaison terrain
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">
              ≈ {formatKg(wasteCurrentPerVolunteer)} kg/bénévole vs {formatKg(wasteBenchmarkPerVolunteer)} kg moyen ({formatSignedPercent(wasteDeltaPercent)})
            </p>
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
            {sourceLabel}
            {confidenceLabel ? ` · ${confidenceLabel}` : ""}
          </div>
        </div>
      </div>
    </section>
  );
}
