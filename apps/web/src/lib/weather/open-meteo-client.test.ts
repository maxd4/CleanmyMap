import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOpenMeteoForecastCache,
  fetchOpenMeteoForecast,
} from "./open-meteo-client";

describe("shared Open-Meteo client", () => {
  beforeEach(() => clearOpenMeteoForecastCache());

  it("uses the same bounded transport for UI/server callers and preserves absent fields", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      current: { temperature_2m: 20 },
      hourly: { time: ["2026-09-15T10:00"], precipitation: [null] },
    }), { status: 200 }));

    const result = await fetchOpenMeteoForecast({
      latitude: 48.85,
      longitude: 2.35,
      hourly: ["temperature_2m", "precipitation"],
    }, { fetcher });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current?.temperature_2m).toBe(20);
    expect(result.hourly?.precipitation).toEqual([null]);
  });

  it("rejects coordinates outside the provider contract before making a request", async () => {
    const fetcher = vi.fn();

    await expect(fetchOpenMeteoForecast({ latitude: 91, longitude: 2.35 }, { fetcher })).rejects.toMatchObject({
      reason: "invalid_response",
    });
    await expect(fetchOpenMeteoForecast({ latitude: 48.85, longitude: -181 }, { fetcher })).rejects.toMatchObject({
      reason: "invalid_response",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("normalizes complete response sections and caches an unexpired request", async () => {
    let now = 1_000;
    const fetcher = vi.fn(async (url: string) => {
      expect(url).toContain("forecast_days=3");
      expect(url).toContain("timezone=UTC");
      expect(url).toContain("current=temperature_2m%2Cweather_code");
      expect(url).toContain("daily=weather_code");
      return new Response(JSON.stringify({
        current: {
          temperature_2m: 20,
          apparent_temperature: "bad",
          precipitation: 1,
          precipitation_probability: null,
          wind_speed_10m: 4,
          wind_gusts_10m: 8,
          uv_index: 3,
          relative_humidity_2m: 70,
          weather_code: 2,
        },
        hourly: {
          time: ["2026-09-15T10:00", 2],
          temperature_2m: [20, "bad"],
          apparent_temperature: [19],
        },
        daily: {
          time: ["2026-09-15"],
          temperature_2m_max: [25],
          weather_code: [2],
        },
      }), { status: 200 });
    });
    const request = {
      latitude: 48.85,
      longitude: 2.35,
      forecastDays: 3,
      timezone: "UTC",
      current: ["temperature_2m", "weather_code"] as const,
      daily: ["weather_code"] as const,
    };

    const first = await fetchOpenMeteoForecast(request, { fetcher, now: () => now, cacheTtlMs: 100 });
    now = 1_050;
    const second = await fetchOpenMeteoForecast(request, { fetcher, now: () => now, cacheTtlMs: 100 });

    expect(second).toBe(first);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(first).toMatchObject({
      current: { temperature_2m: 20, apparent_temperature: null, weather_code: 2 },
      hourly: { time: ["2026-09-15T10:00"], temperature_2m: [20, null], apparent_temperature: [19] },
      daily: { time: ["2026-09-15"], temperature_2m_max: [25], weather_code: [2] },
    });
  });

  it("refreshes expired entries and removes failed provider promises from the cache", async () => {
    let now = 1_000;
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ current: { temperature_2m: 21 } }), { status: 200 }))
      .mockRejectedValue(new Error("provider unavailable"));
    const request = { latitude: 48.85, longitude: 2.35 };

    await fetchOpenMeteoForecast(request, { fetcher, now: () => now, cacheTtlMs: 10 });
    now = 1_020;
    const refreshed = await fetchOpenMeteoForecast(request, { fetcher, now: () => now, cacheTtlMs: 10 });
    expect(refreshed.current?.temperature_2m).toBe(21);

    await expect(fetchOpenMeteoForecast({ ...request, latitude: 48.851 }, { fetcher, now: () => now })).rejects.toMatchObject({ reason: "provider_error" });
    await expect(fetchOpenMeteoForecast({ ...request, latitude: 48.851 }, { fetcher, now: () => now })).rejects.toMatchObject({ reason: "provider_error" });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it.each([
    [new Response("provider failure", { status: 503 }), "provider_error"],
    [new Response("not json", { status: 200 }), "invalid_response"],
    [new Response(JSON.stringify(null), { status: 200 }), "invalid_response"],
  ])("classifies provider and payload failures as %s", async (response, reason) => {
    const fetcher = vi.fn().mockResolvedValue(response);
    await expect(fetchOpenMeteoForecast({ latitude: 48.85, longitude: 2.35 }, { fetcher })).rejects.toMatchObject({ reason });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("maps non-Error provider failures and aborts a request that exceeds the timeout", async () => {
    const nonErrorFetcher = vi.fn().mockRejectedValue("provider string failure");
    await expect(fetchOpenMeteoForecast({ latitude: 48.85, longitude: 2.35 }, { fetcher: nonErrorFetcher })).rejects.toEqual(
      expect.objectContaining({ reason: "provider_error", message: "Open-Meteo request failed." }),
    );

    const timeoutFetcher = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    await expect(fetchOpenMeteoForecast({ latitude: 48.85, longitude: 2.35 }, { fetcher: timeoutFetcher, timeoutMs: 1 })).rejects.toMatchObject({
      reason: "timeout",
    });
  });

  it("evicts old cache entries after the bounded cache capacity", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    for (let index = 0; index < 33; index += 1) {
      await fetchOpenMeteoForecast({ latitude: 48.85, longitude: 2.35 + index / 100 }, { fetcher });
    }
    expect(fetcher).toHaveBeenCalledTimes(33);
    await fetchOpenMeteoForecast({ latitude: 48.85, longitude: 2.35 }, { fetcher });
    expect(fetcher).toHaveBeenCalledTimes(34);
  });
});
