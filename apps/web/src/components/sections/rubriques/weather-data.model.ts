import {
  buildInterventionWindows,
  evaluateWeatherRisk,
  evaluateWeatherWindowRisk,
  type HourlyPoint,
  type InterventionWindow,
  type WeatherRiskAssessment,
} from "@/lib/weather/ops-weather";
import { TERRITORY_CENTER } from "@/lib/geo/territory";
import type { OpenMeteoForecastResponse } from "@/lib/weather/open-meteo-client";
import { parseCivilDateAsUtc } from "@/lib/time/civil-date";
import { formatDateShort } from "./helpers";
import type {
  WeatherDataStatus,
  WeatherLocation,
  WeatherPoint,
} from "./weather-types";

const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  label: "France",
  subtitle: "Vue nationale",
  latitude: TERRITORY_CENTER[0],
  longitude: TERRITORY_CENTER[1],
  importance: null,
  resolution: "resolved",
};

export type WeatherLocationSource = "draft" | "stored" | "preference" | "geolocation";

export type WeatherInitialLocationInput = {
  contextReady: boolean;
  actionLocation: WeatherLocation | null;
  draftLocationLabel: string;
  preparationContextWithoutLocation: boolean;
};

export type AutomaticWeatherLocationInput = {
  contextReady: boolean;
  hasCanonicalActionLocation: boolean;
  preparationContextWithoutLocation: boolean;
  draftLocationLabel: string;
  hasManualLocation: boolean;
  hasResolvedInitialLocation: boolean;
  hasStoredLocation: boolean;
  hasPreference: boolean;
  geolocationAvailable: boolean;
};

export function canApplyDraftWeatherLocation(
  draftLocationLabel: string,
  hasManualLocation: boolean,
): boolean {
  return draftLocationLabel.trim().length > 0 && !hasManualLocation;
}

export function canApplyAutomaticWeatherLocation({
  draftLocationLabel,
  hasManualLocation,
  hasResolvedInitialLocation,
}: {
  draftLocationLabel: string;
  hasManualLocation: boolean;
  hasResolvedInitialLocation: boolean;
}): boolean {
  return (
    draftLocationLabel.trim().length === 0 &&
    !hasManualLocation &&
    !hasResolvedInitialLocation
  );
}

export function selectAutomaticWeatherLocationSource({
  contextReady,
  hasCanonicalActionLocation,
  preparationContextWithoutLocation,
  draftLocationLabel,
  hasManualLocation,
  hasResolvedInitialLocation,
  hasStoredLocation,
  hasPreference,
  geolocationAvailable,
}: AutomaticWeatherLocationInput): WeatherLocationSource | null {
  if (
    !contextReady ||
    hasCanonicalActionLocation ||
    preparationContextWithoutLocation ||
    hasManualLocation
  ) {
    return null;
  }

  if (canApplyDraftWeatherLocation(draftLocationLabel, hasManualLocation)) {
    return "draft";
  }
  if (hasResolvedInitialLocation) {
    return null;
  }
  if (hasStoredLocation) {
    return "stored";
  }
  if (hasPreference) {
    return "preference";
  }
  return geolocationAvailable ? "geolocation" : null;
}

export function buildFallbackWeatherLocation(label: string, subtitle: string | null): WeatherLocation {
  return {
    label: label.trim() || DEFAULT_WEATHER_LOCATION.label,
    subtitle: subtitle?.trim() || DEFAULT_WEATHER_LOCATION.subtitle,
    latitude: DEFAULT_WEATHER_LOCATION.latitude,
    longitude: DEFAULT_WEATHER_LOCATION.longitude,
    importance: null,
    resolution: "unresolved",
  };
}

function parseCoordinate(value: string | number | undefined, minimum: number, maximum: number): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) && numeric >= minimum && numeric <= maximum ? numeric : null;
}

export function buildWeatherLocationFromCoordinates({
  label,
  latitude,
  longitude,
}: {
  label?: string;
  latitude?: string | number;
  longitude?: string | number;
}): WeatherLocation | null {
  const validLatitude = parseCoordinate(latitude, -90, 90);
  const validLongitude = parseCoordinate(longitude, -180, 180);
  if (validLatitude === null || validLongitude === null) return null;
  return {
    label: label?.trim() || "Lieu de l’action",
    subtitle: "Coordonnées confirmées de l’action",
    latitude: validLatitude,
    longitude: validLongitude,
    importance: null,
    resolution: "resolved",
  };
}

export function buildInitialWeatherLocation({
  contextReady,
  actionLocation,
  draftLocationLabel,
  preparationContextWithoutLocation,
}: WeatherInitialLocationInput): WeatherLocation {
  if (!contextReady) {
    return buildFallbackWeatherLocation("Lieu en cours de chargement", "Contexte de préparation");
  }
  if (actionLocation) {
    return actionLocation;
  }
  if (preparationContextWithoutLocation) {
    return buildFallbackWeatherLocation("Localisation à préciser", "Lieu de l’action non renseigné");
  }
  if (draftLocationLabel) {
    return buildFallbackWeatherLocation(draftLocationLabel, "Lieu du pré-formulaire");
  }
  return DEFAULT_WEATHER_LOCATION;
}

export function shouldApplyDraftForecastDate({
  draftActionDate,
  hasManualForecastDay,
  forecastDaysLength,
}: {
  draftActionDate: string;
  hasManualForecastDay: boolean;
  forecastDaysLength: number;
}): boolean {
  return draftActionDate.trim().length > 0 && !hasManualForecastDay && forecastDaysLength > 0;
}

export function isSameWeatherLocation(left: WeatherLocation, right: WeatherLocation): boolean {
  return left.resolution === "resolved"
    && right.resolution === "resolved"
    && left.latitude === right.latitude
    && left.longitude === right.longitude;
}

type CurrentWeatherValues = {
  temperature: number | null | undefined;
  rain: number | null | undefined;
  wind: number | null | undefined;
};

export type ForecastDayWeather = {
  hours: readonly WeatherPoint[];
};

export type ForecastDay = {
  date: string;
  label: string;
  subtitle: string;
  min: number | null;
  max: number | null;
  rain: number | null;
  wind: number | null;
  uv: number | null;
  weatherCode: number | null;
  hours: WeatherPoint[];
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

function formatDayLabel(value: string): string {
  const date = parseCivilDateAsUtc(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function isDaytimeHour(time: string): boolean {
  const hour = Number(/^\d{4}-\d{2}-\d{2}T(\d{2})/.exec(time)?.[1] ?? Number.NaN);
  return hour >= 8 && hour < 22;
}

export function buildHourlyPoints(
  data: OpenMeteoForecastResponse | undefined,
  weatherStatus: WeatherDataStatus,
): WeatherPoint[] {
  if (weatherStatus !== "ready" || !data?.hourly?.time?.length) {
    return [];
  }

  return data.hourly.time
    .map((time, index) => ({
      time,
      temperature: data.hourly?.temperature_2m?.[index] ?? null,
      rain: data.hourly?.precipitation?.[index] ?? null,
      precipitationProbability: data.hourly?.precipitation_probability?.[index] ?? null,
      wind: data.hourly?.wind_speed_10m?.[index] ?? null,
      humidity: data.hourly?.relative_humidity_2m?.[index] ?? null,
      uv: data.hourly?.uv_index?.[index] ?? null,
      weatherCode: data.hourly?.weather_code?.[index] ?? null,
    }))
    .filter((point) => isDaytimeHour(point.time));
}

export function buildForecastDays(
  data: OpenMeteoForecastResponse | undefined,
  hourlyPoints: readonly WeatherPoint[],
  weatherStatus: WeatherDataStatus,
): ForecastDay[] {
  if (weatherStatus !== "ready" || !data?.daily?.time?.length) {
    return [];
  }

  return data.daily.time.map((day, index) => {
    const hours = hourlyPoints.filter((point) => point.time.slice(0, 10) === day);
    return {
      date: day,
      label: index === 0 ? "Aujourd’hui" : formatDayLabel(day),
      subtitle: formatDateShort(day),
      min: data.daily?.temperature_2m_min?.[index] ?? null,
      max: data.daily?.temperature_2m_max?.[index] ?? null,
      rain: data.daily?.precipitation_sum?.[index] ?? null,
      wind: data.daily?.wind_speed_10m_max?.[index] ?? null,
      uv: data.daily?.uv_index_max?.[index] ?? null,
      weatherCode: data.daily?.weather_code?.[index] ?? hours.find((hour) => hour.weatherCode !== null)?.weatherCode ?? null,
      hours,
    };
  });
}

export function getWeatherDataStatus({
  contextReady,
  locationResolution,
  error,
  hasHourlyData,
  isLoading,
}: {
  contextReady: boolean;
  locationResolution: WeatherLocation["resolution"];
  error: unknown;
  hasHourlyData: boolean;
  isLoading: boolean;
}): WeatherDataStatus {
  if (!contextReady) return "loading";
  if (locationResolution === "unresolved") return "empty";
  if (error) return "error";
  if (hasHourlyData) return "ready";
  return isLoading ? "loading" : "empty";
}

export type WeatherIssue = "weather_unavailable" | "weather_empty" | null;

export function getWeatherIssue(status: WeatherDataStatus): WeatherIssue {
  if (status === "error") return "weather_unavailable";
  if (status === "empty") return "weather_empty";
  return null;
}
