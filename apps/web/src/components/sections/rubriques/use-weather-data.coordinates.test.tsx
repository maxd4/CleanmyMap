import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useSWR: vi.fn(),
  useUser: vi.fn(),
  useSuggestions: vi.fn(),
}));

vi.mock("swr", () => ({ default: mocks.useSWR }));
vi.mock("@clerk/nextjs", () => ({ useUser: mocks.useUser }));
vi.mock("./use-weather-location-suggestions", () => ({
  useWeatherLocationSuggestions: mocks.useSuggestions,
}));

import { useWeatherData } from "./use-weather-data";

function WeatherProbe({ latitude = "48.85", longitude = "2.35" }: { latitude?: string; longitude?: string }) {
  const weather = useWeatherData({
    locationLabel: "Adresse précise non retrouvée",
    latitude,
    longitude,
    contextReady: true,
  });
  return React.createElement("output", {
    "data-location": `${weather.selectedLocation.latitude},${weather.selectedLocation.longitude}`,
    "data-resolution": weather.locationResolution,
  }, weather.weatherStatus);
}

describe("weather coordinates handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useUser.mockReturnValue({ isLoaded: true, user: null });
    mocks.useSuggestions.mockReturnValue({
      locationSuggestions: { data: { items: [] }, isLoading: false },
      locationSuggestionsError: undefined,
    });
    mocks.useSWR.mockReturnValue({
      data: {
        current: { temperature_2m: 20, precipitation: 0, wind_speed_10m: 10 },
        hourly: {
          time: ["2026-10-10T10:00"],
          temperature_2m: [20],
          precipitation: [0],
          precipitation_probability: [0],
          wind_speed_10m: [10],
          relative_humidity_2m: [50],
          uv_index: [2],
          weather_code: [1],
        },
        daily: {
          time: ["2026-10-10"],
          temperature_2m_min: [12],
          temperature_2m_max: [22],
          precipitation_sum: [0],
          wind_speed_10m_max: [15],
          uv_index_max: [2],
          weather_code: [1],
        },
      },
      isLoading: false,
      error: undefined,
    });
  });

  it("requests Open-Meteo with the canonical latitude/longitude pair", () => {
    const markup = renderToStaticMarkup(React.createElement(WeatherProbe, {}));

    expect(markup).toContain('data-location="48.85,2.35"');
    expect(markup).toContain('data-resolution="resolved"');
    expect(mocks.useSWR).toHaveBeenCalledWith(
      ["section-weather-location", 48.85, 2.35],
      expect.any(Function),
      expect.any(Object),
    );
  });

  it("does not request a forecast for an un-geocoded free address", () => {
    renderToStaticMarkup(React.createElement(WeatherProbe, { latitude: "", longitude: "" }));

    expect(mocks.useSWR).toHaveBeenCalledWith(null, expect.any(Function), expect.any(Object));
  });
});
