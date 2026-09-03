import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: (loader: () => Promise<unknown>) => loader,
}));

import {
  loadRouteEventSignalContext,
} from "./route-event-pressure-loader";

const now = new Date("2026-09-03T12:00:00.000Z");

function queryResult(data: unknown, error: { message: string } | null = null) {
  const query = {
    data,
    error,
    select: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    in: vi.fn(),
  };
  for (const method of ["select", "gte", "lte", "order", "limit", "in"] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

describe("route event pressure loader", () => {
  it("loads geolocated completed events and keeps future/legacy states distinct", async () => {
    const eventsQuery = queryResult([
      {
        id: "event-completed",
        title: "Événement passé",
        event_date: "2026-09-02",
        location_label: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        description: "capacity_target=60",
      },
      {
        id: "event-legacy",
        title: "Événement legacy",
        event_date: "2026-09-01",
        location_label: "Paris",
        latitude: null,
        longitude: null,
        description: null,
      },
      {
        id: "event-future",
        title: "Événement futur",
        event_date: "2026-09-04",
        location_label: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        description: null,
      },
    ]);
    const rsvpsQuery = queryResult([
      { event_id: "event-completed", status: "yes" },
      { event_id: "event-completed", status: "maybe" },
    ]);
    const from = vi.fn()
      .mockReturnValueOnce(eventsQuery)
      .mockReturnValueOnce(rsvpsQuery);
    const supabase = { from } as never;

    const context = await loadRouteEventSignalContext(
      supabase,
      [{ id: "spot-1", latitude: 48.8566, longitude: 2.3522 }],
      now,
    );

    expect(from).toHaveBeenNthCalledWith(1, "community_events");
    expect(eventsQuery.gte).toHaveBeenCalledWith("event_date", "2026-07-09");
    expect(eventsQuery.lte).toHaveBeenCalledWith("event_date", "2026-09-24");
    expect(eventsQuery.limit).toHaveBeenCalledWith(560);
    expect(from).toHaveBeenNthCalledWith(2, "event_rsvps");
    expect(context.completedEventsConsidered).toBe(2);
    expect(context.geolocatedCompletedEvents).toBe(1);
    expect(context.eventsWithoutCoordinates).toBe(1);
    expect(context.futureEventSignals[0]).toContain("signal d’anticipation distinct");
    expect(context.candidatePressureById.get("spot-1")?.contributions).toHaveLength(1);
  });

  it("propagates source errors so the API can expose a degraded signal state", async () => {
    const eventsQuery = queryResult(null, { message: "RLS unavailable" });
    const supabase = {
      from: vi.fn().mockReturnValue(eventsQuery),
    } as never;

    await expect(
      loadRouteEventSignalContext(supabase, [], now),
    ).rejects.toThrow("RLS unavailable");
  });
});
