import { describe, expect, it } from "vitest";
import { parseDrawingFromNotes, toGeoJsonString } from "./drawing";

describe("drawing notes parser", () => {
  it("extracts clean notes and drawing payload", () => {
    const notes =
      'Commentaire terrain\n[DRAWING_GEOJSON]{"kind":"polyline","coordinates":[[48.85,2.35],[48.851,2.351]]}\n[google-sheet-sync]';
    const parsed = parseDrawingFromNotes(notes);

    expect(parsed.cleanNotes).toBe("Commentaire terrain");
    expect(parsed.manualDrawing?.kind).toBe("polyline");
    expect(parsed.manualDrawing?.coordinates.length).toBe(2);
    expect(parsed.drawingJson).toContain('"kind":"polyline"');
  });

  it("returns null drawing for invalid payload", () => {
    const parsed = parseDrawingFromNotes('[DRAWING_GEOJSON]{"foo":"bar"}');
    expect(parsed.manualDrawing).toBeNull();
    expect(parsed.cleanNotes).toBeNull();
  });

  it("ignores the sync marker when it trails the drawing payload", () => {
    const parsed = parseDrawingFromNotes(
      'Note utile\n[DRAWING_GEOJSON]{"kind":"polyline","coordinates":[[48.85,2.35],[48.851,2.351]]}\n[google-sheet-sync]',
    );

    expect(parsed.cleanNotes).toBe("Note utile");
    expect(parsed.manualDrawing?.kind).toBe("polyline");
  });

  it("builds geojson from polygon", () => {
    const geoJson = toGeoJsonString({
      kind: "polygon",
      coordinates: [
        [48.85, 2.35],
        [48.851, 2.351],
        [48.852, 2.352],
      ],
    });
    expect(geoJson).toContain('"type":"Polygon"');
  });
});
