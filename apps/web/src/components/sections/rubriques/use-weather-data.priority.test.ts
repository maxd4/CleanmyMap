import { describe, expect, it } from "vitest";
import {
  buildFallbackWeatherLocation,
  canApplyAutomaticWeatherLocation,
  canApplyDraftWeatherLocation,
  shouldApplyDraftForecastDate,
} from "./use-weather-data";

describe("weather context precedence", () => {
  it("marks a failed geocoding fallback as unresolved instead of a weather locale", () => {
    const fallback = buildFallbackWeatherLocation("Lieu inconnu", "Lieu du pré-formulaire");

    expect(fallback).toMatchObject({
      label: "Lieu inconnu",
      resolution: "unresolved",
    });
  });

  it("gives a pre-form location priority over stored, profile and geolocation sources", () => {
    expect(
      canApplyAutomaticWeatherLocation({
        draftLocationLabel: "Paris 15e",
        hasManualLocation: false,
        hasResolvedInitialLocation: false,
      }),
    ).toBe(false);
    expect(canApplyDraftWeatherLocation("Paris 15e", false)).toBe(true);
  });

  it("keeps a later manual location selection authoritative", () => {
    expect(canApplyDraftWeatherLocation("Paris 15e", true)).toBe(false);
    expect(
      canApplyAutomaticWeatherLocation({
        draftLocationLabel: "",
        hasManualLocation: true,
        hasResolvedInitialLocation: false,
      }),
    ).toBe(false);
  });

  it("applies the pre-form date only until the forecast day is chosen manually", () => {
    expect(
      shouldApplyDraftForecastDate({
        draftActionDate: "2026-09-20",
        hasManualForecastDay: false,
        forecastDaysLength: 7,
      }),
    ).toBe(true);
    expect(
      shouldApplyDraftForecastDate({
        draftActionDate: "2026-09-20",
        hasManualForecastDay: true,
        forecastDaysLength: 7,
      }),
    ).toBe(false);
  });
});
