import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import {
  buildGeoNetworkEntities,
  FRANCE_METROPOLITAINE_BOUNDS,
  getIncidentGeoRelations,
  isInFranceMetropolitaine,
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
    expect(ckfd?.addressStatus).toBe("verified");
    expect(mego?.locationGroup).toBe("outside_paris");
    expect(mego?.communeLabel).toContain("Saint-Divy");
    expect(mego?.addressStatus).toBe("verified");
    expect(cartonPlein?.locationGroup).toBe("in_paris");
    expect(cartonPlein?.addressStatus).toBe("verified");
    expect(gestesPropres?.locationGroup).toBe("unknown_location");
    expect(gestesPropres?.coords).toBeNull();
    expect(gestesPropres?.addressStatus).toBe("unknown");

    // Corsica is included in Mainland France; overseas territories are excluded
    expect(isInFranceMetropolitaine(41.919, 8.738)).toBe(true);
    expect(isInFranceMetropolitaine(-21.115, 55.536)).toBe(false);
    expect(FRANCE_METROPOLITAINE_BOUNDS[0][0]).toBeLessThan(FRANCE_METROPOLITAINE_BOUNDS[1][0]);

    // Conflicting school addresses vs online platforms vs verified addresses
    const schoolVoltaire = entities.find((e) => e.id === "school-uai-0751241s");
    const jeVeuxAider = entities.find((e) => e.id === "evt-je-veux-aider");
    expect(schoolVoltaire?.addressStatus).toBe("contradictory");
    expect(jeVeuxAider?.addressStatus).toBe("not_applicable");

    // Factual indicators: deduplicated neighbors, no arbitrary score
    expect(ckfd?.indicators.documentedNeighborsCount).toBeGreaterThan(0);
    expect(jeVeuxAider?.indicators.provenJointOperationsCount).toBeNull();
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
