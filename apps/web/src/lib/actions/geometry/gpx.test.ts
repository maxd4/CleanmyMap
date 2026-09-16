import { describe, expect, it } from "vitest";
import {
  GpxImportError,
  MAX_GPX_FILE_BYTES,
  inferGpxTopology,
  parseGpxFile,
  parseGpxText,
} from "./gpx";

function gpx(points: string, extra = ""): string {
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="CleanMyMap"><trk><name>Test</name><trkseg>${points}</trkseg></trk>${extra}</gpx>`;
}

function point(latitude: number, longitude: number): string {
  return `<trkpt lat="${latitude}" lon="${longitude}"><ele>10</ele></trkpt>`;
}

describe("GPX track parsing", () => {
  it("produces a canonical polyline and ignores isolated waypoints", () => {
    const result = parseGpxText(
      gpx(`${point(48.85, 2.35)}${point(48.851, 2.351)}`, `<wpt lat="0" lon="0"/>`),
      { fileName: "trace.gpx" },
    );

    expect(result.drawing).toEqual({
      kind: "polyline",
      coordinates: [
        [48.85, 2.35],
        [48.851, 2.351],
      ],
    });
    expect(result.metadata).toMatchObject({
      source: "gpx_import",
      fileName: "trace.gpx",
      pointCount: 2,
    });
    expect(result.metadata.observedDistanceKm).toBeGreaterThan(0);
  });

  it("detects a loop without rewriting its final point", () => {
    const result = parseGpxText(
      gpx(`${point(48.85, 2.35)}${point(48.851, 2.351)}${point(48.8502, 2.3501)}`),
    );

    expect(inferGpxTopology(result.drawing.coordinates)).toBe("loop");
    expect(result.metadata.inferredTopology).toBe("loop");
    expect(result.drawing.coordinates.at(-1)).toEqual([48.8502, 2.3501]);
  });

  it("keeps a departure-to-arrival trace open", () => {
    const result = parseGpxText(
      gpx(`${point(48.85, 2.35)}${point(48.87, 2.37)}`),
    );

    expect(result.metadata.inferredTopology).toBe("point_to_point");
    expect(result.drawing.coordinates[0]).toEqual([48.85, 2.35]);
    expect(result.drawing.coordinates.at(-1)).toEqual([48.87, 2.37]);
  });

  it("rejects malformed XML, external declarations and underspecified tracks", () => {
    expect(() => parseGpxText("<gpx><trk><trkseg></gpx>")).toThrow(GpxImportError);
    expect(() => parseGpxText("<!DOCTYPE gpx SYSTEM 'evil'><gpx />")).toThrow(
      /déclarations XML externes/i,
    );
    expect(() => parseGpxText(gpx(point(48.85, 2.35)))).toThrow(/au moins 2 points/i);
  });

  it("rejects invalid coordinates and multiple segments instead of inventing a link", () => {
    expect(() => parseGpxText(gpx(`${point(95, 2.35)}${point(48.851, 2.351)}`))).toThrow(
      /latitude ou une longitude invalide/i,
    );
    expect(() =>
      parseGpxText(
        `<?xml version="1.0"?><gpx><trk><trkseg>${point(48.85, 2.35)}${point(48.851, 2.351)}</trkseg><trkseg>${point(48.86, 2.36)}${point(48.861, 2.361)}</trkseg></trk></gpx>`,
      ),
    ).toThrow(/plusieurs segments/i);
  });

  it("bounds the point count and file size", async () => {
    const tooManyPoints = Array.from({ length: 401 }, (_, index) =>
      point(40 + index / 10_000, 2 + index / 10_000),
    ).join("");
    expect(() => parseGpxText(gpx(tooManyPoints))).toThrow(/400 points/i);

    expect(MAX_GPX_FILE_BYTES).toBe(5_000_000);
    const oversizedFile = {
      name: "trop-grand.gpx",
      type: "application/gpx+xml",
      size: MAX_GPX_FILE_BYTES + 1,
      text: async () => gpx(`${point(48.85, 2.35)}${point(48.851, 2.351)}`),
    } as unknown as File;
    await expect(parseGpxFile(oversizedFile)).rejects.toThrow(/5 Mo/i);

    const htmlFile = {
      name: "masque.gpx",
      type: "text/html",
      size: 100,
      text: async () => gpx(`${point(48.85, 2.35)}${point(48.851, 2.351)}`),
    } as unknown as File;
    await expect(parseGpxFile(htmlFile)).rejects.toThrow(/type MIME/i);
  });
});
