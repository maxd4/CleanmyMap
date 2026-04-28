import { describe, expect, it } from "vitest";
import {
  buildGreaterParisNominatimSearchUrl,
  buildGreaterParisLeafletBounds,
  buildGreaterParisViewbox,
  isWithinGreaterParisBounds,
  parseNominatimCoordinates,
} from "./greater-paris";

describe("greater paris geo helpers", () => {
  it("builds a bounded search url for paris plus nearby suburbs", () => {
    const url = buildGreaterParisNominatimSearchUrl("Boulogne-Billancourt");
    expect(url).toContain("https://nominatim.openstreetmap.org/search?");
    expect(url).toContain("bounded=1");
    expect(url).toContain("countrycodes=fr");
    expect(url).toContain("viewbox=2.12%2C48.98%2C2.55%2C48.74");
    expect(buildGreaterParisViewbox()).toBe("2.12,48.98,2.55,48.74");
  });

  it("parses coordinates and filters values outside the perimeter", () => {
    expect(parseNominatimCoordinates({ lat: "48.8566", lon: "2.3522" })).toEqual({
      latitude: 48.8566,
      longitude: 2.3522,
    });
    expect(isWithinGreaterParisBounds(48.8566, 2.3522)).toBe(true);
    expect(isWithinGreaterParisBounds(49.2, 2.3522)).toBe(false);
    expect(parseNominatimCoordinates({ lat: "NaN", lon: "2.3522" })).toBeNull();
  });

  it("builds leaflet bounds for a visible perimeter overlay", () => {
    expect(buildGreaterParisLeafletBounds()).toEqual([
      [48.74, 2.12],
      [48.98, 2.55],
    ]);
  });
});
