import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readStoredWeatherLocation,
  sanitizeStoredWeatherLocation,
} from "./weather-location-storage";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("weather-location-storage", () => {
  it("drops legacy latitude and longitude fields when sanitizing", () => {
    expect(
      sanitizeStoredWeatherLocation({
        label: " Paris ",
        subtitle: " Vue nationale ",
        latitude: 48.8566,
        longitude: 2.3522,
      }),
    ).toEqual({
      label: "Paris",
      subtitle: "Vue nationale",
    });
  });

  it("rewrites legacy localStorage payloads without coordinates", () => {
    const storage = new Map<string, string>();
    const localStorage = {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    };

    storage.set(
      "cmm.weather.selected-location",
      JSON.stringify({
        label: "Lyon",
        subtitle: "Vue locale",
        latitude: 45.764,
        longitude: 4.8357,
      }),
    );

    vi.stubGlobal("window", { localStorage });

    expect(readStoredWeatherLocation()).toEqual({
      label: "Lyon",
      subtitle: "Vue locale",
    });
    expect(storage.get("cmm.weather.selected-location")).toBe(
      JSON.stringify({
        label: "Lyon",
        subtitle: "Vue locale",
      }),
    );
  });
});
