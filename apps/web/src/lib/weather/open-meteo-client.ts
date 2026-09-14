export type OpenMeteoForecastResponse = {
  current?: {
    temperature_2m?: number | null;
    apparent_temperature?: number | null;
    precipitation?: number | null;
    precipitation_probability?: number | null;
    wind_speed_10m?: number | null;
    wind_gusts_10m?: number | null;
    uv_index?: number | null;
    relative_humidity_2m?: number | null;
    weather_code?: number | null;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: Array<number | null>;
    apparent_temperature?: Array<number | null>;
    precipitation?: Array<number | null>;
    precipitation_probability?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
    wind_gusts_10m?: Array<number | null>;
    relative_humidity_2m?: Array<number | null>;
    uv_index?: Array<number | null>;
    weather_code?: Array<number | null>;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
    wind_speed_10m_max?: Array<number | null>;
    uv_index_max?: Array<number | null>;
    weather_code?: Array<number | null>;
  };
};

export type OpenMeteoForecastRequest = {
  latitude: number;
  longitude: number;
  forecastDays?: number;
  timezone?: string;
  current?: readonly string[];
  hourly?: readonly string[];
  daily?: readonly string[];
};

export type OpenMeteoClientOptions = {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  cacheTtlMs?: number;
  now?: () => number;
};

export type OpenMeteoErrorReason =
  | "timeout"
  | "provider_error"
  | "invalid_response";

export class OpenMeteoError extends Error {
  readonly reason: OpenMeteoErrorReason;

  constructor(reason: OpenMeteoErrorReason, message: string) {
    super(message);
    this.name = "OpenMeteoError";
    this.reason = reason;
  }
}

const OPEN_METEO_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 32;

type CacheEntry = {
  expiresAt: number;
  value: Promise<OpenMeteoForecastResponse>;
};

const forecastCache = new Map<string, CacheEntry>();

function finiteCoordinate(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function numericArray(value: unknown): Array<number | null> | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) =>
    typeof item === "number" && Number.isFinite(item) ? item : null,
  );
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeResponse(value: unknown): OpenMeteoForecastResponse {
  if (!value || typeof value !== "object") {
    throw new OpenMeteoError("invalid_response", "Open-Meteo returned an invalid payload.");
  }

  const payload = value as Record<string, unknown>;
  const currentValue = payload.current;
  const current = currentValue && typeof currentValue === "object"
    ? currentValue as Record<string, unknown>
    : undefined;
  const hourlyValue = payload.hourly;
  const hourly = hourlyValue && typeof hourlyValue === "object"
    ? hourlyValue as Record<string, unknown>
    : undefined;
  const dailyValue = payload.daily;
  const daily = dailyValue && typeof dailyValue === "object"
    ? dailyValue as Record<string, unknown>
    : undefined;

  return {
    ...(current
      ? {
          current: {
            temperature_2m: typeof current.temperature_2m === "number" ? current.temperature_2m : null,
            apparent_temperature: typeof current.apparent_temperature === "number" ? current.apparent_temperature : null,
            precipitation: typeof current.precipitation === "number" ? current.precipitation : null,
            precipitation_probability: typeof current.precipitation_probability === "number" ? current.precipitation_probability : null,
            wind_speed_10m: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : null,
            wind_gusts_10m: typeof current.wind_gusts_10m === "number" ? current.wind_gusts_10m : null,
            uv_index: typeof current.uv_index === "number" ? current.uv_index : null,
            relative_humidity_2m: typeof current.relative_humidity_2m === "number" ? current.relative_humidity_2m : null,
            weather_code: typeof current.weather_code === "number" ? current.weather_code : null,
          },
        }
      : {}),
    ...(hourly
      ? {
          hourly: {
            time: stringArray(hourly.time) ?? [],
            temperature_2m: numericArray(hourly.temperature_2m),
            apparent_temperature: numericArray(hourly.apparent_temperature),
            precipitation: numericArray(hourly.precipitation),
            precipitation_probability: numericArray(hourly.precipitation_probability),
            wind_speed_10m: numericArray(hourly.wind_speed_10m),
            wind_gusts_10m: numericArray(hourly.wind_gusts_10m),
            relative_humidity_2m: numericArray(hourly.relative_humidity_2m),
            uv_index: numericArray(hourly.uv_index),
            weather_code: numericArray(hourly.weather_code),
          },
        }
      : {}),
    ...(daily
      ? {
          daily: {
            time: stringArray(daily.time) ?? [],
            temperature_2m_max: numericArray(daily.temperature_2m_max),
            temperature_2m_min: numericArray(daily.temperature_2m_min),
            precipitation_sum: numericArray(daily.precipitation_sum),
            wind_speed_10m_max: numericArray(daily.wind_speed_10m_max),
            uv_index_max: numericArray(daily.uv_index_max),
            weather_code: numericArray(daily.weather_code),
          },
        }
      : {}),
  };
}

function buildUrl(request: OpenMeteoForecastRequest): string {
  const query = new URLSearchParams({
    latitude: String(request.latitude),
    longitude: String(request.longitude),
    timezone: request.timezone ?? "Europe/Paris",
    forecast_days: String(request.forecastDays ?? 7),
  });
  for (const [key, values] of [
    ["current", request.current],
    ["hourly", request.hourly],
    ["daily", request.daily],
  ] as const) {
    if (values && values.length > 0) query.set(key, values.join(","));
  }
  return `${OPEN_METEO_ENDPOINT}?${query.toString()}`;
}

async function requestForecast(
  url: string,
  options: OpenMeteoClientOptions,
): Promise<OpenMeteoForecastResponse> {
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetcher(url, {
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new OpenMeteoError("timeout", "Open-Meteo request timed out.");
      }
      throw new OpenMeteoError(
        "provider_error",
        error instanceof Error ? error.message : "Open-Meteo request failed.",
      );
    }

    if (!response.ok) {
      throw new OpenMeteoError(
        "provider_error",
        `Open-Meteo responded with HTTP ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new OpenMeteoError("invalid_response", "Open-Meteo returned invalid JSON.");
    }
    return normalizeResponse(payload);
  } finally {
    clearTimeout(timeout);
  }
}

export function clearOpenMeteoForecastCache(): void {
  forecastCache.clear();
}

export async function fetchOpenMeteoForecast(
  request: OpenMeteoForecastRequest,
  options: OpenMeteoClientOptions = {},
): Promise<OpenMeteoForecastResponse> {
  if (!finiteCoordinate(request.latitude, -90, 90) ||
    !finiteCoordinate(request.longitude, -180, 180)) {
    throw new OpenMeteoError("invalid_response", "Invalid Open-Meteo coordinates.");
  }

  const now = options.now ?? Date.now;
  const url = buildUrl(request);
  const key = url;
  const existing = forecastCache.get(key);
  if (existing && existing.expiresAt > now()) {
    return existing.value;
  }
  if (existing) forecastCache.delete(key);

  const value = requestForecast(url, options);
  forecastCache.set(key, {
    expiresAt: now() + (options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
    value,
  });
  while (forecastCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = forecastCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    forecastCache.delete(oldestKey);
  }

  try {
    return await value;
  } catch (error) {
    if (forecastCache.get(key)?.value === value) forecastCache.delete(key);
    throw error;
  }
}

export const OPEN_METEO_DEFAULTS = {
  timeoutMs: DEFAULT_TIMEOUT_MS,
  cacheTtlMs: DEFAULT_CACHE_TTL_MS,
  maxCacheEntries: MAX_CACHE_ENTRIES,
} as const;
