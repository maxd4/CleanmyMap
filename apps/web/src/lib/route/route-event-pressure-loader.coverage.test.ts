import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (callback: () => unknown) => callback }));

import { loadCachedRouteEventSignalContext } from "./route-event-pressure-loader";

function query<T>(data: T[], error: { message: string } | null = null) {
  const chain = {
    select: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    in: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data, error })),
  };
  return chain;
}

describe("route event pressure loader", () => {
  it("loads attendance, separates completed/future signals and ignores unknown RSVP events", async () => {
    const events = query([
      { id: "past", title: "Passé", event_date: "2026-10-20", location_label: "Paris", latitude: 48.85, longitude: 2.35, description: null },
      { id: "future", title: "Futur", event_date: "2026-10-30", location_label: "Paris", latitude: 48.85, longitude: 2.35, description: "[EVENT_OPS]{\"capacityTarget\":24}" },
      { id: "bad-coords", title: "Sans coord", event_date: "2026-10-19", location_label: "Paris", latitude: null, longitude: 2.35, description: null },
    ]);
    const rsvps = query([{ event_id: "past", status: "yes" }, { event_id: "past", status: "maybe" }, { event_id: "unknown", status: "no" }]);
    const client = { from: vi.fn((table: string) => table === "community_events" ? events : rsvps) } as never;

    const result = await loadCachedRouteEventSignalContext(() => client, [{ id: "candidate", latitude: 48.85, longitude: 2.35 }], new Date("2026-10-27T12:00:00Z"));
    expect(result).toMatchObject({ completedEventsConsidered: 2, geolocatedCompletedEvents: 1, eventsWithoutCoordinates: 1, sourceAvailable: true });
    expect(result.futureEventSignals).toHaveLength(1);
    expect(result.candidatePressureById.get("candidate")?.contributions).toHaveLength(1);
  });

  it("returns an empty snapshot without querying RSVPs and propagates RSVP failures", async () => {
    const emptyEvents = query([]);
    const emptyClient = { from: vi.fn(() => emptyEvents) } as never;
    const empty = await loadCachedRouteEventSignalContext(() => emptyClient, [], new Date("2026-10-27T12:00:00Z"));
    expect(empty).toMatchObject({ completedEventsConsidered: 0, geolocatedCompletedEvents: 0, futureEventSignals: [] });

    const eventQuery = query([{ id: "e", title: "E", event_date: "2026-10-20", location_label: "Paris", latitude: 48.85, longitude: 2.35, description: null }]);
    const failedRsvps = query([], { message: "rsvp unavailable" });
    const failedClient = { from: vi.fn((table: string) => table === "community_events" ? eventQuery : failedRsvps) } as never;
    await expect(loadCachedRouteEventSignalContext(() => failedClient, [], new Date("2026-10-27T12:00:00Z"))).rejects.toThrow("rsvp unavailable");
  });
});
