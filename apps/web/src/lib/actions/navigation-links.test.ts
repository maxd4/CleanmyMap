import { describe, expect, it } from "vitest";
import { buildActionNavigationLinks } from "./navigation-links";

describe("buildActionNavigationLinks", () => {
  it("prioritizes validated coordinates over the address", () => {
    expect(buildActionNavigationLinks({ latitude: 48.8566, longitude: 2.3522, address: "Adresse libre" })).toEqual({
      googleMaps: "https://www.google.com/maps/dir/?api=1&destination=48.8566%2C2.3522",
      waze: "https://www.waze.com/ul?ll=48.8566%2C2.3522&navigate=yes",
    });
  });

  it("falls back to the encoded address without inventing coordinates", () => {
    expect(buildActionNavigationLinks({ latitude: null, longitude: null, address: "Place de la République, Paris" })).toEqual({
      googleMaps: "https://www.google.com/maps/dir/?api=1&destination=Place%20de%20la%20R%C3%A9publique%2C%20Paris",
      waze: "https://www.waze.com/ul?q=Place%20de%20la%20R%C3%A9publique%2C%20Paris&navigate=yes",
    });
    expect(buildActionNavigationLinks({ latitude: 91, longitude: 2, address: "Adresse libre" })).not.toBeNull();
    expect(buildActionNavigationLinks({ latitude: null, longitude: null, address: " " })).toBeNull();
  });
});
