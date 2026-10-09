"use client";

import { WeatherForecasts } from "./weather-section.conditions.forecast";
import { WeatherSafetyGuidance } from "./weather-section.conditions.guidance";
import type { ConditionsPanelProps, WeatherForecastProps } from "./weather-section.conditions.types";

export function ConditionsPanel(props: ConditionsPanelProps) {
  const { weatherStatus, selectedForecastRisk, fr } = props;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
      <WeatherForecasts {...getForecastProps(props)} />
      <WeatherSafetyGuidance selectedForecastRisk={selectedForecastRisk} weatherStatus={weatherStatus} fr={fr} />
    </div>
  );
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
    selectedForecastDay: props.selectedForecastDay,
    fr: props.fr,
  };
}
