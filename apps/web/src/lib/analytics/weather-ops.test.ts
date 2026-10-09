import { describe, expect, it } from "vitest";
import {
  buildInterventionWindows,
  evaluateWeatherWindowRisk,
  evaluateWeatherRisk,
} from "../weather/ops-weather";

describe("evaluateWeatherRisk", () => {
  it("flags strong weather as rouge", () => {
    const risk = evaluateWeatherRisk({ temperature: 34, rain: 3.2, wind: 50 });
    expect(risk.level).toBe("rouge");
    expect(risk.reasons.length).toBeGreaterThan(0);
    expect(risk.operationalLimitMinutes).toBe(45);
    expect(risk.operationalRule.version).toBe("weather-operational-rules-v1");
  });

  it("keeps mild weather as vert", () => {
    const risk = evaluateWeatherRisk({ temperature: 20, rain: 0, wind: 10 });
    expect(risk.level).toBe("vert");
    expect(risk.operationalLimitMinutes).toBeNull();
  });

  it.each([
    [{ temperature: 20, rain: 0.8, wind: 10 }, "orange"],
    [{ temperature: 20, rain: 3, wind: 10 }, "rouge"],
    [{ temperature: 20, rain: 0, wind: 30 }, "orange"],
    [{ temperature: 20, rain: 0, wind: 45 }, "rouge"],
    [{ temperature: 28, rain: 0, wind: 10 }, "orange"],
    [{ temperature: 33, rain: 0, wind: 10 }, "rouge"],
  ] as const)("keeps the established threshold at %j", (input, expected) => {
    expect(evaluateWeatherRisk(input).level).toBe(expected);
  });

  it("aggregates a window deterministically without inventing missing metrics", () => {
    const risk = evaluateWeatherWindowRisk([
      { time: "2026-04-10T10:00:00Z", temperature: 20, rain: 0, wind: 10 },
      { time: "2026-04-10T11:00:00Z", temperature: 29, rain: 0.1, wind: 12 },
    ]);

    expect(risk).toMatchObject({
      level: "orange",
      operationalLimitMinutes: 90,
      operationalRule: {
        version: "weather-operational-rules-v1",
        source: "apps/web/src/lib/weather/ops-weather",
      },
    });
    expect(evaluateWeatherWindowRisk([
      { time: "2026-04-10T10:00:00Z", temperature: 20, rain: Number.NaN, wind: 10 },
    ])).toBeNull();
  });
});

describe("buildInterventionWindows", () => {
  it("returns recommended and avoid windows", () => {
    const hourly = Array.from({ length: 12 }).map((_, index) => ({
      time: `2026-04-10T${String(index).padStart(2, "0")}:00:00Z`,
      temperature: index >= 8 ? 34 : 22,
      rain: index >= 8 ? 3.5 : 0,
      wind: 12,
    }));

    const windows = buildInterventionWindows(hourly);
    expect(windows.recommended.length).toBeGreaterThan(0);
    expect(windows.avoid.length).toBeGreaterThan(0);
  });

  it("keeps adjacent favorable hours in one continuous local-day window", () => {
    const windows = buildInterventionWindows([
      { time: "2026-04-10T08:00", temperature: 20, rain: 0, wind: 10 },
      { time: "2026-04-10T09:00", temperature: 20, rain: 0, wind: 10 },
      { time: "2026-04-10T10:00", temperature: 20, rain: 0, wind: 10 },
      { time: "2026-04-10T11:00", temperature: 20, rain: 0, wind: 10 },
    ]);

    expect(windows.recommended).toEqual([
      expect.objectContaining({ from: "2026-04-10T08:00", to: "2026-04-10T11:00", level: "vert" }),
    ]);
  });

  it("does not create a window across a local day boundary or a missing hour", () => {
    const windows = buildInterventionWindows([
      { time: "2026-10-25T23:00", temperature: 20, rain: 0, wind: 10 },
      { time: "2026-10-26T00:00", temperature: 20, rain: 0, wind: 10 },
      { time: "2026-10-26T02:00", temperature: 20, rain: 0, wind: 10 },
      { time: "2026-10-26T04:00", temperature: 20, rain: 0, wind: 10 },
    ]);

    expect(windows.recommended).toEqual([]);
    expect(windows.avoid).toEqual([]);
  });

  it("accepts an ordered repeated local hour during the autumn DST transition", () => {
    const windows = buildInterventionWindows([
      { time: "2026-10-25T02:00", temperature: 20, rain: 0, wind: 10 },
      { time: "2026-10-25T02:00", temperature: 20, rain: 0, wind: 10 },
    ]);

    expect(windows.recommended).toHaveLength(1);
  });
});
