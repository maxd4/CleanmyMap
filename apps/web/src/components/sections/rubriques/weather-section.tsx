"use client";

import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { PageHeader } from "@/components/ui/page-header";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { ConditionsPanel } from "./weather-section.conditions";
import { PreparationForecastBlock, PreparationLocationBlock } from "./weather-section.preparation";
import { useWeatherData } from "./use-weather-data";
import type { ActionPreparationContext, ActionPreparationPersistenceStatus, PreparationSelection } from "@/lib/actions/action-preparation-context";
import type { resolvePreparationSelection } from "@/lib/actions/action-preparation-context";

type WeatherData = ReturnType<typeof useWeatherData>;
type WeatherDraftContext = { locationLabel?: string; actionDate?: string; departureTime?: string; latitude?: string; longitude?: string; contextReady?: boolean };

function firstNonEmpty(...values: Array<string | undefined>): string {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

function buildWeatherSectionContext(
  draftContext: WeatherDraftContext | undefined,
  preparationContext: ActionPreparationContext | undefined,
) {
  const actionLocation = firstNonEmpty(preparationContext?.locationLabel, draftContext?.locationLabel);
  const actionDate = firstNonEmpty(preparationContext?.actionDate, draftContext?.actionDate);
  const actionLatitude = firstNonEmpty(preparationContext?.latitude, draftContext?.latitude);
  const actionLongitude = firstNonEmpty(preparationContext?.longitude, draftContext?.longitude);
  return {
    actionLocation,
    actionDate,
    actionLatitude,
    actionLongitude,
    weatherContext: {
      ...draftContext,
      locationLabel: actionLocation,
      actionDate,
      departureTime: firstNonEmpty(preparationContext?.departureTime, draftContext?.departureTime),
      latitude: actionLatitude,
      longitude: actionLongitude,
    },
  };
}

function PreparationOverview({
  actionLocation,
  actionDate,
  actionLatitude,
  actionLongitude,
  weather,
  fr,
  onPreparationSelection,
}: {
  actionLocation: string;
  actionDate: string;
  actionLatitude?: string;
  actionLongitude?: string;
  weather: WeatherData;
  fr: boolean;
  onPreparationSelection?: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
}) {
  return <div className="space-y-4" data-testid="preparation-overview">
    <PreparationLocationBlock actionLocation={actionLocation} actionLatitude={actionLatitude} actionLongitude={actionLongitude} actionDate={actionDate} weather={weather} fr={fr} />
    <PreparationForecastBlock weather={weather} actionDate={actionDate} onPreparationSelection={onPreparationSelection} fr={fr} />
  </div>;
}

function WeatherDetailsDisclosure({ weather, fr }: { weather: WeatherData; fr: boolean }) {
  return <CmmDisclosure
    summary={<span className="flex flex-wrap items-center gap-2"><span className="font-bold">{fr ? "Prévisions détaillées et conseils complémentaires" : "Detailed forecasts and complementary advice"}</span><span className="text-xs font-normal text-slate-600">{fr ? "7 jours, heures et contraintes" : "7 days, hours and constraints"}</span></span>}
    tone="emerald"
    size="md"
    id="preparation-weather-details"
  >
    <div className="space-y-4">
      <ConditionsPanel currentRisk={weather.currentRisk} selectedForecastRisk={weather.selectedForecastRisk} weatherStatus={weather.weatherStatus} locationResolution={weather.locationResolution} selectedLocation={weather.selectedLocation} locationQuery={weather.locationQuery} setLocationQuery={weather.setLocationQuery} locationSuggestions={weather.locationSuggestions} locationSuggestionsError={weather.locationSuggestionsError} isLocationSuggestionsLoading={weather.isLocationSuggestionsLoading} selectLocation={weather.selectLocation} forecastDays={weather.forecastDays} selectedForecastDay={weather.selectedForecastDay} selectedForecastDayIndex={weather.selectedForecastDayIndex} forecastSelectionStatus={weather.forecastSelectionStatus} setSelectedForecastDayIndex={weather.setSelectedForecastDayIndex} windows={weather.windows} fr={fr} />
    </div>
  </CmmDisclosure>;
}

function WeatherSectionView({
  pageFamily,
  fr,
  actionLocation,
  actionDate,
  actionLatitude,
  actionLongitude,
  weather,
  onPreparationSelection,
}: {
  pageFamily: ReturnType<typeof resolvePageFamily>;
  fr: boolean;
  actionLocation: string;
  actionDate: string;
  actionLatitude?: string;
  actionLongitude?: string;
  weather: WeatherData;
  onPreparationSelection?: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
}) {
  return <SectionShell id="weather" hideHeader>
    <div className="space-y-6 pt-8 text-slate-900">
      <PageHeader family={pageFamily} align="center" title={fr ? "Préparer l’action" : "Prepare the action"} subtitle={fr ? "Vérifiez le lieu et le jour sélectionnés, puis retenez explicitement un créneau si nécessaire." : "Check the selected place and day, then explicitly keep a slot if needed."} />
      <PreparationOverview actionLocation={actionLocation} actionDate={actionDate} actionLatitude={actionLatitude} actionLongitude={actionLongitude} weather={weather} fr={fr} onPreparationSelection={onPreparationSelection} />
      <WeatherDetailsDisclosure weather={weather} fr={fr} />
    </div>
  </SectionShell>;
}

export function WeatherSection({
  draftContext,
  preparationContext,
  onPreparationSelection,
}: {
  draftContext?: WeatherDraftContext;
  preparationContext?: ActionPreparationContext;
  onPreparationSelection?: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
  onPreparationValidated?: (validated: boolean) => void;
  onPreparationContextChange?: (update: Partial<Pick<ActionPreparationContext, "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials">>) => void;
  preparationPersistenceStatus?: ActionPreparationPersistenceStatus;
}) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const pathname = usePathname();
  const pageFamily = resolvePageFamily(pathname);

  const context = buildWeatherSectionContext(draftContext, preparationContext);
  const weather = useWeatherData(context.weatherContext);

  return <WeatherSectionView
    pageFamily={pageFamily}
    fr={fr}
    actionLocation={context.actionLocation}
    actionDate={context.actionDate}
    actionLatitude={context.actionLatitude}
    actionLongitude={context.actionLongitude}
    weather={weather}
    onPreparationSelection={onPreparationSelection}
  />;
}
