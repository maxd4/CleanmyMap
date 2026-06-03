"use client";

import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
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
  categoryCounts: Record<MarkerCategory, number>;
  onZoneQueryChange: (zoneQuery: string) => void;
  onDateScopeChange: (dateScope: ActionsMapDateScope) => void;
  onStatusChange: (status: ActionsMapStatusFilter) => void;
  onCategoryToggle: (category: MarkerCategory) => void;
  onReset: () => void;
};

export function ActionsMapFilterControls({
  filters,
  categoryCounts,
  onZoneQueryChange,
  onDateScopeChange,
  onStatusChange,
  onCategoryToggle,
  onReset,
}: ActionsMapFilterControlsProps) {
  return (
    <div className="grid w-full gap-3 sm:gap-4">
      <label className="flex flex-col gap-1 lg:col-span-full">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
          Zone
        </span>
        <div className="flex overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_10px_28px_-18px_rgba(14,165,233,0.16)] transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-400/12">
          <span className="flex items-center justify-center px-3 text-sky-700">
            <Search size={15} />
          </span>
          <input
            type="search"
            value={filters.zoneQuery}
            onChange={(event) => onZoneQueryChange(event.target.value)}
            placeholder="Commune, quartier, arrondissement, lieu..."
            aria-label="Rechercher une zone ou un lieu"
            className="h-11 min-w-0 flex-1 bg-transparent px-0 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
          />
          {filters.zoneQuery ? (
            <button
              type="button"
              onClick={() => onZoneQueryChange("")}
              aria-label="Effacer la recherche de zone"
              className="flex items-center justify-center px-3 text-slate-500 transition hover:text-slate-950"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>
        <p className="text-[11px] font-medium leading-snug text-slate-500">
          Filtre les actions par libellé, quartier, arrondissement ou zone.
        </p>
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(9rem,1fr))_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
            Période
          </span>
          <select
            value={filters.dateScope}
            onChange={(event) =>
              onDateScopeChange(event.target.value as ActionsMapDateScope)
            }
            className="h-11 rounded-2xl border border-sky-200/80 bg-white px-3 text-sm font-bold text-slate-950 shadow-[0_10px_28px_-18px_rgba(14,165,233,0.16)] outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/12 focus-visible:ring-4 focus-visible:ring-sky-400/20"
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
            className="h-11 rounded-2xl border border-sky-200/80 bg-white px-3 text-sm font-bold text-slate-950 shadow-[0_10px_28px_-18px_rgba(14,165,233,0.16)] outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/12 focus-visible:ring-4 focus-visible:ring-sky-400/20"
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
          className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-sky-200/80 bg-sky-100 px-4 text-xs font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_10px_28px_-18px_rgba(14,165,233,0.16)] transition hover:border-sky-300 hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/20 lg:mt-auto lg:w-auto"
        >
          <RotateCcw size={14} />
          Réinitialiser
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
          <SlidersHorizontal size={13} />
          Catégories visibles
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {CATEGORY_LABELS.map((category) => {
            const selected = filters.visibleCategories[category.value];
            return (
              <button
                key={category.value}
                type="button"
                aria-pressed={selected}
                aria-label={`${category.label}, ${categoryCounts[category.value] ?? 0} action${(categoryCounts[category.value] ?? 0) > 1 ? "s" : ""}${selected ? ", visible" : ", masquée"}`}
                onClick={() => onCategoryToggle(category.value)}
                className={[
                  "inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition",
                  selected
                    ? "border-sky-300 bg-sky-200 text-slate-950 shadow-[0_10px_28px_-18px_rgba(14,165,233,0.18)]"
                    : "border-sky-200 bg-white text-slate-700 hover:border-sky-300 hover:text-slate-950",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/20",
                ].join(" ")}
              >
                <span>{category.label}</span>
                <span
                  aria-hidden="true"
                  className={[
                    "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none",
                    selected
                      ? "bg-sky-50 text-slate-950"
                      : "bg-sky-100 text-slate-700",
                  ].join(" ")}
                >
                  {categoryCounts[category.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
