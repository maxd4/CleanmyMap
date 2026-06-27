import { describe, expect, it, vi } from "vitest";
import type { TerritoryLocationPreference } from "@/lib/user-location-preference";
import {
  buildViewportFromPoints,
  findNearestMajorCity,
  resolveMapViewportFallback,
} from "./map-viewport-fallback";

describe("map viewport fallback", () => {
  it("selects the nearest major city for a given point", () => {
    expect(
      findNearestMajorCity({
        latitude: 45.764,
        longitude: 4.8357,
      }).label,
    ).toBe("Lyon");
  });

  it("builds a viewport that contains all source points", () => {
    const viewport = buildViewportFromPoints([
      { latitude: 48.8566, longitude: 2.3522 },
      { latitude: 48.92, longitude: 2.52 },
    ]);

    expect(viewport).not.toBeNull();
    expect(viewport?.bounds.south).toBeLessThanOrEqual(48.8566);
    expect(viewport?.bounds.north).toBeGreaterThanOrEqual(48.92);
    expect(viewport?.bounds.west).toBeLessThanOrEqual(2.3522);
    expect(viewport?.bounds.east).toBeGreaterThanOrEqual(2.52);
    expect(viewport?.zoom).toBeLessThanOrEqual(13.5);
    expect(viewport?.zoom).toBeGreaterThanOrEqual(9);
  });

  it("resolves a fallback viewport from a geocoded territory label", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          lat: "45.764",
          lon: "4.8357",
        },
      ],
    }));
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    const preference: TerritoryLocationPreference = {
      country: "France",
      level: "commune",
      label: "Lyon",
      subtitle: "Rhône",
      arrondissement: null,
      arrondissementCity: null,
      locationType: "work",
    };

    try {
      const viewport = await resolveMapViewportFallback(preference);

      expect(fetchMock).toHaveBeenCalled();
      expect(viewport).not.toBeNull();
      expect(viewport?.bounds.south).toBeLessThanOrEqual(45.764);
      expect(viewport?.bounds.north).toBeGreaterThanOrEqual(45.764);
      expect(viewport?.bounds.west).toBeLessThanOrEqual(4.8357);
      expect(viewport?.bounds.east).toBeGreaterThanOrEqual(4.8357);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
