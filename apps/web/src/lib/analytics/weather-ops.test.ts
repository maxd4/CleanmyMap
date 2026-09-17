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
});
