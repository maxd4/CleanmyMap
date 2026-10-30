import { describe, expect, it } from "vitest";
import type { ActionRow } from "@/types/database";
import type { ActionDrawing } from "./types";
import {
  buildManualActionGeometryUpdate,
  buildObservedActionGeometryUpdate,
  geometryRepresentativeCoordinates,
  getAcceptedActionDrawing,
  hasPriorityObservedGeometry,
  isManualDrawingReplacementBlocked,
} from "./action-observed-geometry";

const current = { geometry_source: null, preparation_data: {} } as ActionRow;
const polyline: ActionDrawing = {
  kind: "polyline",
  coordinates: [[48.85, 2.35], [48.86, 2.36]],
};

describe("geometryRepresentativeCoordinates", () => {
  it("selects a length-based point on a polyline instead of averaging vertices", () => {
    expect(geometryRepresentativeCoordinates({
      kind: "polyline",
      coordinates: [[48.85, 2.35], [48.85, 2.36], [48.86, 2.36]],
    })).toEqual({ latitude: 48.85171, longitude: 2.36 });
  });

  it("returns an interior point for a concave polygon", () => {
    const result = geometryRepresentativeCoordinates({
      kind: "polygon",
      coordinates: [
        [48.85, 2.35], [48.85, 2.37], [48.86, 2.37],
        [48.86, 2.36], [48.855, 2.36], [48.855, 2.35],
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.latitude).toBeGreaterThanOrEqual(48.85);
    expect(result!.latitude).toBeLessThanOrEqual(48.86);
    expect(result!.longitude).toBeGreaterThanOrEqual(2.35);
    expect(result!.longitude).toBeLessThanOrEqual(2.37);
  });

  it("uses one observed MultiLineString trace without joining segments", () => {
    expect(geometryRepresentativeCoordinates({
      type: "MultiLineString",
      coordinates: [
        [[2.35, 48.85], [2.351, 48.85]],
        [[2.35, 48.85], [2.37, 48.85], [2.37, 48.86]],
      ],
      traceCount: 2,
      individualDistancesKm: [0.1, 2.2],
      coverageDistanceKm: null,
      coverageVersion: "observed-coverage-v1",
    })).toEqual({ latitude: 48.85, longitude: 2.367598 });
  });

  it("falls back deterministically for a degenerate drawing", () => {
    expect(geometryRepresentativeCoordinates({
      kind: "polyline",
      coordinates: [[48.85, 2.35], [48.85, 2.35]],
    })).toEqual({ latitude: 48.85, longitude: 2.35 });
  });

  it("handles open polygons and a zero-area polygon without inventing a centroid", () => {
    expect(geometryRepresentativeCoordinates({
      kind: "polygon",
      coordinates: [[48.85, 2.35], [48.86, 2.35]],
    })).toEqual({ latitude: 48.85, longitude: 2.35 });
    expect(geometryRepresentativeCoordinates({
      kind: "polygon",
      coordinates: [[48.85, 2.35], [48.85, 2.36], [48.85, 2.37]],
    })).toEqual({ latitude: 48.85, longitude: 2.35 });
  });

  it("keeps observed geometry immutable when checking a manual replacement", () => {
    const observed = { geometry_source: "gps_tracking", preparation_data: {} } as ActionRow;
    expect(hasPriorityObservedGeometry(observed)).toBe(true);
    expect(isManualDrawingReplacementBlocked(observed, "manual")).toBe(true);
    expect(getAcceptedActionDrawing({ current: observed, drawing: polyline, source: "manual" })).toBeNull();
    expect(getAcceptedActionDrawing({ current, drawing: polyline, source: "manual" })).toEqual(polyline);
    expect(getAcceptedActionDrawing({ current, drawing: polyline, source: "reference" })).toBeNull();
  });

  it("validates and persists observed GPX and manual geometry through the same owner", () => {
    const metadata = {
      source: "gpx_import" as const,
      observedDistanceKm: 1,
      pointCount: 2,
      inferredTopology: "point_to_point" as const,
    };
    expect(buildObservedActionGeometryUpdate({
      current,
      drawing: polyline,
      source: "gpx_import",
      gpxImport: metadata,
    })).toMatchObject({ geometry_source: "gpx_import", derived_geometry_kind: "polyline" });
    expect(buildManualActionGeometryUpdate({ current, drawing: polyline })).toMatchObject({
      geometry_source: "manual",
      derived_geometry_kind: "polyline",
    });
    expect(() => buildObservedActionGeometryUpdate({
      current,
      drawing: { kind: "polygon", coordinates: polyline.coordinates },
      source: "gps_tracking",
    })).toThrow("polyligne valide");
    expect(() => buildObservedActionGeometryUpdate({
      current,
      drawing: polyline,
      source: "gpx_import",
    })).toThrow("métadonnées");
  });
});
