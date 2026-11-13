import { describe, expect, it, vi } from "vitest";
import type { TerritoryLocationPreference } from "@/lib/user-location-preference";
import {
  buildViewportFromPoints,
  resolveMapViewportFallback,
} from "./map-viewport-fallback";

describe("map viewport fallback", () => {
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

  it("resolves a strict local fallback viewport from a geocoded territory label", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        features: [{ geometry: { coordinates: [4.8357, 45.764] } }],
      }),
    }));
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    const preference: TerritoryLocationPreference = {
      country: "FR",
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
      expect(viewport?.center).toEqual([45.764, 4.8357]);
      expect(viewport?.zoom).toBe(13);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("skips a contradictory Photon result before accepting the selected country", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        features: [
          { geometry: { coordinates: [2.3522, 48.8566] }, properties: { countrycode: "fr" } },
          { geometry: { coordinates: [-73.5674, 45.5019] }, properties: { countrycode: "ca" } },
        ],
      }),
    }));
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    const preference: TerritoryLocationPreference = {
      country: "CA",
      level: "locality",
      label: "Montréal",
      subtitle: "Québec",
      arrondissement: null,
      arrondissementCity: null,
      locationType: "residence",
    };

    try {
      const viewport = await resolveMapViewportFallback(preference);
      expect(viewport?.center).toEqual([45.5019, -73.5674]);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("does not invent a French city center for an unresolved foreign preference", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ features: [] }),
    })) as unknown as typeof fetch;

    const preference: TerritoryLocationPreference = {
      country: "CA",
      level: "administrative_area",
      label: "Québec introuvable",
      subtitle: null,
      arrondissement: null,
      arrondissementCity: "Paris",
      locationType: "work",
    };

    try {
      await expect(resolveMapViewportFallback(preference)).resolves.toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
