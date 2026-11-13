import { describe, expect, it } from "vitest";
import {
  buildPhotonSearchUrl,
  buildTerritoryLeafletBounds,
  isWithinFranceTerritoryBounds,
  isWithinTerritoryBounds,
  matchesPhotonCountry,
  parsePhotonCoordinates,
} from "./territory";

describe("territory geography", () => {
  it("keeps manual map selection global while retaining the France provider guard", () => {
    expect(buildTerritoryLeafletBounds()).toEqual([
      [-90, -180],
      [90, 180],
    ]);
    expect(isWithinTerritoryBounds(-17.5516, -149.5585)).toBe(true);
    expect(isWithinFranceTerritoryBounds(-17.5516, -149.5585)).toBe(false);
    expect(isWithinFranceTerritoryBounds(48.8566, 2.3522)).toBe(true);
  });

  it("builds a country-aware Photon query without a France bbox", () => {
    const url = buildPhotonSearchUrl("Bruxelles", 6, "Belgium");
    expect(url).toContain("https://photon.komoot.io/api/");
    expect(url).toContain("q=Bruxelles%2C+Belgium");
    expect(url).not.toContain("viewbox");
  });

  it("distinguishes absent provider coordinates from a valid zero", () => {
    expect(parsePhotonCoordinates({ geometry: { coordinates: [null, ""] } })).toBeNull();
    expect(parsePhotonCoordinates({ geometry: { coordinates: ["", "0"] } })).toBeNull();
    expect(parsePhotonCoordinates({ geometry: { coordinates: [0, 0] } })).toEqual({ latitude: 0, longitude: 0 });
  });

  it("requires country evidence for foreign Photon searches while preserving justified France compatibility", () => {
    expect(matchesPhotonCountry({ properties: {} }, "CA")).toBe(false);
    expect(matchesPhotonCountry({ properties: { countrycode: "ca" } }, "CA")).toBe(true);
    expect(matchesPhotonCountry({ properties: {} }, "FR")).toBe(true);
    expect(matchesPhotonCountry({ properties: { countrycode: "be" } }, "FR")).toBe(false);
  });
});
