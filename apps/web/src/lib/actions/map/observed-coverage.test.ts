import { describe, expect, it } from "vitest";
import {
  parseObservedCoverageGeometry,
  resolveObservedCoverageGeometry,
} from "./observed-coverage";

const validLines = [
  [[2.34, 48.85], [2.341, 48.851]],
  [[2.35, 48.86], [2.351, 48.861]],
] as const;

function coverage(overrides: Record<string, unknown> = {}) {
  return {
    type: "MultiLineString",
    coordinates: validLines,
    traceCount: 2,
    ...overrides,
  };
}

describe("observed coverage resolver", () => {
  it("keeps two valid lines, their collective count and two attributable sources", () => {
    expect(
      parseObservedCoverageGeometry(
        coverage({ sources: ["gpx_import", "gps_tracking"] }),
      ),
    ).toEqual({
      type: "MultiLineString",
      coordinates: validLines,
      traceCount: 2,
      sources: ["gpx_import", "gps_tracking"],
    });
  });

  it("rejects the whole coverage when one line is malformed", () => {
    expect(
      parseObservedCoverageGeometry({
        ...coverage({ traceCount: 1 }),
        coordinates: [validLines[0], [[2.35, 48.86], [2.351, 95]]],
        sources: ["gpx_import", "gps_tracking"],
      }),
    ).toBeNull();
  });

  it("rejects a coverage whose every line is invalid", () => {
    expect(
      parseObservedCoverageGeometry({
        ...coverage(),
        coordinates: [[[2.34, 95], [2.341, 95]]],
      }),
    ).toBeNull();
  });

  it("derives the effective count from retained lines instead of the declared count", () => {
    expect(
      parseObservedCoverageGeometry(coverage({ traceCount: 99 })),
    ).toMatchObject({ traceCount: 2 });
  });

  it("keeps one known source for a collective coverage", () => {
    expect(
      parseObservedCoverageGeometry(coverage({ sources: ["gpx_import"] })),
    ).toMatchObject({ sources: ["gpx_import"] });
  });

  it("keeps mixed known sources without inventing one effective source", () => {
    const resolved = parseObservedCoverageGeometry(
      coverage({ sources: ["gpx_import", "gps_tracking"] }),
    );

    expect(resolved?.sources).toEqual(["gpx_import", "gps_tracking"]);
  });

  it("drops absent or incoherent provenance while preserving valid geometry", () => {
    expect(parseObservedCoverageGeometry(coverage())?.sources).toBeUndefined();
    expect(
      parseObservedCoverageGeometry(
        coverage({
          coordinates: [
            ...validLines,
            [[2.36, 48.87], [2.361, 48.871]],
          ],
          sources: ["gpx_import", "gps_tracking", "gpx_import"],
        }),
      )?.sources,
    ).toBeUndefined();
    expect(
      parseObservedCoverageGeometry(
        coverage({ sources: ["gpx_import", "not-a-source"] }),
      )?.sources,
    ).toBeUndefined();
  });

  it("deduplicates repeated source values from a persisted source list", () => {
    expect(
      parseObservedCoverageGeometry(
        coverage({ sources: ["gpx_import", "gpx_import"] }),
      ),
    ).toMatchObject({ sources: ["gpx_import"] });
  });

  it("prefers valid preparation coverage over a primary GeoJSON fallback", () => {
    expect(
      resolveObservedCoverageGeometry({
        preparationData: { observedCoverage: coverage({ traceCount: 8 }) },
        primaryGeoJson: JSON.stringify({
          type: "MultiLineString",
          coordinates: [[[2.4, 48.9], [2.41, 48.91]]],
        }),
      }),
    ).toMatchObject({ traceCount: 2, coordinates: validLines });
  });
});
