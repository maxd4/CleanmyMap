import {
  buildInterventionWindows,
  evaluateWeatherRisk,
  evaluateWeatherWindowRisk,
  type HourlyPoint,
  type InterventionWindow,
  type WeatherRiskAssessment,
} from "@/lib/weather/ops-weather";
import type { WeatherPoint } from "./weather-types";

type CurrentWeatherValues = {
  temperature: number | null | undefined;
  rain: number | null | undefined;
  wind: number | null | undefined;
};

export type ForecastDayWeather = {
  hours: readonly WeatherPoint[];
};

export type ForecastDayAssessment = {
  risk: WeatherRiskAssessment | null;
  windows: {
    recommended: InterventionWindow[];
    avoid: InterventionWindow[];
  };
};

export function selectForecastDayIndex({
  forecastDates,
  draftActionDate,
  selectedIndex,
  hasManualSelection,
}: {
  forecastDates: readonly string[];
  draftActionDate: string;
  selectedIndex: number;
  hasManualSelection: boolean;
}): number {
  if (!hasManualSelection && draftActionDate.length > 0) {
    const matchingIndex = forecastDates.indexOf(draftActionDate);
    return matchingIndex >= 0 ? matchingIndex : -1;
  }
  return selectedIndex;
}

function finiteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function evaluateCurrentWeatherRisk(
  values: CurrentWeatherValues | null | undefined,
): WeatherRiskAssessment | null {
  if (!values || !finiteNumber(values.temperature) || !finiteNumber(values.rain) || !finiteNumber(values.wind)) {
    return null;
  }

  return evaluateWeatherRisk({
    temperature: values.temperature,
    rain: values.rain,
    wind: values.wind,
  });
}

function toOperationalHourlyPoints(points: readonly WeatherPoint[]): HourlyPoint[] {
  return points.flatMap((point) => {
    if (!finiteNumber(point.temperature) || !finiteNumber(point.rain) || !finiteNumber(point.wind)) {
      return [];
    }
    return [{
      time: point.time,
      temperature: point.temperature,
      rain: point.rain,
      wind: point.wind,
    }];
  });
}

export function assessForecastDay(day: ForecastDayWeather | null | undefined): ForecastDayAssessment {
  const hourly = day ? toOperationalHourlyPoints(day.hours) : [];
  return {
    risk: evaluateWeatherWindowRisk(hourly),
    windows: buildInterventionWindows(hourly),
  };
}
