import { describe, expect, it, vi } from "vitest";
import { createActionDeclarationGeometryHandlers } from "./action-declaration-geometry.handlers";

function segment(fileId: string, sourceFingerprint: string, latitude: number) {
  return {
    fileId,
    fileName: "terrain.gpx",
    traceIndex: 0,
    segmentIndex: 0,
    coordinates: [[latitude, 2.35], [latitude + 0.001, 2.351]] as [number, number][],
    distanceKm: 1,
    pointCount: 2,
    topology: "point_to_point" as const,
    sourceFingerprint,
  };
}

describe("action declaration GPX candidate identity", () => {
  it("removes one homonymous file without merging or deleting the other", () => {
    const updateForm = vi.fn();
    const handlers = createActionDeclarationGeometryHandlers({
      form: {
        routeTopology: "point_to_point",
        gpxImport: {
          source: "gpx_import",
          observedDistanceKm: 2,
          pointCount: 4,
          inferredTopology: "point_to_point",
          intent: "observed",
          files: [
            { fileId: "file-a", fileName: "terrain.gpx", provenance: "unknown", segments: [segment("file-a", "gpx-a", 48.85)] },
            { fileId: "file-b", fileName: "terrain.gpx", provenance: "unknown", segments: [segment("file-b", "gpx-b", 48.86)] },
          ],
        },
      },
      manualDrawing: null,
      manualDrawingSource: null,
      setManualDrawingState: vi.fn(),
      setManualDrawingSource: vi.fn(),
      setGpxError: vi.fn(),
      updateForm,
    } as never);

    handlers.removeGpxImport("file-a");

    const [updates] = updateForm.mock.calls[0] as [{ gpxImport: { files: Array<{ fileId?: string; traceCount?: number }> } }];
    expect(updates.gpxImport.files).toHaveLength(1);
    expect(updates.gpxImport.files[0]?.fileId).toBe("file-b");
  });
});
