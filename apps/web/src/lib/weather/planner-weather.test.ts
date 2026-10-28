import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOpenMeteoForecastCache,
  type OpenMeteoForecastResponse,
} from "./open-meteo-client";
import {
  buildPlannerWeatherRequest,
  fetchPlannerWeatherContext,
  isPlannerWeatherContext,
  isPlannerWeatherContextCompatible,
  plannerWeatherOperationalAssessment,
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

  it("accepts a stored context only for the same current window and coordinates", async () => {
    const context = await fetchPlannerWeatherContext({
      latitude: 48.8566,
      longitude: 2.3522,
      scheduledStartAt: "2026-09-15T10:00",
      scheduledEndAt: "2026-09-15T12:00",
      now: NOW,
      client: { fetcher: async () => response(forecast()) },
    });
    const request = buildPlannerWeatherRequest({
      latitude: 48.8566,
      longitude: 2.3522,
      actionDate: "2026-09-15",
      scheduledStartTime: "10:00",
      scheduledEndTime: "12:00",
      now: NOW,
    });

    expect(isPlannerWeatherContextCompatible(context, request)).toBe(true);
    expect(isPlannerWeatherContextCompatible(context, { ...request!, longitude: 2.36 })).toBe(false);
    expect(isPlannerWeatherContextCompatible(context, { ...request!, scheduledStartAt: "2026-09-15T11:00" })).toBe(false);
    expect(isPlannerWeatherContextCompatible(context, { ...request!, now: new Date("2026-09-14T15:00:00.000Z") })).toBe(false);
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
    const request = buildPlannerWeatherRequest({
      latitude: 48.8566,
      longitude: 2.3522,
      actionDate: "2026-09-15",
      scheduledStartTime: "10:00",
      scheduledEndTime: "12:00",
      now: NOW,
    });
    expect(isPlannerWeatherContextCompatible(context, request)).toBe(true);
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

  it("rejects malformed coordinates and civil windows before contacting the provider", () => {
    for (const input of [
      { latitude: 91, longitude: 2, actionDate: "2026-09-15", scheduledStartTime: "10:00", scheduledEndTime: "11:00" },
      { latitude: "bad", longitude: 2, actionDate: "2026-09-15", scheduledStartTime: "10:00", scheduledEndTime: "11:00" },
      { latitude: 48, longitude: -181, actionDate: "2026-09-15", scheduledStartTime: "10:00", scheduledEndTime: "11:00" },
    ]) {
      expect(buildPlannerWeatherRequest(input)).toBeNull();
    }
    expect(buildPlannerWeatherRequest({ latitude: 48, longitude: 2, actionDate: "2026-09-15", scheduledStartTime: "11:00", scheduledEndTime: "10:00" })).toMatchObject({ scheduledStartAt: "2026-09-15T11:00", scheduledEndAt: "2026-09-15T10:00" });
  });

  it("distinguishes missing, invalid and incomplete forecast windows", async () => {
    const fetcher = vi.fn(async () => response(forecast({ time: ["2026-09-15T10:00"] })));
    await expect(fetchPlannerWeatherContext({ latitude: 48, longitude: 2, now: NOW, client: { fetcher } })).resolves.toMatchObject({ unavailableReason: "missing_window" });
    await expect(fetchPlannerWeatherContext({ latitude: 48, longitude: 2, scheduledStartAt: "bad", scheduledEndAt: "2026-09-15T11:00", now: NOW, client: { fetcher } })).resolves.toMatchObject({ unavailableReason: "invalid_window" });
    await expect(fetchPlannerWeatherContext({ latitude: 48, longitude: 2, scheduledStartAt: "2026-09-15T10:00", scheduledEndAt: "2026-09-15T12:00", now: NOW, client: { fetcher } })).resolves.toMatchObject({ unavailableReason: "coverage_gap" });
  });

  it("does not accept malformed stored contexts or stale/incomplete operational data", async () => {
    expect(plannerWeatherOperationalAssessment(null)).toBeNull();
    expect(plannerWeatherOperationalAssessment({ status: "unavailable", unavailableReason: undefined } as never)).toMatchObject({ status: "fallback", riskLevel: null });
    const context = await fetchPlannerWeatherContext({ latitude: 48.8566, longitude: 2.3522, scheduledStartAt: "2026-09-15T10:00", scheduledEndAt: "2026-09-15T12:00", now: NOW, client: { fetcher: async () => response(forecast()) } });
    expect(isPlannerWeatherContextCompatible({ ...context, version: "bad" } as never, buildPlannerWeatherRequest({ latitude: 48.8566, longitude: 2.3522, actionDate: "2026-09-15", scheduledStartTime: "10:00", scheduledEndTime: "12:00", now: NOW }))).toBe(false);
    expect(isPlannerWeatherContextCompatible(context, null)).toBe(false);
    expect(isPlannerWeatherContextCompatible({ ...context, fetchedAt: "invalid" }, buildPlannerWeatherRequest({ latitude: 48.8566, longitude: 2.3522, actionDate: "2026-09-15", scheduledStartTime: "10:00", scheduledEndTime: "12:00", now: NOW }))).toBe(false);
  });

  it("normalizes string coordinates and rejects malformed civil times", () => {
    expect(buildPlannerWeatherRequest({
      latitude: " 48.8566 ",
      longitude: "2.3522",
      actionDate: "2026-09-15",
      scheduledStartTime: "10:00:30",
      scheduledEndTime: "12:00",
    })).toMatchObject({
      latitude: 48.8566,
      longitude: 2.3522,
      scheduledStartAt: "2026-09-15T10:00",
      scheduledEndAt: "2026-09-15T12:00",
    });
    for (const time of ["", "25:00", "10", null, 10]) {
      expect(buildPlannerWeatherRequest({
        latitude: 48,
        longitude: 2,
        actionDate: "2026-09-15",
        scheduledStartTime: time,
        scheduledEndTime: "12:00",
      })).toBeNull();
    }
    expect(buildPlannerWeatherRequest({
      latitude: 48,
      longitude: 2,
      actionDate: "2026-02-30",
      scheduledStartTime: "10:00",
      scheduledEndTime: "12:00",
    })).toBeNull();
  });

  it("validates stored context shape and recomputes missing operational assessment", async () => {
    const context = await fetchPlannerWeatherContext({
      latitude: 48.8566,
      longitude: 2.3522,
      scheduledStartAt: "2026-09-15T10:00",
      scheduledEndAt: "2026-09-15T12:00",
      now: NOW,
      client: { fetcher: async () => response(forecast()) },
    });
    expect(isPlannerWeatherContext(context)).toBe(true);
    expect(isPlannerWeatherContext({ ...context, weatherStatus: "unavailable" } as never)).toBe(false);
    expect(isPlannerWeatherContext({ ...context, location: { ...context.location, latitude: Number.NaN } } as never)).toBe(false);
    expect(isPlannerWeatherContext({ ...context, hourly: "invalid" } as never)).toBe(false);

    const withoutAssessment = { ...context, operationalRisk: undefined };
    expect(plannerWeatherOperationalAssessment(withoutAssessment)).toMatchObject({ status: "limited", riskLevel: "orange" });
    expect(plannerWeatherOperationalAssessment({ ...withoutAssessment, hourly: [] })).toMatchObject({ status: "fallback", riskLevel: null });
  });

  it("rejects stale, future and incomplete cached contexts without using them", async () => {
    const context = await fetchPlannerWeatherContext({
      latitude: 48.8566,
      longitude: 2.3522,
      scheduledStartAt: "2026-09-15T10:00",
      scheduledEndAt: "2026-09-15T12:00",
      now: NOW,
      client: { fetcher: async () => response(forecast()) },
    });
    const request = buildPlannerWeatherRequest({
      latitude: 48.8566,
      longitude: 2.3522,
      actionDate: "2026-09-15",
      scheduledStartTime: "10:00",
      scheduledEndTime: "12:00",
      now: NOW,
    });
    expect(isPlannerWeatherContextCompatible({ ...context, fetchedAt: "2026-09-13T00:00:00.000Z" }, request)).toBe(false);
    expect(isPlannerWeatherContextCompatible({ ...context, fetchedAt: "2026-09-14T09:00:00.000Z" }, { ...request!, now: new Date("2026-09-14T08:00:00.000Z") })).toBe(false);
    expect(isPlannerWeatherContextCompatible({ ...context, hourly: [] }, request)).toBe(false);
    expect(isPlannerWeatherContextCompatible({ ...context, coveredWindow: null }, request)).toBe(false);
  });
});
