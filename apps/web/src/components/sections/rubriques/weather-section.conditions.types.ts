import type { useWeatherData } from "./use-weather-data";
import type { PreparationSelection } from "@/lib/actions/action-preparation-context";
import type { resolvePreparationSelection } from "@/lib/actions/action-preparation-context";

type WeatherData = ReturnType<typeof useWeatherData>;

export type ConditionsPanelProps = Pick<
  WeatherData,
  | "currentRisk"
  | "selectedForecastRisk"
  | "forecastDays"
  | "forecastSelectionStatus"
  | "selectedForecastDay"
  | "locationResolution"
  | "locationQuery"
  | "locationSuggestions"
  | "locationSuggestionsError"
  | "isLocationSuggestionsLoading"
  | "selectLocation"
  | "selectedForecastDayIndex"
  | "selectedLocation"
  | "setLocationQuery"
  | "setSelectedForecastDayIndex"
  | "weatherStatus"
  | "windows"
> & {
  fr: boolean;
  onPreparationSelection?: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
};

export type WeatherLocationAndStateProps = Pick<
  ConditionsPanelProps,
  | "locationQuery"
  | "locationSuggestions"
  | "locationSuggestionsError"
  | "isLocationSuggestionsLoading"
  | "selectLocation"
  | "selectedLocation"
  | "locationResolution"
  | "setLocationQuery"
  | "weatherStatus"
  | "fr"
> & { weatherState: ReturnType<typeof import("./weather-section.helpers").getWeatherStateCopy> };

export type WeatherForecastProps = Pick<
  ConditionsPanelProps,
  | "currentRisk"
  | "selectedForecastRisk"
  | "forecastDays"
  | "forecastSelectionStatus"
  | "selectedForecastDay"
  | "selectedForecastDayIndex"
  | "setSelectedForecastDayIndex"
  | "weatherStatus"
  | "windows"
  | "fr"
> & {
  onPreparationSelection?: ConditionsPanelProps["onPreparationSelection"];
};

export type WeatherSafetyGuidanceProps = Pick<ConditionsPanelProps, "selectedForecastRisk" | "weatherStatus" | "fr">;
