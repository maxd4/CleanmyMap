import {
  fetchOpenMeteoForecast,
  OpenMeteoError,
  type OpenMeteoClientOptions,
} from "./open-meteo-client";
import {
  evaluateWeatherWindowRisk,
  WEATHER_OPERATIONAL_RULE_SOURCE,
  WEATHER_OPERATIONAL_RULE_VERSION,
  type WeatherRiskLevel,
} from "./ops-weather";
import { parseCivilDateAsUtc } from "@/lib/time/civil-date";
import {
  hasCompleteHourlyCoverage,
  selectWindowPoints,
  summarize,
} from "./planner-weather-summary";

export const PLANNER_WEATHER_SNAPSHOT_VERSION = "planner-weather-snapshot-v1" as const;
const PLANNER_WEATHER_PROVIDER = "open-meteo" as const;
const PLANNER_WEATHER_TIMEZONE = "Europe/Paris" as const;
export const PLANNER_WEATHER_FORECAST_DAYS = 16;
const PLANNER_WEATHER_CONTEXT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const PLANNER_WEATHER_COORDINATE_TOLERANCE = 0.000001;

type PlannerWeatherStatus = "available" | "unavailable";

type PlannerWeatherUnavailableReason =
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

export type PlannerWeatherContextRequest = Pick<
  PlannerWeatherRequest,
  "latitude" | "longitude" | "scheduledStartAt" | "scheduledEndAt"
> & { now?: Date };

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

function normalizedTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

function normalizedScheduledDateTime(date: unknown, time: unknown): string | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return null;
  const trimmedTime = typeof time === "string" ? time.trim() : "";
  const fullDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(trimmedTime)
    ? trimmedTime.slice(0, 16)
    : `${date.trim()}T${normalizedTime(trimmedTime) ?? ""}`;
  return localDateTime(fullDateTime)?.date === date.trim() ? fullDateTime : null;
}

export function buildPlannerWeatherRequest(input: {
  latitude: unknown;
  longitude: unknown;
  actionDate: unknown;
  scheduledStartTime: unknown;
  scheduledEndTime: unknown;
  now?: Date;
}): PlannerWeatherContextRequest | null {
  const latitude = typeof input.latitude === "number"
    ? input.latitude
    : typeof input.latitude === "string" && input.latitude.trim() !== ""
      ? Number(input.latitude)
      : Number.NaN;
  const longitude = typeof input.longitude === "number"
    ? input.longitude
    : typeof input.longitude === "string" && input.longitude.trim() !== ""
      ? Number(input.longitude)
      : Number.NaN;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  const scheduledStartAt = normalizedScheduledDateTime(input.actionDate, input.scheduledStartTime);
  const scheduledEndAt = normalizedScheduledDateTime(input.actionDate, input.scheduledEndTime);
  if (!scheduledStartAt || !scheduledEndAt) return null;
  return { latitude, longitude, scheduledStartAt, scheduledEndAt, now: input.now };
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
  const parsed = parseCivilDateAsUtc(date);
  if (!parsed) return date;
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

function isWithinForecastHorizon(window: PlannerWeatherWindow, now: Date): boolean {
  const localNow = toLocalDateTime(now);
  const today = localNow.slice(0, 10);
  const latestForecastDate = addDays(today, PLANNER_WEATHER_FORECAST_DAYS - 1);
  return window.endAt >= localNow &&
    window.startAt.slice(0, 10) >= today &&
    window.endAt.slice(0, 10) <= latestForecastDate;
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

export function isPlannerWeatherContextCompatible(
  context: PlannerWeatherContext | null | undefined,
  request: PlannerWeatherContextRequest | null | undefined,
): context is PlannerWeatherContext {
  if (!context || context.status !== "available" || !request || !isPlannerWeatherContext(context)) return false;
  const window = normalizeWindow(request.scheduledStartAt, request.scheduledEndAt);
  if (!isCompatibleWeatherWindow(context, window) || !isCompatibleWeatherLocation(context, request)) return false;
  const now = request.now ?? new Date();
  return isFreshWeatherContext(context, window, now);
}

function isCompatibleWeatherWindow(
  context: PlannerWeatherContext,
  window: PlannerWeatherWindow | null,
): window is PlannerWeatherWindow {
  return Boolean(window && context.coveredWindow &&
    context.coveredWindow.startAt === window.startAt &&
    context.coveredWindow.endAt === window.endAt);
}

function isCompatibleWeatherLocation(
  context: PlannerWeatherContext,
  request: PlannerWeatherContextRequest,
): boolean {
  return Math.abs(context.location.latitude - request.latitude) <= PLANNER_WEATHER_COORDINATE_TOLERANCE &&
    Math.abs(context.location.longitude - request.longitude) <= PLANNER_WEATHER_COORDINATE_TOLERANCE;
}

function isFreshWeatherContext(
  context: PlannerWeatherContext,
  window: PlannerWeatherWindow,
  now: Date,
): boolean {
  const fetchedAt = Date.parse(context.fetchedAt);
  const nowAt = now.getTime();
  if (!Number.isFinite(fetchedAt) || fetchedAt > nowAt || nowAt - fetchedAt > PLANNER_WEATHER_CONTEXT_MAX_AGE_MS) return false;
  if (!isWithinForecastHorizon(window, now)) return false;
  return context.hourly.length > 0 && hasCompleteHourlyCoverage(context.hourly, window) &&
    context.hourly.every((point) => typeof point.time === "string" && point.time.length > 0);
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

  if (!isWithinForecastHorizon(window, request.now ?? new Date())) {
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
