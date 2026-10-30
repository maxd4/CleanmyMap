import { describe, expect, it } from "vitest";
import {
  GpxImportError,
  MAX_GPX_FILE_BYTES,
  inferGpxTopology,
  parseGpxFile,
  parseGpxFiles,
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

  it("rejects a long unterminated attribute without regex backtracking", () => {
    const malformed = `<gpx><trk><trkseg><trkpt lat="${"9".repeat(200_000)}>`;
    expect(() => parseGpxText(malformed)).toThrow(GpxImportError);
  });

  it("rejects invalid coordinates and preserves multiple segments without inventing a link", async () => {
    expect(() => parseGpxText(gpx(`${point(95, 2.35)}${point(48.851, 2.351)}`))).toThrow(
      /latitude ou une longitude invalide/i,
    );
    const result = parseGpxText(
      `<?xml version="1.0"?><gpx><trk><trkseg>${point(48.85, 2.35)}${point(48.851, 2.351)}</trkseg><trkseg>${point(48.86, 2.36)}${point(48.861, 2.361)}</trkseg></trk></gpx>`,
    );
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual([[48.85, 2.35], [48.851, 2.351]]);
    expect(result.segments[1]).toEqual([[48.86, 2.36], [48.861, 2.361]]);
    expect(result.drawing.coordinates).toEqual(result.segments[0]);
    expect(result.metadata).toMatchObject({
      segmentCount: 2,
      traceCount: 1,
      pointCount: 4,
      segmentPointCounts: [2, 2],
    });
    expect(result.drawing.coordinates).not.toContain([48.86, 2.36]);

    const files = await parseGpxFiles([
      { name: "valide.gpx", type: "application/gpx+xml", size: 100, text: async () => gpx(`${point(48.85, 2.35)}${point(48.851, 2.351)}`) },
      { name: "invalide.gpx", type: "application/gpx+xml", size: 100, text: async () => "<gpx>" },
    ] as unknown as File[]);
    expect(files[0]).toMatchObject({ ok: true, fileName: "valide.gpx" });
    expect(files[1]).toMatchObject({ ok: false, fileName: "invalide.gpx" });
  });

  it("rejects consecutive duplicates and recognizes only the explicit planner marker", () => {
    expect(() => parseGpxText(gpx(`${point(48.85, 2.35)}${point(48.85, 2.35)}`))).toThrow(/identiques/i);

    const planned = parseGpxText(
      `<?xml version="1.0"?><gpx creator="CleanMyMap"><metadata><cmm:provenance version="1" intent="planned" /></metadata><trk><trkseg>${point(48.85, 2.35)}${point(48.851, 2.351)}</trkseg></trk></gpx>`,
    );
    expect(planned.provenance).toBe("planned");
    expect(planned.metadata.provenance).toBe("planned");
    expect(parseGpxText(gpx(`${point(48.85, 2.35)}${point(48.851, 2.351)}`)).provenance).toBe("unknown");
  });

  it("keeps separate GPX traces separate even when they share a departure", () => {
    const result = parseGpxText(
      `<?xml version="1.0"?><gpx><trk><trkseg>${point(48.85, 2.35)}${point(48.851, 2.351)}</trkseg></trk><trk><trkseg>${point(48.85, 2.35)}${point(48.86, 2.36)}</trkseg></trk></gpx>`,
    );
    expect(result.tracks).toHaveLength(2);
    expect(result.segments).toHaveLength(2);
    expect(result.metadata.traceCount).toBe(2);
    expect(result.metadata.segmentDistancesKm).toHaveLength(2);
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
