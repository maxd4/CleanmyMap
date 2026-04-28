"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ActionImpactLevel, ActionStatus } from "@/lib/actions/types";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import type { ActionsMapFilters } from "./actions-map-filters.utils";

const STATUS_OPTIONS: Array<{ value: ActionStatus | "all"; label: string }> = [
  { value: "approved", label: "Validées" },
  { value: "pending", label: "En attente" },
  { value: "rejected", label: "Rejetées" },
  { value: "all", label: "Tous statuts" },
];

const IMPACT_OPTIONS: Array<{
  value: ActionImpactLevel | "all";
  label: string;
}> = [
  { value: "all", label: "Tous impacts" },
  { value: "faible", label: "Faible" },
  { value: "moyen", label: "Moyen" },
  { value: "fort", label: "Fort" },
  { value: "critique", label: "Critique" },
];

const QUALITY_OPTIONS = [
  { value: 0, label: "Qualité 0+" },
  { value: 50, label: "Qualité 50+" },
  { value: 70, label: "Qualité 70+" },
  { value: 85, label: "Qualité 85+" },
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
  onStatusChange: (status: ActionStatus | "all") => void;
  onImpactChange: (impact: ActionImpactLevel | "all") => void;
  onQualityMinChange: (qualityMin: number) => void;
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
    <div className="grid w-full gap-3 lg:grid-cols-[repeat(4,minmax(9rem,1fr))_auto]">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-slate-500">
          Période
        </span>
        <select
          value={String(filters.days)}
          onChange={(event) => onDaysChange(Number(event.target.value))}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        >
          <option value="90">90 derniers jours</option>
          <option value={String(initialDays)}>Année en cours</option>
          <option value="3650">Historique complet</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-slate-500">
          Statut
        </span>
        <select
          value={filters.statusFilter}
          onChange={(event) =>
            onStatusChange(event.target.value as ActionStatus | "all")
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-slate-500">
          Impact
        </span>
        <select
          value={filters.impactFilter}
          onChange={(event) =>
            onImpactChange(event.target.value as ActionImpactLevel | "all")
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        >
          {IMPACT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-slate-500">
          Qualité
        </span>
        <select
          value={String(filters.qualityMin)}
          onChange={(event) => onQualityMinChange(Number(event.target.value))}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        >
          {QUALITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold uppercase text-slate-600 shadow-sm transition hover:bg-slate-50 lg:mt-auto"
      >
        <RotateCcw size={14} />
        Reset
      </button>

      <div className="lg:col-span-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
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
                  "rounded-xl border px-3 py-2 text-xs font-bold transition",
                  selected
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-400",
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
