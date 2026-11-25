import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import {
  buildGeoNetworkEntities,
  getIncidentGeoRelations,
  isInParisIntramuros,
  PARIS_INTRAMUROS_BOUNDS,
} from "./annuaire-geo-network.model";
import { buildNamedMarkerIconHtml } from "./annuaire-map-icon";

const enriched = INITIAL_ANNUAIRE_ENTRIES.map((entry) => ({ ...entry, distanceKm: null }));

describe("annuaire-geo-network unified geographical model", () => {
  it("frames Paris intramuros and classifies Paris, outside-Paris and unknown-location entities", () => {
    expect(isInParisIntramuros(48.8566, 2.3522)).toBe(true);
    expect(isInParisIntramuros(48.926182, 2.316068)).toBe(false); // Gennevilliers
    expect(isInParisIntramuros(48.466755, -4.336828)).toBe(false); // Saint-Divy
    expect(PARIS_INTRAMUROS_BOUNDS[0][0]).toBeLessThan(PARIS_INTRAMUROS_BOUNDS[1][0]);

    const entities = buildGeoNetworkEntities(enriched, enriched, true);
    const ckfd = entities.find((e) => e.id === "operator-ckfd");
    const mego = entities.find((e) => e.id === "operator-mego");
    const cartonPlein = entities.find((e) => e.id === "operator-carton-plein-cyclo");
    const gestesPropres = entities.find((e) => e.id === "asso-gestes-propres");

    expect(ckfd?.locationGroup).toBe("outside_paris");
    expect(ckfd?.communeLabel).toContain("Gennevilliers");
    expect(mego?.locationGroup).toBe("outside_paris");
    expect(mego?.communeLabel).toContain("Saint-Divy");
    expect(cartonPlein?.locationGroup).toBe("in_paris");
    expect(gestesPropres?.locationGroup).toBe("unknown_location");
    expect(gestesPropres?.coords).toBeNull();
  });

  it("renders named HTML-escaped markers instead of anonymous spheres", () => {
    const html = buildNamedMarkerIconHtml({
      name: 'Collectif <script>alert("x")</script>',
      family: "environnemental",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Collectif");
  });

  it("shows zero relations at rest and only documented incident relations on selection", () => {
    const entities = buildGeoNetworkEntities(enriched, enriched, true);
    expect(getIncidentGeoRelations(null, entities)).toEqual([]);

    const ckfdRelations = getIncidentGeoRelations("operator-ckfd", entities);
    expect(ckfdRelations.length).toBeGreaterThan(0);
    for (const item of ckfdRelations) {
      expect(
        item.fromEntity.networkActorId === "operator-ckfd" ||
          item.toEntity.networkActorId === "operator-ckfd",
      ).toBe(true);
    }
  });
});
