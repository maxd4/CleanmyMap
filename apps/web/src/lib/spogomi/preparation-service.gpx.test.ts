import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions/geometry/gpx", () => ({
  parseGpxFile: vi.fn(async () => ({
    drawing: {
      kind: "polyline",
      coordinates: [[2.31, 48.79], [2.32, 48.8]],
    },
    metadata: {
      fileName: "synthetic-official.gpx",
      pointCount: 2,
      observedDistanceKm: 1.25,
      inferredTopology: "point_to_point",
    },
  })),
}));

import { attachOfficialGpx } from "./preparation-service";
import { spogomiPreparationEvent } from "./preparation-test-fixtures";

describe("SPOGOMI official GPX synchronization", () => {
  it("delegates route and Action writes to the transactional RPC with the loaded revision", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        already_processed: false,
        eventId: "event-1",
        actionId: "action-1",
        routeId: "route-1",
        compositionRevision: 8,
        source: "official_reference",
        fileName: "synthetic-official.gpx",
        pointCount: 2,
        referenceDistanceKm: 1.25,
        inferredTopology: "point_to_point",
      },
      error: null,
    });
    const result = await attachOfficialGpx({
      supabase: { rpc } as never,
      event: spogomiPreparationEvent({ state: "in_progress" }),
      userId: "organizer-1",
      file: new File(["synthetic gpx"], "upload.gpx", { type: "application/gpx+xml" }),
    });

    expect(rpc).toHaveBeenCalledWith("spogomi_attach_official_gpx", expect.objectContaining({
      p_event_id: "event-1",
      p_expected_revision: 7,
      p_actor_clerk_id: "organizer-1",
      p_geometry_geojson: { type: "LineString", coordinates: [[2.31, 48.79], [2.32, 48.8]] },
    }));
    expect(result.synchronization).toEqual({
      already_processed: false,
      eventId: "event-1",
      actionId: "action-1",
      routeId: "route-1",
      compositionRevision: 8,
      source: "official_reference",
      fileName: "synthetic-official.gpx",
      pointCount: 2,
      referenceDistanceKm: 1.25,
      inferredTopology: "point_to_point",
    });
    expect(result.synchronization).not.toHaveProperty("alreadyProcessed");
  });

  it("preserves an idempotent GPX synchronization DTO", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        already_processed: true,
        eventId: "event-1",
        actionId: "action-1",
        routeId: "route-1",
        compositionRevision: 8,
        source: "official_reference",
        fileName: "synthetic-official.gpx",
        pointCount: 2,
        referenceDistanceKm: 1.25,
        inferredTopology: "loop",
      },
      error: null,
    });

    const result = await attachOfficialGpx({
      supabase: { rpc } as never,
      event: spogomiPreparationEvent({ state: "in_progress" }),
      userId: "organizer-1",
      file: new File(["synthetic gpx"], "upload.gpx", { type: "application/gpx+xml" }),
    });

    expect(result.synchronization).toMatchObject({ already_processed: true, inferredTopology: "loop" });
    expect(result.synchronization).not.toHaveProperty("alreadyProcessed");
  });

  it.each([
    { already_processed: false, eventId: "event-1" },
    { alreadyProcessed: false, eventId: "event-1", actionId: "action-1", routeId: "route-1", compositionRevision: 8, source: "official_reference", fileName: "route.gpx", pointCount: 2, referenceDistanceKm: 1, inferredTopology: "loop" },
    { already_processed: false, eventId: "event-1", actionId: "action-1", routeId: "route-1", compositionRevision: Number.NaN, source: "official_reference", fileName: "route.gpx", pointCount: 2, referenceDistanceKm: 1, inferredTopology: "loop" },
  ])("rejects a malformed GPX synchronization DTO: %j", async (data) => {
    const rpc = vi.fn().mockResolvedValue({ data, error: null });

    await expect(attachOfficialGpx({
      supabase: { rpc } as never,
      event: spogomiPreparationEvent({ state: "in_progress" }),
      userId: "organizer-1",
      file: new File(["synthetic gpx"], "upload.gpx", { type: "application/gpx+xml" }),
    })).rejects.toThrow(/synchronisation.*invalide/i);
  });

  it("keeps the preparation boundary fail-closed for a currently locked event", async () => {
    const rpc = vi.fn();
    await expect(attachOfficialGpx({
      supabase: { rpc } as never,
      event: spogomiPreparationEvent({ state: "composition_locked" }),
      userId: "organizer-1",
      file: new File(["synthetic gpx"], "upload.gpx", { type: "application/gpx+xml" }),
    })).rejects.toThrow(/après verrouillage/i);
    expect(rpc).not.toHaveBeenCalled();
  });
});
