"use client";

import { getWeatherStateCopy } from "./weather-section.helpers";
import { WeatherForecasts } from "./weather-section.conditions.forecast";
import { WeatherLocationAndState } from "./weather-section.conditions.location";
import { WeatherSafetyGuidance } from "./weather-section.conditions.guidance";
import type {
  ConditionsPanelProps,
  WeatherForecastProps,
  WeatherLocationAndStateProps,
} from "./weather-section.conditions.types";

export function ConditionsPanel(props: ConditionsPanelProps) {
  const { selectedLocation, locationResolution, weatherStatus, selectedForecastRisk, fr } = props;
  const weatherState = getWeatherStateCopy({
    weatherStatus,
    locationResolution,
    selectedZoneLabel: selectedLocation.label,
    fr,
  });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.48fr_1fr]">
      <WeatherLocationAndState {...getLocationProps(props, weatherState)} />
      <WeatherForecasts {...getForecastProps(props)} />
      <WeatherSafetyGuidance selectedForecastRisk={selectedForecastRisk} weatherStatus={weatherStatus} fr={fr} />
    </div>
  );
}

function getLocationProps(
  props: ConditionsPanelProps,
  weatherState: WeatherLocationAndStateProps["weatherState"],
): WeatherLocationAndStateProps {
  return {
    weatherStatus: props.weatherStatus,
    selectedLocation: props.selectedLocation,
    locationResolution: props.locationResolution,
    locationQuery: props.locationQuery,
    setLocationQuery: props.setLocationQuery,
    locationSuggestions: props.locationSuggestions,
    locationSuggestionsError: props.locationSuggestionsError,
    isLocationSuggestionsLoading: props.isLocationSuggestionsLoading,
    selectLocation: props.selectLocation,
    weatherState,
    fr: props.fr,
  };
}

function getForecastProps(props: ConditionsPanelProps): WeatherForecastProps {
  return {
    currentRisk: props.currentRisk,
    selectedForecastRisk: props.selectedForecastRisk,
    weatherStatus: props.weatherStatus,
    forecastDays: props.forecastDays,
    forecastSelectionStatus: props.forecastSelectionStatus,
    selectedForecastDayIndex: props.selectedForecastDayIndex,
    setSelectedForecastDayIndex: props.setSelectedForecastDayIndex,
    windows: props.windows,
    fr: props.fr,
  };
}
