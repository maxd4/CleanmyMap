import {
  fetchOpenMeteoForecast,
  OpenMeteoError,
  type OpenMeteoClientOptions,
  type OpenMeteoForecastResponse,
} from "./open-meteo-client";
import {
  evaluateWeatherWindowRisk,
  WEATHER_OPERATIONAL_RULE_SOURCE,
  WEATHER_OPERATIONAL_RULE_VERSION,
  type WeatherRiskLevel,
} from "./ops-weather";

export const PLANNER_WEATHER_SNAPSHOT_VERSION = "planner-weather-snapshot-v1" as const;
export const PLANNER_WEATHER_PROVIDER = "open-meteo" as const;
export const PLANNER_WEATHER_TIMEZONE = "Europe/Paris" as const;
export const PLANNER_WEATHER_FORECAST_DAYS = 16;

export type PlannerWeatherStatus = "available" | "unavailable";

export type PlannerWeatherUnavailableReason =
  | "missing_window"
  | "invalid_window"
  | "outside_forecast_horizon"
  | "coverage_gap"
  | "timeout"
  | "provider_error"
  | "invalid_response";

export type PlannerWeatherWindow = {
  startAt: string;
  endAt: string;
};

export type PlannerWeatherHourlyPoint = {
  time: string;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  windKmh: number | null;
  gustKmh: number | null;
  weatherCode: number | null;
};

export type PlannerWeatherSummary = {
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  windKmh: number | null;
  gustKmh: number | null;
  weatherCode: number | null;
};

export type PlannerWeatherOperationalAssessment = {
  status: "nominal" | "limited" | "fallback";
  riskLevel: WeatherRiskLevel | null;
  reasons: string[];
  ruleVersion: typeof WEATHER_OPERATIONAL_RULE_VERSION;
  ruleSource: typeof WEATHER_OPERATIONAL_RULE_SOURCE;
  operationalLimitMinutes: number | null;
};

export type PlannerWeatherContext = {
  version: typeof PLANNER_WEATHER_SNAPSHOT_VERSION;
  provider: typeof PLANNER_WEATHER_PROVIDER;
  source: "forecast";
  fetchedAt: string;
  coveredWindow: PlannerWeatherWindow | null;
  status: PlannerWeatherStatus;
  weatherStatus: PlannerWeatherStatus;
  location: {
    latitude: number;
    longitude: number;
    timezone: typeof PLANNER_WEATHER_TIMEZONE;
  };
  hourly: PlannerWeatherHourlyPoint[];
  summary: PlannerWeatherSummary | null;
  operationalRisk?: PlannerWeatherOperationalAssessment;
  unavailableReason?: PlannerWeatherUnavailableReason;
};

export type PlannerWeatherRequest = {
  latitude: number;
  longitude: number;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  now?: Date;
  client?: OpenMeteoClientOptions;
};

const LOCAL_DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/;

function localDateTime(value: string | undefined): { date: string; hour: number; minute: number } | null {
  const match = value ? LOCAL_DATE_TIME_PATTERN.exec(value) : null;
  if (!match) return null;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (hour > 23 || minute > 59) return null;
  const parsed = new Date(`${match[1]}T${match[2]}:${match[3]}:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 16) !== `${match[1]}T${match[2]}:${match[3]}`) return null;
  return { date: match[1]!, hour, minute };
}

function toLocalDateTime(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLANNER_WEATHER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function normalizeWindow(
  startAt: string | undefined,
  endAt: string | undefined,
): PlannerWeatherWindow | null {
  const start = localDateTime(startAt);
  const end = localDateTime(endAt);
  if (!start || !end) return null;
  const startKey = `${start.date}T${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`;
  const endKey = `${end.date}T${String(end.hour).padStart(2, "0")}:${String(end.minute).padStart(2, "0")}`;
  return endKey > startKey ? { startAt: startKey, endAt: endKey } : null;
}

function unavailableContext(
  request: PlannerWeatherRequest,
  fetchedAt: string,
  reason: PlannerWeatherUnavailableReason,
  coveredWindow: PlannerWeatherWindow | null,
): PlannerWeatherContext {
  return {
    version: PLANNER_WEATHER_SNAPSHOT_VERSION,
    provider: PLANNER_WEATHER_PROVIDER,
    source: "forecast",
    fetchedAt,
    coveredWindow,
    status: "unavailable",
    weatherStatus: "unavailable",
    location: {
      latitude: request.latitude,
      longitude: request.longitude,
      timezone: PLANNER_WEATHER_TIMEZONE,
    },
    hourly: [],
    summary: null,
    operationalRisk: {
      status: "fallback",
      riskLevel: null,
      reasons: [`Météo indisponible : ${reason}`],
      ruleVersion: WEATHER_OPERATIONAL_RULE_VERSION,
      ruleSource: WEATHER_OPERATIONAL_RULE_SOURCE,
      operationalLimitMinutes: null,
    },
    unavailableReason: reason,
  };
}

function operationalRiskForPoints(
  points: PlannerWeatherHourlyPoint[],
): PlannerWeatherOperationalAssessment {
  const assessment = evaluateWeatherWindowRisk(points.map((point) => ({
    time: point.time,
    temperature: point.temperatureC ?? Number.NaN,
    rain: point.precipitationMm ?? Number.NaN,
    wind: point.windKmh ?? Number.NaN,
  })));
  if (!assessment) {
    return {
      status: "fallback",
      riskLevel: null,
      reasons: ["Données météo opérationnelles incomplètes"],
      ruleVersion: WEATHER_OPERATIONAL_RULE_VERSION,
      ruleSource: WEATHER_OPERATIONAL_RULE_SOURCE,
      operationalLimitMinutes: null,
    };
  }
  return {
    status: assessment.operationalLimitMinutes === null ? "nominal" : "limited",
    riskLevel: assessment.level,
    reasons: assessment.reasons,
    ruleVersion: assessment.operationalRule.version,
    ruleSource: assessment.operationalRule.source,
    operationalLimitMinutes: assessment.operationalLimitMinutes,
  };
}

export function plannerWeatherOperationalAssessment(
  context: PlannerWeatherContext | null | undefined,
): PlannerWeatherOperationalAssessment | null {
  if (!context) return null;
  if (context.operationalRisk) return context.operationalRisk;
  if (context.status !== "available") {
    return {
      status: "fallback",
      riskLevel: null,
      reasons: [`Météo indisponible : ${context.unavailableReason ?? "unknown"}`],
      ruleVersion: WEATHER_OPERATIONAL_RULE_VERSION,
      ruleSource: WEATHER_OPERATIONAL_RULE_SOURCE,
      operationalLimitMinutes: null,
    };
  }
  return operationalRiskForPoints(context.hourly);
}

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

function hourlyPoint(
  forecast: OpenMeteoForecastResponse,
  index: number,
): PlannerWeatherHourlyPoint {
  const hourly = forecast.hourly ?? {};
  return {
    time: hourly.time?.[index] ?? "",
    temperatureC: hourly.temperature_2m?.[index] ?? null,
    apparentTemperatureC: hourly.apparent_temperature?.[index] ?? null,
    precipitationMm: hourly.precipitation?.[index] ?? null,
    precipitationProbabilityPct: hourly.precipitation_probability?.[index] ?? null,
    windKmh: hourly.wind_speed_10m?.[index] ?? null,
    gustKmh: hourly.wind_gusts_10m?.[index] ?? null,
    weatherCode: hourly.weather_code?.[index] ?? null,
  };
}

function summarize(points: PlannerWeatherHourlyPoint[]): PlannerWeatherSummary {
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

function selectWindowPoints(
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

function hasCompleteHourlyCoverage(
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

export function isPlannerWeatherContext(value: unknown): value is PlannerWeatherContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<PlannerWeatherContext>;
  return context.version === PLANNER_WEATHER_SNAPSHOT_VERSION &&
    context.provider === PLANNER_WEATHER_PROVIDER &&
    context.source === "forecast" &&
    typeof context.fetchedAt === "string" &&
    (context.status === "available" || context.status === "unavailable") &&
    context.status === context.weatherStatus &&
    Boolean(context.location && Number.isFinite(context.location.latitude) && Number.isFinite(context.location.longitude)) &&
    context.location?.timezone === PLANNER_WEATHER_TIMEZONE &&
    Array.isArray(context.hourly) &&
    (context.summary === null || typeof context.summary === "object") &&
    (context.operationalRisk === undefined || isPlannerWeatherOperationalAssessment(context.operationalRisk));
}

function isPlannerWeatherOperationalAssessment(
  value: unknown,
): value is PlannerWeatherOperationalAssessment {
  if (!value || typeof value !== "object") return false;
  const assessment = value as Partial<PlannerWeatherOperationalAssessment>;
  return (
    (assessment.status === "nominal" ||
      assessment.status === "limited" ||
      assessment.status === "fallback") &&
    (assessment.riskLevel === null ||
      assessment.riskLevel === "vert" ||
      assessment.riskLevel === "orange" ||
      assessment.riskLevel === "rouge") &&
    Array.isArray(assessment.reasons) &&
    assessment.reasons.every((reason) => typeof reason === "string") &&
    assessment.ruleVersion === WEATHER_OPERATIONAL_RULE_VERSION &&
    assessment.ruleSource === WEATHER_OPERATIONAL_RULE_SOURCE &&
    (assessment.operationalLimitMinutes === null ||
      (typeof assessment.operationalLimitMinutes === "number" &&
        Number.isFinite(assessment.operationalLimitMinutes) &&
        assessment.operationalLimitMinutes >= 0))
  );
}

export async function fetchPlannerWeatherContext(
  request: PlannerWeatherRequest,
): Promise<PlannerWeatherContext> {
  const fetchedAt = new Date(request.now ?? Date.now()).toISOString();
  const window = normalizeWindow(request.scheduledStartAt, request.scheduledEndAt);
  if (!request.scheduledStartAt || !request.scheduledEndAt) {
    return unavailableContext(request, fetchedAt, "missing_window", null);
  }
  if (!window) {
    return unavailableContext(request, fetchedAt, "invalid_window", null);
  }

  const localNow = toLocalDateTime(request.now ?? new Date());
  const today = localNow.slice(0, 10);
  const latestForecastDate = addDays(today, PLANNER_WEATHER_FORECAST_DAYS - 1);
  if (window.endAt < localNow || window.startAt.slice(0, 10) < today ||
    window.endAt.slice(0, 10) > latestForecastDate) {
    return unavailableContext(request, fetchedAt, "outside_forecast_horizon", window);
  }

  try {
    const forecast = await fetchOpenMeteoForecast(
      {
        latitude: request.latitude,
        longitude: request.longitude,
        forecastDays: PLANNER_WEATHER_FORECAST_DAYS,
        timezone: PLANNER_WEATHER_TIMEZONE,
        hourly: [
          "temperature_2m",
          "apparent_temperature",
          "precipitation",
          "precipitation_probability",
          "wind_speed_10m",
          "wind_gusts_10m",
          "weather_code",
        ],
      },
      request.client,
    );
    const points = selectWindowPoints(forecast, window);
    if (!hasCompleteHourlyCoverage(points, window)) {
      return unavailableContext(request, fetchedAt, "coverage_gap", window);
    }
    return {
      version: PLANNER_WEATHER_SNAPSHOT_VERSION,
      provider: PLANNER_WEATHER_PROVIDER,
      source: "forecast",
      fetchedAt: new Date(request.now ?? Date.now()).toISOString(),
      coveredWindow: window,
      status: "available",
      weatherStatus: "available",
      location: {
        latitude: request.latitude,
        longitude: request.longitude,
        timezone: PLANNER_WEATHER_TIMEZONE,
      },
      hourly: points,
      summary: summarize(points),
      operationalRisk: operationalRiskForPoints(points),
    };
  } catch (error) {
    const reason = error instanceof OpenMeteoError
      ? error.reason
      : "provider_error";
    return unavailableContext(request, fetchedAt, reason, window);
  }
}
