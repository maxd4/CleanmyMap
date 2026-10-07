"use client";

import { getWeatherStateCopy } from "./weather-section.helpers";
import { WeatherForecasts } from "./weather-section.conditions.forecast";
import { WeatherLocationAndState } from "./weather-section.conditions.location";
import { WeatherSafetyGuidance } from "./weather-section.conditions.guidance";
import type { ConditionsPanelProps } from "./weather-section.conditions.types";

export function ConditionsPanel({
  currentRisk,
  weatherStatus,
  selectedLocation,
  locationQuery,
  setLocationQuery,
  locationSuggestions,
  locationSuggestionsError,
  isLocationSuggestionsLoading,
  selectLocation,
  forecastDays,
  selectedForecastDayIndex,
  setSelectedForecastDayIndex,
  windows,
  fr,
}: ConditionsPanelProps) {
  const weatherState = getWeatherStateCopy({
    weatherStatus,
    selectedZoneLabel: selectedLocation.label,
    fr,
  });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.48fr_1fr]">
      <WeatherLocationAndState
        weatherStatus={weatherStatus}
        selectedLocation={selectedLocation}
        locationQuery={locationQuery}
        setLocationQuery={setLocationQuery}
        locationSuggestions={locationSuggestions}
        locationSuggestionsError={locationSuggestionsError}
        isLocationSuggestionsLoading={isLocationSuggestionsLoading}
        selectLocation={selectLocation}
        weatherState={weatherState}
        fr={fr}
      />
      <WeatherForecasts
        currentRisk={currentRisk}
        weatherStatus={weatherStatus}
        forecastDays={forecastDays}
        selectedForecastDayIndex={selectedForecastDayIndex}
        setSelectedForecastDayIndex={setSelectedForecastDayIndex}
        windows={windows}
        fr={fr}
      />
      <WeatherSafetyGuidance currentRisk={currentRisk} weatherStatus={weatherStatus} fr={fr} />
    </div>
  );
}
