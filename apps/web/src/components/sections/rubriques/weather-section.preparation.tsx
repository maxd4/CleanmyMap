"use client";

import { useState } from "react";
import type { useWeatherData } from "./use-weather-data";
import {
  buildPreparationHeroStats,
  buildPreparationKitSections,
  buildPreparationSteps,
  buildQuickActions,
  buildUsefulBlocks,
} from "./weather-section.preparation.data";
import { PreparationGuide } from "./weather-section.preparation-guide";
import {
  PreparationKitCard,
  PreparationKitSectionView,
} from "./weather-section.preparation-kit";
import { getDurationLabel, getVigilanceLabel } from "./weather-section.helpers";
import { CmmButton } from "@/components/ui/cmm-button";

export function PreparationPanel({
  selectedForecastRisk,
  weatherStatus,
  selectedLocationLabel,
  selectedLocationSubtitle,
  recommendedWindow,
  prepProgress,
  packItems,
  fr,
  onPreparationValidated,
  initialPreparationValidated = false,
}: {
  selectedForecastRisk: ReturnType<typeof useWeatherData>["selectedForecastRisk"];
  weatherStatus: ReturnType<typeof useWeatherData>["weatherStatus"];
  selectedLocationLabel: string;
  selectedLocationSubtitle: string;
  recommendedWindow: { from: string; to: string } | null;
  prepProgress: number;
  packItems: string[];
  fr: boolean;
  onPreparationValidated?: (validated: boolean) => void;
  initialPreparationValidated?: boolean;
}) {
  const durationLabel = getDurationLabel(selectedForecastRisk, fr);
  const forecastRiskLabel = selectedForecastRisk
    ? getVigilanceLabel(selectedForecastRisk.level, fr)
    : fr
      ? "Prévision indisponible"
      : "Forecast unavailable";
  const gearPreview = selectedForecastRisk
    ? selectedForecastRisk.equipment.slice(0, 2).join(" • ")
      : packItems.slice(0, 2).join(" • ");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    () => (initialPreparationValidated ? new Set(packItems) : new Set()),
  );
  const checklistItems = packItems.length > 0 ? packItems : (fr
    ? ["Eau", "Gants", "Pinces", "Sacs", "Premiers secours"]
    : ["Water", "Gloves", "Tongs", "Bags", "First aid"]);
  const isChecklistComplete = checklistItems.every((item) => checkedItems.has(item));

  return (
    <div className="space-y-6">
      <PreparationKitSectionView
        fr={fr}
        selectedLocationLabel={selectedLocationLabel}
        selectedLocationSubtitle={selectedLocationSubtitle}
        packItems={packItems}
        heroStats={buildPreparationHeroStats(fr, durationLabel, gearPreview, forecastRiskLabel)}
      />
      <PreparationGuide
        fr={fr}
        recommendedWindow={recommendedWindow}
        prepSteps={buildPreparationSteps(fr)}
        usefulBlocks={buildUsefulBlocks(fr)}
        quickActions={buildQuickActions(fr)}
        kitCard={
          <PreparationKitCard
            fr={fr}
            prepProgress={prepProgress}
            kitSections={buildPreparationKitSections(fr)}
          />
        }
      />
      <div className="rounded-3xl border border-emerald-200 bg-white/95 p-5 shadow-sm" data-testid="preparation-checklist">
        <div className="space-y-2">
          <h3 className="text-lg font-black text-slate-900">
            {fr ? "Checklist de préparation" : "Preparation checklist"}
          </h3>
          <p className="cmm-text-body cmm-text-primary">
            {weatherStatus === "ready"
              ? (fr ? "Vérifiez le matériel, l’eau et les consignes avant de continuer." : "Check equipment, water and safety guidance before continuing.")
              : (fr ? "Météo indisponible : la préparation reste valide sans inventer de prévision." : "Weather unavailable: preparation remains explicit without inventing a forecast.")}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2" aria-label={fr ? "Éléments de préparation" : "Preparation items"}>
            {checklistItems.map((item) => (
              <li key={item}>
                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={checkedItems.has(item)}
                    onChange={(event) => {
                      const next = new Set(checkedItems);
                      if (event.target.checked) next.add(item); else next.delete(item);
                      setCheckedItems(next);
                      onPreparationValidated?.(next.size === checklistItems.length);
                    }}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  {item}
                </label>
              </li>
            ))}
          </ul>
          <CmmButton
            type="button"
            tone="primary"
            variant="pill"
            size="sm"
            disabled={!isChecklistComplete}
            onClick={() => onPreparationValidated?.(true)}
          >
            {fr ? "Valider la checklist" : "Validate checklist"}
          </CmmButton>
        </div>
      </div>
    </div>
  );
}
