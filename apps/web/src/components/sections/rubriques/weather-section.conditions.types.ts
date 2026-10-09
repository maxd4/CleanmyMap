import type { useWeatherData } from "./use-weather-data";

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
};

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
>;

export type WeatherSafetyGuidanceProps = Pick<ConditionsPanelProps, "selectedForecastRisk" | "weatherStatus" | "fr">;
