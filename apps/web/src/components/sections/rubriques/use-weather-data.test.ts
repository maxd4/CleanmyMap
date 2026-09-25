import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const weatherSuggestionsSource = readFileSync(
  new URL("./use-weather-location-suggestions.ts", import.meta.url),
  "utf8",
);

describe("weather location suggestions", () => {
  it("uses a bounded query debounce, minimum length and abortable fetch", () => {
    expect(weatherSuggestionsSource).toContain("WEATHER_LOCATION_SUGGESTION_DEBOUNCE_MS = 220");
    expect(weatherSuggestionsSource).toContain("debouncedLocationQuery.length >= 3");
    expect(weatherSuggestionsSource).toContain("new AbortController()");
    expect(weatherSuggestionsSource).toContain("signal: controller.signal");
    expect(weatherSuggestionsSource).toContain("locationSuggestionsAbortRef.current?.abort()");
  });
});
