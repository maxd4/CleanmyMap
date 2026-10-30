import { describe, expect, it, vi } from "vitest";
const eligibleMock = vi.hoisted(() => vi.fn());
const reconcileMock = vi.hoisted(() => vi.fn());
vi.mock("./action-geometry-contributor-eligibility", () => ({ isActionGeometryContributorEligible: eligibleMock }));
vi.mock("@/lib/gamification/gamification-reconciliation", () => ({ reconcileUserGamification: reconcileMock }));
import {
  hasGpxGeometryContribution,
  recordGpxGeometryContributionIfPresent,
  stripObservedGeometryProjectionFields,
} from "./action-geometry-contribution-workflow";

describe("observed geometry contribution workflow", () => {
  it("checks canonical eligibility only for an observed GPX payload", async () => {
    const updateData = {
      geometry_source: "gpx_import",
      derived_geometry_geojson: JSON.stringify({ type: "LineString", coordinates: [[2.3, 48.8], [2.31, 48.81]] }),
      preparation_data: { gpxImport: { source: "gpx_import", intent: "observed" } },
    };
    const supabase = {} as never;
    expect(await (await import("./action-geometry-contribution-workflow")).ensureGpxGeometryContributionEligible({ supabase, actionId: "a", userId: "u", updateData: { geometry_source: "manual" } })).toBeNull();
    eligibleMock.mockResolvedValueOnce(true);
    expect(await (await import("./action-geometry-contribution-workflow")).ensureGpxGeometryContributionEligible({ supabase, actionId: "a", userId: "u", updateData })).toBeNull();
    eligibleMock.mockResolvedValueOnce(false);
    const response = await (await import("./action-geometry-contribution-workflow")).ensureGpxGeometryContributionEligible({ supabase, actionId: "a", userId: "u", updateData });
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(403);
  });

  it("separates the contribution payload from scalar and legitimate preparation updates", () => {
    const updateData = {
      waste_kg: 4,
      derived_geometry_kind: "polyline",
      derived_geometry_geojson: "{\"type\":\"LineString\"}",
      geometry_source: "gpx_import",
      geometry_confidence: 1,
      preparation_data: {
        actionTitle: "Conserver ce champ",
        routeObservedDistanceKm: 2.4,
        gpxImport: { source: "gpx_import" },
        observedCoverage: { type: "MultiLineString" },
      },
    };

    expect(stripObservedGeometryProjectionFields(updateData)).toEqual({
      waste_kg: 4,
      preparation_data: { actionTitle: "Conserver ce champ" },
    });
    expect(updateData.derived_geometry_geojson).toBe("{\"type\":\"LineString\"}");
  });

  it.each([
    ["gpx geometry", { geometry_source: "gpx_import", derived_geometry_geojson: "{}", preparation_data: {} }, false],
    ["manual geometry", { geometry_source: "manual", derived_geometry_geojson: "{}" }, false],
    ["missing geometry", { geometry_source: "gpx_import" }, false],
    ["non-string geometry", { geometry_source: "gpx_import", derived_geometry_geojson: null }, false],
    ["empty source", { geometry_source: "", derived_geometry_geojson: "{}" }, false],
  ] as const)("detects %s as a contribution only when the server projection is complete", (_label, value, expected) => {
    expect(hasGpxGeometryContribution(value)).toBe(expected);
  });

  it("is idempotent and keeps unrelated nested data when stripping projections", () => {
    const original = {
      notes: "keep",
      preparation_data: { actionTitle: "keep", observedCoverage: {}, routeObservedDistanceKm: 1.2 },
      geometry_source: "gpx_import",
    };
    const stripped = stripObservedGeometryProjectionFields(original);

    expect(stripObservedGeometryProjectionFields(stripped)).toEqual(stripped);
    expect(stripped).toEqual({ notes: "keep", preparation_data: { actionTitle: "keep" } });
    expect(original.preparation_data).toEqual({ actionTitle: "keep", observedCoverage: {}, routeObservedDistanceKm: 1.2 });
  });

  it("does not treat arrays or null preparation data as writable projection objects", () => {
    expect(stripObservedGeometryProjectionFields({ preparation_data: ["raw"] })).toEqual({ preparation_data: ["raw"] });
    expect(stripObservedGeometryProjectionFields({ preparation_data: null })).toEqual({ preparation_data: null });
  });

  it("keeps planned candidates out of the observed contribution workflow", async () => {
    const rpc = vi.fn();
    const result = await recordGpxGeometryContributionIfPresent({
      supabase: { rpc } as never,
      actionId: "action-1",
      userId: "user-1",
      updateData: {
        geometry_source: "gpx_import",
        derived_geometry_geojson: JSON.stringify({ type: "LineString", coordinates: [[2.3, 48.8], [2.31, 48.81]] }),
        preparation_data: {
          gpxImport: {
            source: "gpx_import",
            intent: "planned",
            observedDistanceKm: 1,
            pointCount: 2,
            inferredTopology: "point_to_point",
          },
        },
      },
    });

    expect(result).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("records independent stored segments, preserves fingerprints and continues after a refusal", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { accepted: true, contributionId: "c1", validationState: "accepted", traceCount: 1 }, error: null })
      .mockResolvedValueOnce({ data: { accepted: false, validationState: "refused", reason: "too short" }, error: null })
      .mockResolvedValueOnce({ data: { accepted: true, contributionId: "c3", validationState: "accepted", traceCount: 2 }, error: null });
    const result = await recordGpxGeometryContributionIfPresent({
      supabase: { rpc } as never,
      actionId: "action-1",
      userId: "user-1",
      updateData: {
        geometry_source: "gpx_import",
        derived_geometry_geojson: JSON.stringify({ type: "LineString", coordinates: [[2.3, 48.8], [2.31, 48.81]] }),
        preparation_data: {
          gpxImport: {
            source: "gpx_import",
            intent: "observed",
            observedDistanceKm: 2,
            pointCount: 6,
            inferredTopology: "point_to_point",
            files: [{
              fileName: "terrain.gpx",
              provenance: "unknown",
              segments: [
                { fileName: "terrain.gpx", traceIndex: 0, segmentIndex: 0, coordinates: [[48.8, 2.3], [48.81, 2.31]], distanceKm: 1, pointCount: 2, topology: "point_to_point", sourceFingerprint: "gpx-a" },
                { fileName: "terrain.gpx", traceIndex: 0, segmentIndex: 1, coordinates: [[48.82, 2.32], [48.83, 2.33]], distanceKm: 1, pointCount: 2, topology: "point_to_point", sourceFingerprint: "gpx-b" },
                { fileName: "terrain.gpx", traceIndex: 1, segmentIndex: 0, coordinates: [[48.84, 2.34], [48.85, 2.35]], distanceKm: 1, pointCount: 2, topology: "point_to_point", sourceFingerprint: "gpx-c" },
              ],
            }],
          },
        },
      },
    });

    expect(result).toMatchObject({ accepted: false, persisted: true, traceCount: 2 });
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc.mock.calls.map((call) => call[1].p_source_fingerprint)).toEqual(["gpx-a", "gpx-b", "gpx-c"]);
  });

  it("uses the legacy derived LineString when no stored segment list exists", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { accepted: true, contributionId: "legacy", validationState: "accepted", traceCount: 1 }, error: null });
    const result = await recordGpxGeometryContributionIfPresent({
      supabase: { rpc } as never,
      actionId: "action-legacy",
      userId: "user-legacy",
      updateData: {
        geometry_source: "gpx_import",
        derived_geometry_geojson: JSON.stringify({ type: "MultiLineString", coordinates: [[[2.3, 48.8], [2.31, 48.81]], [[2.32, 48.82], [2.33, 48.83]]] }),
        preparation_data: { gpxImport: { source: "gpx_import", fileName: "legacy.gpx", segmentDistancesKm: [1, 1] } },
      },
    });
    expect(result).toMatchObject({ accepted: true, persisted: true });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("does not call persistence for malformed or non-line projections", async () => {
    const rpc = vi.fn();
    expect(await recordGpxGeometryContributionIfPresent({ supabase: { rpc } as never, actionId: "a", userId: "u", updateData: { geometry_source: "gpx_import", derived_geometry_geojson: "{}", preparation_data: {} } })).toBeNull();
    expect(await recordGpxGeometryContributionIfPresent({ supabase: { rpc } as never, actionId: "a", userId: "u", updateData: { geometry_source: "gpx_import", derived_geometry_geojson: JSON.stringify({ type: "LineString", coordinates: [[2.3, 48.8]] }), preparation_data: {} } })).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reconciles progression only after an accepted contribution", async () => {
    const { reconcileGeometryContributionProgressionIfNeeded } = await import("./action-geometry-contribution-workflow");
    await reconcileGeometryContributionProgressionIfNeeded({ accepted: false, supabase: {} as never, actionId: "a", userId: "u" });
    expect(reconcileMock).not.toHaveBeenCalled();
    reconcileMock.mockResolvedValueOnce(undefined);
    await reconcileGeometryContributionProgressionIfNeeded({ accepted: true, supabase: {} as never, actionId: "a", userId: "u" });
    expect(reconcileMock).toHaveBeenCalledWith(expect.anything(), "u", { reasonCategory: "other" });
  });
});
