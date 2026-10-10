"use client";

import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { PageHeader } from "@/components/ui/page-header";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { ConditionsPanel } from "./weather-section.conditions";
import { PreparationForecastBlock, PreparationLocationBlock, PreparationPanel } from "./weather-section.preparation";
import { useWeatherData } from "./use-weather-data";
import type { ActionPreparationContext, PreparationSelection } from "@/lib/actions/action-preparation-context";
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
  preparationContext,
  weather,
  fr,
  onPreparationSelection,
  onPreparationValidated,
  onPreparationContextChange,
}: {
  actionLocation: string;
  actionDate: string;
  actionLatitude?: string;
  actionLongitude?: string;
  preparationContext?: ActionPreparationContext;
  weather: WeatherData;
  fr: boolean;
  onPreparationSelection?: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
  onPreparationValidated?: (validated: boolean) => void;
  onPreparationContextChange?: (update: Partial<Pick<ActionPreparationContext, "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials">>) => void;
}) {
  return <div className="space-y-4" data-testid="preparation-overview">
    <PreparationLocationBlock actionLocation={actionLocation} actionLatitude={actionLatitude} actionLongitude={actionLongitude} actionDate={actionDate} weather={weather} fr={fr} />
    <PreparationForecastBlock weather={weather} actionDate={actionDate} onPreparationSelection={onPreparationSelection} fr={fr} />
    <PreparationPanel selectedForecastRisk={weather.selectedForecastRisk} weatherStatus={weather.weatherStatus} preparationContext={preparationContext} fr={fr} onPreparationValidated={onPreparationValidated} onPreparationContextChange={onPreparationContextChange} />
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
      <CmmCard tone="emerald" variant="muted" size="sm" className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-bold text-emerald-950">{fr ? "Conseil complémentaire" : "Complementary advice"}</h3><p className="mt-1 text-sm text-slate-600">{fr ? "Retrouvez les repères de tri dans la source dédiée, sans quitter cette préparation." : "Find sorting guidance in the dedicated source without leaving this preparation."}</p></div>
        <CmmButton href="/sections/recycling" tone="secondary" variant="pill" size="sm">{fr ? "Comprendre le tri" : "Understand sorting"}</CmmButton>
      </CmmCard>
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
  preparationContext,
  weather,
  onPreparationSelection,
  onPreparationValidated,
  onPreparationContextChange,
}: {
  pageFamily: ReturnType<typeof resolvePageFamily>;
  fr: boolean;
  actionLocation: string;
  actionDate: string;
  actionLatitude?: string;
  actionLongitude?: string;
  preparationContext?: ActionPreparationContext;
  weather: WeatherData;
  onPreparationSelection?: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
  onPreparationValidated?: (validated: boolean) => void;
  onPreparationContextChange?: (update: Partial<Pick<ActionPreparationContext, "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials">>) => void;
}) {
  return <SectionShell id="weather" hideHeader>
    <div className="space-y-6 pt-8 text-slate-900">
      <PageHeader family={pageFamily} align="center" title={fr ? "Préparer l’action" : "Prepare the action"} subtitle={fr ? "Vérifiez le lieu et le jour utiles, retenez si besoin un créneau, puis préparez le matériel." : "Check the relevant place and day, keep a slot if useful, then prepare the equipment."} />
      <PreparationOverview actionLocation={actionLocation} actionDate={actionDate} actionLatitude={actionLatitude} actionLongitude={actionLongitude} preparationContext={preparationContext} weather={weather} fr={fr} onPreparationSelection={onPreparationSelection} onPreparationValidated={onPreparationValidated} onPreparationContextChange={onPreparationContextChange} />
      <WeatherDetailsDisclosure weather={weather} fr={fr} />
    </div>
  </SectionShell>;
}

export function WeatherSection({
  draftContext,
  preparationContext,
  onPreparationSelection,
  onPreparationValidated,
  onPreparationContextChange,
}: {
  draftContext?: WeatherDraftContext;
  preparationContext?: ActionPreparationContext;
  onPreparationSelection?: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
  onPreparationValidated?: (validated: boolean) => void;
  onPreparationContextChange?: (update: Partial<Pick<ActionPreparationContext, "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials">>) => void;
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
    preparationContext={preparationContext}
    weather={weather}
    onPreparationSelection={onPreparationSelection}
    onPreparationValidated={onPreparationValidated}
    onPreparationContextChange={onPreparationContextChange}
  />;
}
