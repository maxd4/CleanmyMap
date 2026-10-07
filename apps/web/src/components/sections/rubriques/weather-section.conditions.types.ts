import type { useWeatherData } from "./use-weather-data";

type WeatherData = ReturnType<typeof useWeatherData>;

export type ConditionsPanelProps = Pick<
  WeatherData,
  | "currentRisk"
  | "forecastDays"
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
  | "setLocationQuery"
  | "weatherStatus"
  | "fr"
> & { weatherState: ReturnType<typeof import("./weather-section.helpers").getWeatherStateCopy> };

export type WeatherForecastProps = Pick<
  ConditionsPanelProps,
  | "currentRisk"
  | "forecastDays"
  | "selectedForecastDayIndex"
  | "setSelectedForecastDayIndex"
  | "weatherStatus"
  | "windows"
  | "fr"
>;

export type WeatherSafetyGuidanceProps = Pick<ConditionsPanelProps, "currentRisk" | "weatherStatus" | "fr">;
