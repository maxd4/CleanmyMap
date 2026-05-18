"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import type {
  ActionsMapFilters,
  ActionsMapStatusFilter,
} from "./actions-map-filters.utils";

const STATUS_OPTIONS: Array<{ value: ActionsMapStatusFilter; label: string }> = [
  { value: "all", label: "Toutes les actions" },
  { value: "approved", label: "Actions validées" },
];

const CATEGORY_LABELS: Array<{ value: MarkerCategory; label: string }> = [
  { value: "blue", label: "Lieux propres" },
  { value: "green", label: "Faible" },
  { value: "yellow", label: "Moyen/Fort" },
  { value: "violet", label: "Critique" },
  { value: "bin", label: "Bacs" },
  { value: "ashtray", label: "Cendriers" },
  { value: "combo", label: "Combinés" },
];

type ActionsMapFilterControlsProps = {
  filters: ActionsMapFilters;
  initialDays: number;
  onDaysChange: (days: number) => void;
  onStatusChange: (status: ActionsMapStatusFilter) => void;
  onImpactChange: (impact: ActionsMapFilters["impactFilter"]) => void;
  onQualityMinChange: (quality: number) => void;
  onCategoryToggle: (category: MarkerCategory) => void;
  onReset: () => void;
};

export function ActionsMapFilterControls({
  filters,
  initialDays,
  onDaysChange,
  onStatusChange,
  onImpactChange,
  onQualityMinChange,
  onCategoryToggle,
  onReset,
}: ActionsMapFilterControlsProps) {
  return (
    <div className="grid w-full gap-3 lg:grid-cols-[repeat(2,minmax(9rem,1fr))_repeat(2,minmax(11rem,1fr))_auto]">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
          Période
        </span>
        <select
          value={String(filters.days)}
          onChange={(event) => onDaysChange(Number(event.target.value))}
          className="h-11 rounded-2xl border border-cyan-200/80 bg-white px-3 text-sm font-bold text-slate-950 shadow-[0_10px_28px_-18px_rgba(8,145,178,0.18)] outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/12"
        >
          <option value={String(initialDays)}>Année en cours</option>
          <option value="3650">Historique complet</option>
          </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
          Statut
        </span>
        <select
          value={filters.statusFilter}
          onChange={(event) =>
            onStatusChange(event.target.value as ActionsMapStatusFilter)
          }
          className="h-11 rounded-2xl border border-cyan-200/80 bg-white px-3 text-sm font-bold text-slate-950 shadow-[0_10px_28px_-18px_rgba(8,145,178,0.18)] outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/12"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
          Impact
        </span>
        <select
          value={filters.impactFilter}
          onChange={(event) =>
            onImpactChange(event.target.value as ActionsMapFilters["impactFilter"])
          }
          className="h-11 rounded-2xl border border-cyan-200/80 bg-white px-3 text-sm font-bold text-slate-950 shadow-[0_10px_28px_-18px_rgba(8,145,178,0.18)] outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/12"
        >
          <option value="all">Tous les impacts</option>
          <option value="faible">Faible</option>
          <option value="moyen">Moyen</option>
          <option value="fort">Fort</option>
          <option value="critique">Critique</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
          <span>Qualité min.</span>
          <span className="text-slate-500">{filters.qualityMin}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.qualityMin}
          onChange={(event) => onQualityMinChange(Number(event.target.value))}
          className="h-11 w-full cursor-pointer accent-cyan-600"
          aria-label="Filtre de qualité minimale"
        />
      </label>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-200/80 bg-cyan-100 px-4 text-xs font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_10px_28px_-18px_rgba(8,145,178,0.18)] transition hover:border-cyan-300 hover:bg-cyan-200 lg:mt-auto"
      >
        <RotateCcw size={14} />
        Reset
      </button>

      <div className="lg:col-span-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
          <SlidersHorizontal size={13} />
          Catégories visibles
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_LABELS.map((category) => {
            const selected = filters.visibleCategories[category.value];
            return (
              <button
                key={category.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onCategoryToggle(category.value)}
                className={[
                  "rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition",
                  selected
                  ? "border-cyan-300 bg-cyan-200 text-slate-950 shadow-[0_10px_28px_-18px_rgba(8,145,178,0.24)]"
                  : "border-cyan-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-slate-950",
                ].join(" ")}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
