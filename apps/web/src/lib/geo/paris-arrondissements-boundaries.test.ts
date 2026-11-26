import { describe, expect, it } from "vitest";
import {
  findParisArrondissementForPoint,
  isPointInParisIntramuros,
  PARIS_ARRONDISSEMENTS_GEOJSON,
  PARIS_ARRONDISSEMENTS_PROVENANCE,
} from "./paris-arrondissements-boundaries";

describe("official Paris 20 arrondissements boundaries (Paris Data ODbL)", () => {
  it("contains all 20 official arrondissements with valid INSEE codes and ODbL provenance", () => {
    expect(PARIS_ARRONDISSEMENTS_PROVENANCE.license).toBe("ODbL");
    expect(PARIS_ARRONDISSEMENTS_GEOJSON.features).toHaveLength(20);
    const numbers = PARIS_ARRONDISSEMENTS_GEOJSON.features.map((f) => f.properties.c_ar);
    expect(numbers).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (const feature of PARIS_ARRONDISSEMENTS_GEOJSON.features) {
      expect(feature.properties.c_arinsee).toBe(75100 + feature.properties.c_ar);
      expect(feature.properties.l_ar.length).toBeGreaterThan(0);
    }
  });

  it("matches verified Paris sites and excludes outside-Paris municipalities", () => {
    expect(findParisArrondissementForPoint(48.856188, 2.355693)).toBe(4);
    expect(findParisArrondissementForPoint(48.889965, 2.364244)).toBe(18);
    expect(isPointInParisIntramuros(48.856188, 2.355693)).toBe(true);
    // Montreuil / Gennevilliers / Bresles lie outside Paris intramuros polygons
    expect(findParisArrondissementForPoint(48.8638, 2.4484)).toBeNull();
    expect(findParisArrondissementForPoint(48.926182, 2.316068)).toBeNull();
    expect(isPointInParisIntramuros(48.926182, 2.316068)).toBe(false);
  });
});
