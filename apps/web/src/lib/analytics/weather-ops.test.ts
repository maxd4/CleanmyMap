import { describe, expect, it } from "vitest";
import {
  buildInterventionWindows,
  evaluateWeatherRisk,
} from "../weather/ops-weather";

describe("evaluateWeatherRisk", () => {
  it("flags strong weather as rouge", () => {
    const risk = evaluateWeatherRisk({ temperature: 34, rain: 3.2, wind: 50 });
    expect(risk.level).toBe("rouge");
    expect(risk.reasons.length).toBeGreaterThan(0);
  });

  it("keeps mild weather as vert", () => {
    const risk = evaluateWeatherRisk({ temperature: 20, rain: 0, wind: 10 });
    expect(risk.level).toBe("vert");
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
