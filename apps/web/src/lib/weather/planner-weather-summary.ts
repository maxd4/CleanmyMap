import type { OpenMeteoForecastResponse } from "./open-meteo-client";
import type {
  PlannerWeatherHourlyPoint,
  PlannerWeatherSummary,
  PlannerWeatherWindow,
} from "./planner-weather";

function values(values: Array<number | null>): number[] {
  return values.filter((value): value is number => value !== null && Number.isFinite(value));
}

function average(valuesToAverage: Array<number | null>): number | null {
  const known = values(valuesToAverage);
  return known.length > 0 ? known.reduce((sum, value) => sum + value, 0) / known.length : null;
}

function sum(valuesToSum: Array<number | null>): number | null {
  const known = values(valuesToSum);
  return known.length > 0 ? known.reduce((total, value) => total + value, 0) : null;
}

function max(valuesToMax: Array<number | null>): number | null {
  const known = values(valuesToMax);
  return known.length > 0 ? Math.max(...known) : null;
}

function mode(valuesToCount: Array<number | null>): number | null {
  const counts = new Map<number, number>();
  for (const value of values(valuesToCount)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort(([leftValue, leftCount], [rightValue, rightCount]) =>
    rightCount - leftCount || leftValue - rightValue,
  )[0]?.[0] ?? null;
}

function hourlyNumber(valuesToRead: Array<number | null> | undefined, index: number): number | null {
  return valuesToRead?.[index] ?? null;
}

function hourlyText(valuesToRead: string[] | undefined, index: number): string {
  return valuesToRead?.[index] ?? "";
}

function hourlyPoint(forecast: OpenMeteoForecastResponse, index: number): PlannerWeatherHourlyPoint {
  const hourly = forecast.hourly ?? {};
  return {
    time: hourlyText(hourly.time, index),
    temperatureC: hourlyNumber(hourly.temperature_2m, index),
    apparentTemperatureC: hourlyNumber(hourly.apparent_temperature, index),
    precipitationMm: hourlyNumber(hourly.precipitation, index),
    precipitationProbabilityPct: hourlyNumber(hourly.precipitation_probability, index),
    windKmh: hourlyNumber(hourly.wind_speed_10m, index),
    gustKmh: hourlyNumber(hourly.wind_gusts_10m, index),
    weatherCode: hourlyNumber(hourly.weather_code, index),
  };
}

export function summarize(points: PlannerWeatherHourlyPoint[]): PlannerWeatherSummary {
  return {
    temperatureC: average(points.map((point) => point.temperatureC)),
    apparentTemperatureC: average(points.map((point) => point.apparentTemperatureC)),
    precipitationMm: sum(points.map((point) => point.precipitationMm)),
    precipitationProbabilityPct: max(points.map((point) => point.precipitationProbabilityPct)),
    windKmh: max(points.map((point) => point.windKmh)),
    gustKmh: max(points.map((point) => point.gustKmh)),
    weatherCode: mode(points.map((point) => point.weatherCode)),
  };
}

export function selectWindowPoints(
  forecast: OpenMeteoForecastResponse,
  window: PlannerWeatherWindow,
): PlannerWeatherHourlyPoint[] {
  const hourly = forecast.hourly?.time ?? [];
  const start = new Date(`${window.startAt}:00Z`).getTime();
  const end = new Date(`${window.endAt}:00Z`).getTime();
  return hourly
    .map((time, index) => ({ time, index, start: new Date(`${time.slice(0, 16)}:00Z`).getTime() }))
    .filter(({ start: pointStart }) => pointStart < end && pointStart + 60 * 60_000 > start)
    .map(({ index }) => hourlyPoint(forecast, index));
}

export function hasCompleteHourlyCoverage(
  points: PlannerWeatherHourlyPoint[],
  window: PlannerWeatherWindow,
): boolean {
  const expected: string[] = [];
  const start = new Date(`${window.startAt}:00Z`);
  start.setUTCMinutes(0, 0, 0);
  const end = new Date(`${window.endAt}:00Z`);
  if (end.getUTCMinutes() > 0) end.setUTCHours(end.getUTCHours() + 1);
  end.setUTCMinutes(0, 0, 0);
  for (let cursor = start; cursor < end; cursor.setUTCHours(cursor.getUTCHours() + 1)) {
    expected.push(cursor.toISOString().slice(0, 13));
  }
  const received = new Set(points.map((point) => point.time.slice(0, 13)));
  return expected.length > 0 && expected.every((time) => received.has(time));
}
