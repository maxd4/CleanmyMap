import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOpenMeteoForecastCache,
  type OpenMeteoForecastResponse,
} from "./open-meteo-client";
import {
  fetchPlannerWeatherContext,
  PLANNER_WEATHER_FORECAST_DAYS,
} from "./planner-weather";

const NOW = new Date("2026-09-14T08:00:00.000Z");

function response(body: OpenMeteoForecastResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function forecast(overrides: Partial<NonNullable<OpenMeteoForecastResponse["hourly"]>> = {}) {
  return {
    hourly: {
      time: ["2026-09-15T10:00", "2026-09-15T11:00"],
      temperature_2m: [24, 26],
      apparent_temperature: [25, 28],
      precipitation: [0, 2.5],
      precipitation_probability: [10, 80],
      wind_speed_10m: [12, 18],
      wind_gusts_10m: [20, 34],
      weather_code: [1, 61],
      ...overrides,
    },
  } satisfies OpenMeteoForecastResponse;
}

describe("planner weather context", () => {
  beforeEach(() => {
    clearOpenMeteoForecastCache();
  });

  it("captures a complete hourly window and aggregates without changing missing values", async () => {
    const fetcher = vi.fn(async () => response(forecast()));

    const context = await fetchPlannerWeatherContext({
      latitude: 48.8566,
      longitude: 2.3522,
      scheduledStartAt: "2026-09-15T10:00",
      scheduledEndAt: "2026-09-15T12:00",
      now: NOW,
      client: { fetcher },
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(context).toMatchObject({
      version: "planner-weather-snapshot-v1",
      provider: "open-meteo",
      source: "forecast",
      status: "available",
      weatherStatus: "available",
      coveredWindow: {
        startAt: "2026-09-15T10:00",
        endAt: "2026-09-15T12:00",
      },
      summary: {
        temperatureC: 25,
        apparentTemperatureC: 26.5,
        precipitationMm: 2.5,
        precipitationProbabilityPct: 80,
        windKmh: 18,
        gustKmh: 34,
        weatherCode: 1,
      },
    });
    expect(context.hourly).toHaveLength(2);
    expect(context.operationalRisk).toMatchObject({
      status: "limited",
      riskLevel: "orange",
      operationalLimitMinutes: 90,
      ruleVersion: "weather-operational-rules-v1",
    });
  });

  it("keeps a missing metric null instead of manufacturing a zero", async () => {
    const context = await fetchPlannerWeatherContext({
      latitude: 48.8566,
      longitude: 2.3522,
      scheduledStartAt: "2026-09-15T10:00",
      scheduledEndAt: "2026-09-15T12:00",
      now: NOW,
      client: {
        fetcher: async () => response(forecast({
          temperature_2m: [null, 26],
          wind_gusts_10m: [null, null],
        })),
      },
    });

    expect(context.status).toBe("available");
    expect(context.summary?.temperatureC).toBe(26);
    expect(context.summary?.gustKmh).toBeNull();
    expect(context.hourly[0]?.temperatureC).toBeNull();
    expect(context.operationalRisk).toMatchObject({
      status: "fallback",
      operationalLimitMinutes: null,
    });
  });

  it("preserves rain, heat and wind/gust values for a changing window", async () => {
    const context = await fetchPlannerWeatherContext({
      latitude: 45,
      longitude: 5,
      scheduledStartAt: "2026-09-15T10:30",
      scheduledEndAt: "2026-09-15T11:00",
      now: NOW,
      client: {
        fetcher: async () => response(forecast({
          time: ["2026-09-15T10:00"],
          temperature_2m: [36],
          apparent_temperature: [41],
          precipitation: [4],
          precipitation_probability: [90],
          wind_speed_10m: [31],
          wind_gusts_10m: [58],
          weather_code: [95],
        })),
      },
    });

    expect(context.status).toBe("available");
    expect(context.summary).toEqual({
      temperatureC: 36,
      apparentTemperatureC: 41,
      precipitationMm: 4,
      precipitationProbabilityPct: 90,
      windKmh: 31,
      gustKmh: 58,
      weatherCode: 95,
    });
  });

  it("uses one bounded cached retrieval for repeated planner reads", async () => {
    const fetcher = vi.fn(async () => response(forecast()));
    const request = {
      latitude: 48.8566,
      longitude: 2.3522,
      scheduledStartAt: "2026-09-15T10:00",
      scheduledEndAt: "2026-09-15T12:00",
      now: NOW,
      client: { fetcher },
    };

    await fetchPlannerWeatherContext(request);
    await fetchPlannerWeatherContext(request);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fails soft without calling the provider when the window is absent or outside the horizon", async () => {
    const fetcher = vi.fn(async () => response(forecast()));
    const missing = await fetchPlannerWeatherContext({
      latitude: 48,
      longitude: 2,
      now: NOW,
      client: { fetcher },
    });
    const future = await fetchPlannerWeatherContext({
      latitude: 48,
      longitude: 2,
      scheduledStartAt: "2026-10-01T10:00",
      scheduledEndAt: "2026-10-01T12:00",
      now: NOW,
      client: { fetcher },
    });

    expect(missing).toMatchObject({ status: "unavailable", unavailableReason: "missing_window" });
    expect(future).toMatchObject({ status: "unavailable", unavailableReason: "outside_forecast_horizon" });
    expect(missing.operationalRisk).toMatchObject({ status: "fallback", operationalLimitMinutes: null });
    expect(fetcher).not.toHaveBeenCalled();
    expect(PLANNER_WEATHER_FORECAST_DAYS).toBe(16);
  });

  it("returns explicit unavailable states for provider errors and timeouts", async () => {
    const providerError = await fetchPlannerWeatherContext({
      latitude: 48,
      longitude: 2,
      scheduledStartAt: "2026-09-15T10:00",
      scheduledEndAt: "2026-09-15T11:00",
      now: NOW,
      client: { fetcher: async () => response({}, 503) },
    });
    const timeout = await fetchPlannerWeatherContext({
      latitude: 48,
      longitude: 2,
      scheduledStartAt: "2026-09-15T10:00",
      scheduledEndAt: "2026-09-15T11:00",
      now: NOW,
      client: {
        timeoutMs: 5,
        fetcher: (_input, init) => new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
      },
    });

    expect(providerError).toMatchObject({ status: "unavailable", unavailableReason: "provider_error" });
    expect(timeout).toMatchObject({ status: "unavailable", unavailableReason: "timeout" });
  });
});
