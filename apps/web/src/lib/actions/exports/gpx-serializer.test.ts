import { describe, expect, it, vi } from "vitest";
import {
  serializeActionGeometryToGpx,
  type GpxSerializerInput,
} from "./gpx-serializer";

const closedGeometry = {
  kind: "polyline" as const,
  coordinates: [
    [48.85, 2.35],
    [48.851234567, 2.351234567],
    [48.85, 2.35],
  ] as [number, number][],
};

const openGeometry = {
  kind: "polyline" as const,
  coordinates: [
    [48.85, 2.35],
    [48.87, 2.37],
  ] as [number, number][],
};

function assertWellFormedXml(xml: string): void {
  const stack: string[] = [];
  const tagPattern = /<([^>]+)>/g;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(xml)) !== null) {
    const content = match[1]?.trim() ?? "";
    if (content.startsWith("?") || content.startsWith("!")) continue;
    if (content.endsWith("/")) continue;
    if (content.startsWith("/")) {
      expect(stack.pop()).toBe(content.slice(1).trim());
      continue;
    }
    stack.push(content.split(/\s+/, 1)[0] ?? "");
  }
  expect(stack).toEqual([]);
}

function simpleInput(
  geometry: typeof closedGeometry,
  source: "manual" | "gpx_import" | "estimated_route",
  topology: "loop" | "point_to_point",
): GpxSerializerInput {
  return {
    name: "Itinéraire & <CleanMyMap>",
    tracks: [
      {
        geometry,
        geometrySource: source,
        routeTopology: topology,
        waypoints: [
          {
            coordinates: geometry.coordinates[0]!,
            name: "Départ & accueil",
            role: "departure",
          },
          {
            coordinates: geometry.coordinates[1]!,
            name: "Mi-parcours",
            role: "midpoint",
          },
          {
            coordinates: geometry.coordinates.at(-1)!,
            name: "Arrivée",
            role: "arrival",
          },
        ],
      },
    ],
  };
}

describe("serializeActionGeometryToGpx", () => {
  it("produces well-formed GPX 1.1 with namespace, exact order and escaped labels", () => {
    const xml = serializeActionGeometryToGpx(
      simpleInput(closedGeometry, "manual", "loop"),
    );

    assertWellFormedXml(xml);
    expect(xml).toContain('version="1.1"');
    expect(xml).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
    expect(xml).toContain("Itinéraire &amp; &lt;CleanMyMap&gt;");
    expect(xml).toContain("Départ &amp; accueil");
    expect(xml).toContain('lat="48.85" lon="2.35"');
    expect(xml).toContain('lat="48.851234567" lon="2.351234567"');
    expect(xml.indexOf('lat="48.85" lon="2.35"></trkpt>')).toBeLessThan(
      xml.indexOf('lat="48.851234567" lon="2.351234567"></trkpt>'),
    );
  });

  it("keeps a loop closed and a point-to-point track open without artificial edits", () => {
    const loopXml = serializeActionGeometryToGpx(
      simpleInput(closedGeometry, "gpx_import", "loop"),
    );
    const openXml = serializeActionGeometryToGpx({
      ...simpleInput(openGeometry, "manual", "point_to_point"),
      name: "Parcours ouvert",
    });

    const loopPoints = loopXml.match(/<trkpt\b/g) ?? [];
    const openPoints = openXml.match(/<trkpt\b/g) ?? [];
    expect(loopPoints).toHaveLength(3);
    expect(openPoints).toHaveLength(2);
    expect(loopXml).toContain("Tracé GPX importé");
    expect(loopXml.match(/<wpt\b/g)).toHaveLength(2);
    expect(openXml.match(/<trkpt\b[^>]*lat="48.85" lon="2.35"/g)).toHaveLength(1);
    expect(openXml.match(/<trkpt\b[^>]*lat="48.87" lon="2.37"/g)).toHaveLength(1);
  });

  it("marks estimated geometry explicitly and never exports target-distance metadata", () => {
    const xml = serializeActionGeometryToGpx(
      simpleInput(openGeometry, "estimated_route", "point_to_point"),
    );

    expect(xml).toContain("Tracé estimé CleanMyMap");
    expect(xml).not.toMatch(/routeTargetDistance|km\/h|duration/i);
  });

  it("preserves waypoints without changing tracks and keeps multiple routes separate", () => {
    const xml = serializeActionGeometryToGpx({
      waypoints: [
        { coordinates: [48.85, 2.35], name: "Départ", role: "departure" },
      ],
      tracks: [
        {
          geometry: closedGeometry,
          geometrySource: "manual",
          routeTopology: "loop",
        },
        {
          geometry: openGeometry,
          geometrySource: "manual",
          routeTopology: "point_to_point",
        },
      ],
    });

    expect(xml.match(/<trk>/g)).toHaveLength(2);
    expect(xml.match(/<trkseg>/g)).toHaveLength(2);
    expect(xml.match(/<wpt\b/g)).toHaveLength(1);
    expect(xml).toContain('lat="48.87" lon="2.37"></trkpt>');
    expect(xml).not.toContain('lat="48.87" lon="2.37"></trkpt>\n        <trkpt lat="48.85"');
  });

  it("is deterministic, network-free and does not export personal fields", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const input = simpleInput(closedGeometry, "gpx_import", "loop");
    const first = serializeActionGeometryToGpx(input);
    const second = serializeActionGeometryToGpx(input);

    expect(first).toBe(second);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(first).not.toMatch(/email|clerk|user[_-]?id|participant|token/i);
    fetchSpy.mockRestore();
  });

  it("rejects personal data and invalid XML text instead of exporting it", () => {
    expect(() =>
      serializeActionGeometryToGpx({
        name: "Action email test@example.com",
        tracks: [
          {
            geometry: openGeometry,
            geometrySource: "manual",
          },
        ],
      }),
    ).toThrow(/donnée personnelle/i);

    expect(() =>
      serializeActionGeometryToGpx({
        tracks: [
          {
            geometry: openGeometry,
            geometrySource: "manual",
            waypoints: [
              {
                coordinates: openGeometry.coordinates[0]!,
                name: "Départ\u0001",
                role: "departure",
              },
            ],
          },
        ],
      }),
    ).toThrow(/caractère XML interdit/i);
  });
});
