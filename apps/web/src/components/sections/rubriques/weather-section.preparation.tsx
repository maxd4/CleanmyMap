"use client";

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
import { getDurationLabel } from "./weather-section.helpers";

export function PreparationPanel({
  currentRisk,
  weatherStatus,
  selectedLocationLabel,
  selectedLocationSubtitle,
  recommendedWindow,
  prepProgress,
  packItems,
  fr,
}: {
  currentRisk: ReturnType<typeof useWeatherData>["currentRisk"];
  weatherStatus: ReturnType<typeof useWeatherData>["weatherStatus"];
  selectedLocationLabel: string;
  selectedLocationSubtitle: string;
  recommendedWindow: { from: string; to: string } | null;
  prepProgress: number;
  packItems: string[];
  fr: boolean;
}) {
  const isWeatherReady = weatherStatus === "ready" && currentRisk !== null;
  const durationLabel = isWeatherReady
    ? getDurationLabel(currentRisk.level)
    : fr
      ? "1 h à 2 h"
      : "1h to 2h";
  const effortLabel = isWeatherReady
    ? currentRisk.level === "rouge"
      ? fr
        ? "Fort"
        : "High"
      : fr
        ? "Modéré"
        : "Moderate"
    : fr
      ? "Modéré"
      : "Moderate";
  const gearPreview = isWeatherReady
    ? currentRisk.equipment.slice(0, 2).join(" • ")
    : packItems.slice(0, 2).join(" • ");

  return (
    <div className="space-y-6">
      <PreparationKitSectionView
        fr={fr}
        selectedLocationLabel={selectedLocationLabel}
        selectedLocationSubtitle={selectedLocationSubtitle}
        packItems={packItems}
        heroStats={buildPreparationHeroStats(fr, durationLabel, gearPreview, effortLabel)}
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
    </div>
  );
}
