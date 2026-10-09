import { describe, expect, it } from "vitest";
import {
  assessForecastDay,
  evaluateCurrentWeatherRisk,
  selectForecastDayIndex,
} from "./weather-data.model";

function point(date: string, temperature: number, rain = 0, wind = 10) {
  return {
    time: `${date}T10:00`,
    temperature,
    rain,
    precipitationProbability: 0,
    wind,
    humidity: 50,
    uv: 2,
    weatherCode: 1,
  };
}

describe("weather data selection", () => {
  it("keeps current conditions separate from the selected future day", () => {
    const currentRisk = evaluateCurrentWeatherRisk({ temperature: 20, rain: 0, wind: 10 });
    const selectedForecast = assessForecastDay({
      hours: [
        point("2026-10-12", 34, 3.2, 50),
        { ...point("2026-10-12", 34, 3.2, 50), time: "2026-10-12T11:00" },
      ],
    });

    expect(currentRisk?.level).toBe("vert");
    expect(selectedForecast.risk?.level).toBe("rouge");
    expect(selectedForecast.windows.avoid[0]).toMatchObject({
      from: "2026-10-12T10:00",
      to: "2026-10-12T11:00",
      level: "rouge",
    });
  });

  it("does not invent a risk when forecast metrics are missing", () => {
    const assessment = assessForecastDay({
      hours: [{ ...point("2026-10-12", 20), rain: null }],
    });

    expect(assessment.risk).toBeNull();
    expect(assessment.windows).toEqual({ recommended: [], avoid: [] });
    expect(evaluateCurrentWeatherRisk({ temperature: 20, rain: null, wind: 10 })).toBeNull();
  });

  it("preserves an unavailable state when the action date is outside the forecast horizon", () => {
    expect(selectForecastDayIndex({
      forecastDates: ["2026-10-10", "2026-10-11"],
      draftActionDate: "2026-10-20",
      selectedIndex: 0,
      hasManualSelection: false,
    })).toBe(-1);
    expect(selectForecastDayIndex({
      forecastDates: ["2026-10-10", "2026-10-11"],
      draftActionDate: "2026-10-20",
      selectedIndex: 1,
      hasManualSelection: true,
    })).toBe(1);
  });
});
