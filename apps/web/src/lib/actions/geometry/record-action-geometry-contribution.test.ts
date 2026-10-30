import { describe, expect, it, vi } from "vitest";
import { recordActionGeometryContribution } from "./record-action-geometry-contribution";

function client(result: unknown) {
  return { rpc: vi.fn(async () => result) } as never;
}

const params = {
  actionId: "action-1",
  contributorClerkId: "user-1",
  source: "gps_tracking" as const,
  geojson: JSON.stringify({ type: "LineString", coordinates: [[2.3, 48.8], [2.31, 48.81]] }),
  observedDistanceKm: 1.2,
};

describe("action geometry contribution", () => {
  it("validates a LineString and maps an accepted RPC result", async () => {
    const supabase = client({ data: { accepted: true, contributionId: "c1", validationState: "accepted", traceCount: 2, reason: "ok" }, error: null });
    const result = await recordActionGeometryContribution({ ...params, supabase, missionId: "m1", observedAt: "2026-10-01T00:00:00Z", sourceFingerprint: "gpx:file-1:segment-0", technicalProvenance: { source: "device" } });

    expect(result).toEqual({ accepted: true, contributionId: "c1", validationState: "accepted", traceCount: 2, reason: "ok" });
    expect((supabase as { rpc: ReturnType<typeof vi.fn> }).rpc).toHaveBeenCalledWith("record_action_geometry_contribution", expect.objectContaining({ p_action_id: "action-1", p_mission_id: "m1", p_source_fingerprint: "gpx:file-1:segment-0" }));
  });

  it("preserves a refused decision and does not invent optional fields", async () => {
    const result = await recordActionGeometryContribution({ ...params, supabase: client({ data: { accepted: false, validationState: "refused", reason: "too short", traceCount: "2" }, error: null }) });
    expect(result).toEqual({ accepted: false, validationState: "refused", reason: "too short" });
  });

  it("fails closed for malformed geometry and RPC errors", async () => {
    await expect(recordActionGeometryContribution({ ...params, geojson: "not-json", supabase: client({ data: null, error: null }) })).rejects.toThrow("GeoJSON valide");
    await expect(recordActionGeometryContribution({ ...params, geojson: JSON.stringify({ type: "Polygon", coordinates: [] }), supabase: client({ data: null, error: null }) })).rejects.toThrow("LineString");
    await expect(recordActionGeometryContribution({ ...params, geojson: JSON.stringify({ type: "LineString", coordinates: [[181, 48], [2.31, 48.81]] }), supabase: client({ data: null, error: null }) })).rejects.toThrow("coordonnées valides");
    await expect(recordActionGeometryContribution({ ...params, supabase: client({ data: null, error: { message: "database unavailable" } }) })).rejects.toThrow("database unavailable");
  });
});
