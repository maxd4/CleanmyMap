import type { useWeatherData } from "./use-weather-data";

type WeatherData = ReturnType<typeof useWeatherData>;

export type ConditionsPanelProps = Pick<
  WeatherData,
  | "currentRisk"
  | "selectedForecastRisk"
  | "forecastDays"
  | "forecastSelectionStatus"
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
> & { fr: boolean };

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
  | "selectedForecastDayIndex"
  | "setSelectedForecastDayIndex"
  | "weatherStatus"
  | "windows"
  | "fr"
>;

export type WeatherSafetyGuidanceProps = Pick<ConditionsPanelProps, "selectedForecastRisk" | "weatherStatus" | "fr">;
