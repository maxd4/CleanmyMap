"use client";

import type { useWeatherData } from "./use-weather-data";
import {
  ACTION_PREPARATION_CHECKLIST_DEFAULTS,
  type ActionPreparationChecklistItem,
} from "@/lib/actions/preparation-contract";
import type { ActionPreparationContext } from "@/lib/actions/action-preparation-context";
import {
  buildPreparationHeroStats,
  buildPreparationSteps,
  buildQuickActions,
  buildUsefulBlocks,
} from "./weather-section.preparation.data";
import { PreparationGuide } from "./weather-section.preparation-guide";
import { PreparationChecklist, PreparationMaterials, type PreparationContextUpdate } from "./weather-section.preparation-controls";
import { getDurationLabel, getVigilanceLabel } from "./weather-section.helpers";

function copyChecklist(context: ActionPreparationContext | undefined): ActionPreparationChecklistItem[] {
  return (context?.preparationChecklist ?? ACTION_PREPARATION_CHECKLIST_DEFAULTS).map((item) => ({ ...item }));
}

export function PreparationPanel({
  selectedForecastRisk,
  weatherStatus,
  recommendedWindow,
  preparationContext,
  fr,
  onPreparationValidated,
  onPreparationContextChange,
}: {
  selectedForecastRisk: ReturnType<typeof useWeatherData>["selectedForecastRisk"];
  weatherStatus: ReturnType<typeof useWeatherData>["weatherStatus"];
  recommendedWindow: { from: string; to: string } | null;
  preparationContext?: ActionPreparationContext;
  fr: boolean;
  onPreparationValidated?: (validated: boolean) => void;
  onPreparationContextChange?: (update: PreparationContextUpdate) => void;
}) {
  const durationLabel = getDurationLabel(selectedForecastRisk, fr);
  const forecastRiskLabel = selectedForecastRisk
    ? getVigilanceLabel(selectedForecastRisk.level, fr)
    : fr
      ? "Prévision indisponible"
      : "Forecast unavailable";
  const suggestedMaterials = preparationContext?.suggestedMaterials ?? [];
  const checklistItems = copyChecklist(preparationContext);
  const gearPreview = selectedForecastRisk?.equipment.slice(0, 2).join(" • ")
    || suggestedMaterials.slice(0, 2).join(" • ")
    || (fr ? "À préciser" : "To be specified");
  const updateChecklist = (key: string, checked: boolean) => {
    const next = checklistItems.map((item) => item.key === key ? { ...item, checked } : item);
    onPreparationContextChange?.({ preparationChecklist: next });
    onPreparationValidated?.(next.length > 0 && next.every((item) => item.checked));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              {fr ? "Préparation de cette action" : "Preparation for this action"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {weatherStatus === "ready"
                ? (fr ? "Les conseils météo restent indicatifs. La checklist est un aide-mémoire organisateur." : "Weather guidance is indicative. The checklist is an organizer reminder.")
                : (fr ? "La météo n’est pas disponible ; vous pouvez poursuivre et compléter la préparation." : "Weather is unavailable; you can continue and complete the preparation.")}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {buildPreparationHeroStats(fr, durationLabel, gearPreview, forecastRiskLabel).map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center gap-2 text-emerald-700"><Icon size={16} /><span className="text-xs font-bold">{stat.label}</span></div>
                <p className="mt-1 text-sm font-semibold text-slate-800">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.note}</p>
              </div>
            );
          })}
        </div>
      </div>

      <PreparationGuide
        fr={fr}
        recommendedWindow={recommendedWindow}
        prepSteps={buildPreparationSteps(fr)}
        usefulBlocks={buildUsefulBlocks(fr)}
        quickActions={buildQuickActions(fr)}
      />

      <PreparationChecklist items={checklistItems} fr={fr} onChange={updateChecklist} />
      <PreparationMaterials context={preparationContext} fr={fr} onChange={(update) => onPreparationContextChange?.(update)} />
    </div>
  );
}
