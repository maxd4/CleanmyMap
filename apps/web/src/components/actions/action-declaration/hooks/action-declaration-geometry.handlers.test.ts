import { describe, expect, it, vi } from "vitest";
import { parseGpxFiles } from "@/lib/actions/geometry/gpx";
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

  it("removes only the selected occurrence when two files share a source fingerprint", () => {
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
            { fileId: "file-a", fileName: "terrain.gpx", provenance: "unknown", segments: [segment("file-a", "same-gpx", 48.85)] },
            { fileId: "file-b", fileName: "terrain.gpx", provenance: "unknown", segments: [segment("file-b", "same-gpx", 48.86)] },
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

    handlers.removeGpxImport({ kind: "segment", fileId: "file-a", fileIndex: 0, sourceFingerprint: "same-gpx" });

    const [updates] = updateForm.mock.calls[0] as [{ gpxImport: { files: Array<{ fileId?: string; segments: unknown[] }> } }];
    expect(updates.gpxImport.files).toHaveLength(1);
    expect(updates.gpxImport.files[0]?.fileId).toBe("file-b");
  });

  it("keeps legacy candidates without fileId individually removable by their list position", () => {
    const updateForm = vi.fn();
    const handlers = createActionDeclarationGeometryHandlers({
      form: {
        routeTopology: "point_to_point",
        gpxImport: {
          source: "gpx_import",
          observedDistanceKm: 2,
          pointCount: 4,
          inferredTopology: "point_to_point",
          files: [
            { fileName: "terrain.gpx", provenance: "unknown", segments: [segment("legacy-a", "legacy-a", 48.85)] },
            { fileName: "terrain.gpx", provenance: "unknown", segments: [segment("legacy-b", "legacy-b", 48.86)] },
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

    handlers.removeGpxImport({ kind: "file", fileIndex: 1 });

    const [updates] = updateForm.mock.calls[0] as [{ gpxImport: { files: Array<{ fileName: string; segments: unknown[] }> } }];
    expect(updates.gpxImport.files).toHaveLength(1);
    expect(updates.gpxImport.files[0]?.fileName).toBe("terrain.gpx");
    expect(updates.gpxImport.files[0]?.segments).toHaveLength(1);
  });

  it("reassigns a fresh file identity when a candidate is imported into an existing draft", async () => {
    const xml = "<?xml version=\"1.0\"?><gpx><trk><trkseg><trkpt lat=\"48.85\" lon=\"2.35\"/><trkpt lat=\"48.851\" lon=\"2.351\"/></trkseg></trk></gpx>";
    const makeFile = () => ({ name: "terrain.gpx", type: "application/gpx+xml", size: 100, text: async () => xml }) as unknown as File;
    const first = await parseGpxFiles([makeFile()]);
    if (!first[0]?.ok) throw new Error("Le GPX de test doit être valide.");
    const firstFile = first[0].parsed.metadata.files?.[0];
    if (!firstFile) throw new Error("Le candidat GPX de test est absent.");
    const updateForm = vi.fn();
    vi.stubGlobal("window", { confirm: () => true });
    const handlers = createActionDeclarationGeometryHandlers({
      form: { routeTopology: "point_to_point", gpxImport: { source: "gpx_import", observedDistanceKm: 1, pointCount: 2, inferredTopology: "point_to_point", files: [firstFile] } },
      manualDrawing: null,
      manualDrawingSource: "gpx_import",
      setManualDrawingState: vi.fn(),
      setManualDrawingSource: vi.fn(),
      setGpxError: vi.fn(),
      updateForm,
    } as never);

    await handlers.handleGpxImport([makeFile()]);

    const [updates] = updateForm.mock.calls[0] as [{ gpxImport: { files: Array<{ fileId?: string; segments: Array<{ sourceFingerprint: string }> }> } }];
    expect(updates.gpxImport.files).toHaveLength(2);
    expect(updates.gpxImport.files[0]?.fileId).toBe(firstFile.fileId);
    expect(updates.gpxImport.files[1]?.fileId).not.toBe(firstFile.fileId);
    expect(updates.gpxImport.files[1]?.segments[0]?.sourceFingerprint).toBe(firstFile.segments[0]?.sourceFingerprint);
  });
});
