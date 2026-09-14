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
});
