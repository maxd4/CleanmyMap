import { describe, expect, it, vi } from "vitest";
import { findNearestParisPressureZone } from "./paris-pressure-lookup";
import type { ParisPressureSnapshot } from "./paris-pressure-contract";
import { parisPressureSnapshot as snapshot } from "./__tests__/paris-pressure-fixture";

describe("Paris pressure lookup", () => {
  it("is spatially bounded and deterministic", () => {
    expect(findNearestParisPressureZone({ latitude: 48.8566, longitude: 2.3522 }, snapshot)).toMatchObject({ zoneId: "751010101", humanPressure: 0.8 });
    expect(findNearestParisPressureZone({ latitude: 45, longitude: 2 }, snapshot)).toBeNull();
  });

  it("privilégie l'IRIS contenant le point sur le centroïde voisin", () => {
    const polygonSnapshot = {
      ...snapshot,
      zones: [
        { ...snapshot.zones[0], id: "751010101", centroid: { latitude: 48.855, longitude: 2.34 }, geometry: { type: "Polygon" as const, coordinates: [[[2.35, 48.85], [2.37, 48.85], [2.37, 48.87], [2.35, 48.87], [2.35, 48.85]]] } },
        { ...snapshot.zones[0], id: "751010102", centroid: { latitude: 48.8566, longitude: 2.3522 }, geometry: { type: "Polygon" as const, coordinates: [[[2.34, 48.84], [2.35, 48.84], [2.35, 48.85], [2.34, 48.85], [2.34, 48.84]]] } },
      ],
    } satisfies ParisPressureSnapshot;
    expect(findNearestParisPressureZone({ latitude: 48.86, longitude: 2.36 }, polygonSnapshot)).toMatchObject({ zoneId: "751010101", matchMethod: "point-in-polygon", approximationWarning: null });
  });

  it("marque le fallback centroïde et reste borné", () => {
    const result = findNearestParisPressureZone({ latitude: 48.8566, longitude: 2.3522 }, snapshot);
    expect(result).toMatchObject({ matchMethod: "nearest-centroid-fallback", distanceToCentroidKm: 0 });
    expect(result?.approximationWarning).toContain("Approximation");
  });

  it("ne rattache pas un point hors des polygones lorsque leur couverture est complète", () => {
    const completeSnapshot = {
      ...snapshot,
      coverage: { ...snapshot.coverage, geometryZoneCount: 1, geometryComplete: true, missingGeometryZoneCount: 0, complete: true },
      zones: [{ ...snapshot.zones[0], geometry: { type: "Polygon" as const, coordinates: [[[2.35, 48.85], [2.36, 48.85], [2.36, 48.86], [2.35, 48.86], [2.35, 48.85]]] } }],
    } satisfies ParisPressureSnapshot;
    expect(findNearestParisPressureZone({ latitude: 48.865, longitude: 2.355 }, completeSnapshot)).toBeNull();
    expect(findNearestParisPressureZone({ latitude: 48.80, longitude: 2.355 }, completeSnapshot)).toBeNull();
  });

  it("n'effectue aucun appel réseau", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    try {
      findNearestParisPressureZone({ latitude: 48.8566, longitude: 2.3522 }, snapshot);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
