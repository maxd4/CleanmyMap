import { describe, expect, it } from "vitest";
import {
  CARTO_ATTRIBUTION,
  CARTO_BASEMAPS,
  buildCartoTileUrl,
} from "./basemaps";

describe("CARTO basemap configuration", () => {
  it("builds every supported CARTO style from the shared URL primitive", () => {
    expect(buildCartoTileUrl("light", "public carto key")).toContain(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    );
    expect(buildCartoTileUrl("light", "public carto key")).toContain(
      "?key=public%20carto%20key",
    );
    expect(buildCartoTileUrl("dark", "public-key")).toContain(
      "/dark_all/{z}/{x}/{y}{r}.png?key=public-key",
    );
    expect(buildCartoTileUrl("voyager", "public-key")).toContain(
      "/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=public-key",
    );
  });

  it("keeps the public fallback URL usable when no key is configured", () => {
    expect(buildCartoTileUrl("light", "  ")).not.toContain("?key=");
  });

  it("gives all CARTO consumers the same OSM and CARTO attribution", () => {
    expect(CARTO_BASEMAPS.light.attribution).toBe(CARTO_ATTRIBUTION);
    expect(CARTO_BASEMAPS.dark.attribution).toBe(CARTO_ATTRIBUTION);
    expect(CARTO_BASEMAPS.voyager.attribution).toBe(CARTO_ATTRIBUTION);
    expect(CARTO_ATTRIBUTION).toContain("OpenStreetMap");
    expect(CARTO_ATTRIBUTION).toContain("CARTO");
  });
});
