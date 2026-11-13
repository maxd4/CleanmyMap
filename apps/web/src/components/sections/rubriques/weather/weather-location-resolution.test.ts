// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { TerritoryLocationPreference } from "@/lib/user-location-preference";
import { resolveWeatherLocationRequest } from "./weather-location-resolution";

function preference(overrides: Partial<TerritoryLocationPreference> = {}): TerritoryLocationPreference {
  return {
    country: "CA",
    level: "country",
    label: "Canada",
    subtitle: "Vue nationale",
    arrondissement: null,
    arrondissementCity: null,
    locationType: "residence",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("weather location country-aware resolution", () => {
  it("passes a foreign preference to the international provider and keeps its coordinates", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        status: "ok",
        items: [{
          label: "Montréal",
          subtitle: "Québec · Canada",
          latitude: 45.5019,
          longitude: -73.5674,
          importance: null,
        }],
      }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const location = await resolveWeatherLocationRequest({
      source: "preference",
      draftLocationLabel: "",
      storedLocation: null,
      preference: preference(),
      geolocationAvailable: false,
      signal: new AbortController().signal,
    });

    expect(location).toMatchObject({
      label: "Montréal",
      latitude: 45.5019,
      longitude: -73.5674,
      resolution: "resolved",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/geo/address-suggestions?q=Canada&limit=1&country=CA",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns an explicit unavailable foreign location instead of the France center", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", items: [] }), { status: 200 }),
    ));

    const location = await resolveWeatherLocationRequest({
      source: "preference",
      draftLocationLabel: "",
      storedLocation: null,
      preference: preference({ country: "SN", label: "Sénégal" }),
      geolocationAvailable: false,
      signal: new AbortController().signal,
    });

    expect(location?.resolution).toBe("unresolved");
    expect(Number.isNaN(location?.latitude)).toBe(true);
    expect(Number.isNaN(location?.longitude)).toBe(true);
  });

  it("preserves the established France country center", async () => {
    const location = await resolveWeatherLocationRequest({
      source: "preference",
      draftLocationLabel: "",
      storedLocation: null,
      preference: preference({ country: "FR", label: "France entière" }),
      geolocationAvailable: false,
      signal: new AbortController().signal,
    });

    expect(location).toMatchObject({
      latitude: 46.603354,
      longitude: 1.888334,
      resolution: "resolved",
    });
  });
});
