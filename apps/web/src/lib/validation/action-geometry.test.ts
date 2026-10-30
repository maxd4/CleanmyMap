import { describe, expect, it } from "vitest";
import {
  contractGeometrySchema,
  gpxImportMetadataSchema,
  locationCoordinatesSchema,
  manualDrawingSchema,
} from "./action-geometry";
import { createActionSchema } from "./action";
import { polylineDistanceKm } from "@/lib/geo/geodesic-distance";

describe("action geometry validation", () => {
  it("requires the minimum number of points and keeps coordinate bounds closed", () => {
    const validPolyline = manualDrawingSchema.safeParse({
      kind: "polyline",
      coordinates: [[-90, -180], [90, 180]],
    });
    expect(validPolyline.success).toBe(true);

    const shortPolyline = manualDrawingSchema.safeParse({
      kind: "polyline",
      coordinates: [[48.85, 2.35]],
    });
    expect(shortPolyline.success).toBe(false);
    if (!shortPolyline.success) {
      expect(shortPolyline.error.issues[0]?.message).toContain("au moins 2 points");
    }

    const shortPolygon = manualDrawingSchema.safeParse({
      kind: "polygon",
      coordinates: [[48.85, 2.35], [48.86, 2.36]],
    });
    expect(shortPolygon.success).toBe(false);
    if (!shortPolygon.success) {
      expect(shortPolygon.error.issues[0]?.message).toContain("au moins 3 points");
    }

    expect(locationCoordinatesSchema.safeParse({ latitude: 90, longitude: 180 }).success).toBe(true);
    expect(locationCoordinatesSchema.safeParse({ latitude: 90.01, longitude: 0 }).success).toBe(false);
    expect(locationCoordinatesSchema.safeParse({ latitude: 0, longitude: Number.NaN }).success).toBe(false);
  });

  it("rejects forged geometry metadata and accepts only contract fields", () => {
    expect(contractGeometrySchema.safeParse({
      kind: "polyline",
      coordinates: [[48.85, 2.35], [48.86, 2.36]],
      geometrySource: null,
    }).success).toBe(true);
    expect(contractGeometrySchema.safeParse({
      kind: "polyline",
      coordinates: [[48.85, 2.35], [48.86, 2.36]],
      geometrySource: "javascript:alert(1)",
    }).success).toBe(false);
    const strippedUnknown = contractGeometrySchema.safeParse({
      kind: "polyline",
      coordinates: [[48.85, 2.35], [48.86, 2.36]],
      unexpected: true,
    });
    expect(strippedUnknown.success).toBe(true);
    if (strippedUnknown.success) {
      expect("unexpected" in strippedUnknown.data).toBe(false);
    }
  });

  it("rejects control characters and impossible GPX metadata", () => {
    const valid = {
      source: "gpx_import" as const,
      observedDistanceKm: 1.2,
      pointCount: 2,
      inferredTopology: "point_to_point" as const,
    };
    expect(gpxImportMetadataSchema.safeParse(valid).success).toBe(true);
    expect(gpxImportMetadataSchema.safeParse({ ...valid, fileName: "track\u0000.gpx" }).success).toBe(false);
    expect(gpxImportMetadataSchema.safeParse({ ...valid, pointCount: 1 }).success).toBe(false);
    expect(gpxImportMetadataSchema.safeParse({ ...valid, observedDistanceKm: 1_001 }).success).toBe(false);
    expect(gpxImportMetadataSchema.safeParse({
      ...valid,
      observedDistanceKm: 2,
      pointCount: 4,
      intent: "observed",
      files: [{
        fileName: "terrain.gpx",
        provenance: "unknown",
        segments: [
          {
            fileName: "terrain.gpx",
            traceIndex: 0,
            segmentIndex: 0,
            coordinates: [[48.85, 2.35], [48.86, 2.36]],
            distanceKm: 1,
            pointCount: 2,
            topology: "point_to_point",
            sourceFingerprint: "gpx-a",
          },
          {
            fileName: "terrain.gpx",
            traceIndex: 0,
            segmentIndex: 1,
            coordinates: [[48.87, 2.37], [48.88, 2.38]],
            distanceKm: 1,
            pointCount: 2,
            topology: "point_to_point",
            sourceFingerprint: "gpx-b",
          },
        ],
      }],
    }).success).toBe(true);
  });

  it("does not allow planned provenance to enter the observed intent", () => {
    const valid = {
      source: "gpx_import" as const,
      observedDistanceKm: 1,
      pointCount: 2,
      inferredTopology: "point_to_point" as const,
      intent: "observed" as const,
    };
    expect(gpxImportMetadataSchema.safeParse({ ...valid, provenance: "planned" }).success).toBe(false);
    expect(gpxImportMetadataSchema.safeParse({
      ...valid,
      files: [{ fileName: "plan.gpx", provenance: "planned", segments: [] }],
    }).success).toBe(false);
    expect(gpxImportMetadataSchema.safeParse({
      source: "gpx_import" as const,
      observedDistanceKm: 1,
      pointCount: 2,
      inferredTopology: "point_to_point" as const,
      files: [{ fileName: "terrain.gpx", provenance: "unknown", segments: [] }],
    }).success).toBe(false);
  });

  it("refuses incomplete GPX provenance at the action boundary", () => {
    const base = {
      actorName: "Bénévole test",
      associationName: "Action spontanée",
      actionDate: "2026-04-22",
      locationLabel: "Canal Saint-Martin",
      wasteKg: 1.5,
      cigaretteButts: 0,
      volunteersCount: 2,
      durationMinutes: 45,
    };

    const missingDrawing = createActionSchema.safeParse({
      ...base,
      geometrySource: "gpx_import",
      preparationData: {
        gpxImport: {
          source: "gpx_import",
          observedDistanceKm: 1,
          pointCount: 2,
          inferredTopology: "point_to_point",
        },
      },
    });
    expect(missingDrawing.success).toBe(false);
    if (!missingDrawing.success) {
      expect(missingDrawing.error.issues.some((issue) => issue.path.includes("manualDrawing"))).toBe(true);
    }

    const missingMetadata = createActionSchema.safeParse({
      ...base,
      geometrySource: "gpx_import",
      manualDrawing: {
        kind: "polyline",
        coordinates: [[48.85, 2.35], [48.86, 2.36]],
      },
    });
    expect(missingMetadata.success).toBe(false);
    if (!missingMetadata.success) {
      expect(missingMetadata.error.issues.some((issue) => issue.path.includes("gpxImport"))).toBe(true);
    }

    const mismatchedSource = createActionSchema.safeParse({
      ...base,
      geometrySource: "manual",
      manualDrawing: {
        kind: "polyline",
        coordinates: [[48.85, 2.35], [48.86, 2.36]],
      },
      preparationData: {
        gpxImport: {
          source: "gpx_import",
          observedDistanceKm: 1,
          pointCount: 2,
          inferredTopology: "point_to_point",
        },
      },
    });
    expect(mismatchedSource.success).toBe(false);
    if (!mismatchedSource.success) {
      expect(mismatchedSource.error.issues.some((issue) => issue.path.includes("geometrySource"))).toBe(true);
    }
  });

  it("validates the representative segment without joining the other segments", () => {
    const coordinates: [number, number][] = [[48.85, 2.35], [48.86, 2.36]];
    const result = createActionSchema.safeParse({
      actorName: "Bénévole test",
      associationName: "Action spontanée",
      actionDate: "2026-04-22",
      locationLabel: "Canal Saint-Martin",
      arrivalLocationLabel: "Pont suivant",
      routeTopology: "point_to_point",
      geometrySource: "gpx_import",
      manualDrawing: { kind: "polyline", coordinates },
      preparationData: {
        gpxImport: {
          source: "gpx_import",
          intent: "observed",
          observedDistanceKm: 2,
          pointCount: 4,
          inferredTopology: "point_to_point",
          files: [{
            fileName: "terrain.gpx",
            provenance: "unknown",
            segments: [
              { fileName: "terrain.gpx", traceIndex: 0, segmentIndex: 0, coordinates, distanceKm: polylineDistanceKm(coordinates), pointCount: 2, topology: "point_to_point", sourceFingerprint: "gpx-a" },
              { fileName: "terrain.gpx", traceIndex: 0, segmentIndex: 1, coordinates: [[48.87, 2.37], [48.88, 2.38]], distanceKm: 1, pointCount: 2, topology: "point_to_point", sourceFingerprint: "gpx-b" },
            ],
          }],
        },
      },
    });
    expect(result.success).toBe(true);
  });
});
