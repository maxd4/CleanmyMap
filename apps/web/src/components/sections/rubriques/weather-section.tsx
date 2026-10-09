"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { ConditionsPanel } from "./weather-section.conditions";
import { PreparationPanel } from "./weather-section.preparation";
import { useWeatherData } from "./use-weather-data";
import type { ActionPreparationContext, PreparationSelection } from "@/lib/actions/action-preparation-context";
import type { resolvePreparationSelection } from "@/lib/actions/action-preparation-context";

const itemVariants = {
  hidden: { opacity: 1, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export function WeatherSection({
  draftContext,
  preparationContext,
  onPreparationSelection,
  onPreparationValidated,
  onPreparationContextChange,
}: {
  draftContext?: { locationLabel?: string; actionDate?: string; departureTime?: string; contextReady?: boolean };
  preparationContext?: ActionPreparationContext;
  onPreparationSelection?: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
  onPreparationValidated?: (validated: boolean) => void;
  onPreparationContextChange?: (update: Partial<Pick<ActionPreparationContext, "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials">>) => void;
}) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const pathname = usePathname();
  const pageFamily = resolvePageFamily(pathname);

  const weather = useWeatherData(draftContext);
  const recommendedWindow = weather.windows.recommended[0] ?? null;
  const actionLocation = preparationContext?.locationLabel?.trim() ?? draftContext?.locationLabel?.trim() ?? "";
  const weatherLocationDiffers = Boolean(actionLocation && weather.selectedLocation.label && actionLocation.toLocaleLowerCase() !== weather.selectedLocation.label.trim().toLocaleLowerCase());

  return (
    <SectionShell
      id="weather"
      hideHeader
    >
      <div className="space-y-10 pt-12 text-slate-900">
        <div className="space-y-6">
          <PageHeader
            family={pageFamily}
            align="center"
            title={fr ? "Météo & conditions terrain" : "Weather & field conditions"}
            subtitle={
              fr
                ? "Consultez la météo réelle du lieu puis préparez le terrain pour décider du bon créneau d’action."
                : "Check the real weather for the location, then prepare the field to choose the right action slot."
            }
          />

          <div className="max-w-xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700/80">
              {fr ? "Lieu sélectionné" : "Selected place"}
            </p>
            <p className="mt-1 text-lg font-black tracking-tight text-slate-900">
              {weather.selectedLocation.label}
            </p>
            <p className="mt-1 text-sm text-slate-500">{weather.selectedLocation.subtitle}</p>
            {weatherLocationDiffers ? <p role="note" className="mt-2 text-sm font-semibold text-amber-800">{fr ? `La météo est consultée pour « ${weather.selectedLocation.label} », différent du lieu de l’action « ${actionLocation} ».` : `Weather is checked for “${weather.selectedLocation.label}”, which differs from the action location “${actionLocation}”.`}</p> : null}
          </div>

        </div>

        <div className="space-y-8">
          <motion.div variants={itemVariants}>
            <ConditionsPanel
              currentRisk={weather.currentRisk}
              selectedForecastRisk={weather.selectedForecastRisk}
              weatherStatus={weather.weatherStatus}
              locationResolution={weather.locationResolution}
              selectedLocation={weather.selectedLocation}
              locationQuery={weather.locationQuery}
              setLocationQuery={weather.setLocationQuery}
              locationSuggestions={weather.locationSuggestions}
              locationSuggestionsError={weather.locationSuggestionsError}
              isLocationSuggestionsLoading={weather.isLocationSuggestionsLoading}
              selectLocation={weather.selectLocation}
              forecastDays={weather.forecastDays}
              selectedForecastDay={weather.selectedForecastDay}
              selectedForecastDayIndex={weather.selectedForecastDayIndex}
              forecastSelectionStatus={weather.forecastSelectionStatus}
              setSelectedForecastDayIndex={weather.setSelectedForecastDayIndex}
              windows={weather.windows}
              onPreparationSelection={onPreparationSelection}
              fr={fr}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PreparationPanel
              selectedForecastRisk={weather.selectedForecastRisk}
              weatherStatus={weather.weatherStatus}
              recommendedWindow={recommendedWindow}
              preparationContext={preparationContext}
              fr={fr}
              onPreparationValidated={onPreparationValidated}
              onPreparationContextChange={onPreparationContextChange}
            />
          </motion.div>
        </div>
      </div>
    </SectionShell>
  );
}
