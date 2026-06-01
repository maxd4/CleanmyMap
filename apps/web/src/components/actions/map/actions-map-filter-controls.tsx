"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import type {
  ActionsMapFilters,
  ActionsMapDateScope,
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
  onDateScopeChange: (dateScope: ActionsMapDateScope) => void;
  onStatusChange: (status: ActionsMapStatusFilter) => void;
  onCategoryToggle: (category: MarkerCategory) => void;
  onReset: () => void;
};

export function ActionsMapFilterControls({
  filters,
  onDateScopeChange,
  onStatusChange,
  onCategoryToggle,
  onReset,
}: ActionsMapFilterControlsProps) {
  return (
    <div className="grid w-full gap-3 lg:grid-cols-[repeat(2,minmax(9rem,1fr))_auto]">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
          Période
        </span>
        <select
          value={filters.dateScope}
          onChange={(event) =>
            onDateScopeChange(event.target.value as ActionsMapDateScope)
          }
          className="h-11 rounded-2xl border border-sky-200/80 bg-white px-3 text-sm font-bold text-slate-950 shadow-[0_10px_28px_-18px_rgba(14,165,233,0.16)] outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/12"
        >
          <option value="current_year">Année en cours</option>
          <option value="all_time">Depuis la création</option>
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
          className="h-11 rounded-2xl border border-sky-200/80 bg-white px-3 text-sm font-bold text-slate-950 shadow-[0_10px_28px_-18px_rgba(14,165,233,0.16)] outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/12"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-200/80 bg-sky-100 px-4 text-xs font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_10px_28px_-18px_rgba(14,165,233,0.16)] transition hover:border-sky-300 hover:bg-sky-200 lg:mt-auto"
      >
        <RotateCcw size={14} />
        Reset
      </button>

      <div className="lg:col-span-3">
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
                    ? "border-sky-300 bg-sky-200 text-slate-950 shadow-[0_10px_28px_-18px_rgba(14,165,233,0.18)]"
                    : "border-sky-200 bg-white text-slate-700 hover:border-sky-300 hover:text-slate-950",
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
