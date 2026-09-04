import { describe, expect, it } from "vitest";
import type { CommunityEventItem } from "@/lib/community/http";
import {
  filterRouteEventsByDate,
  getRouteEventStatus,
  routeEventStatusLabel,
} from "./route-event-selector.model";

function event(id: string, eventDate: string): CommunityEventItem {
  return {
    id,
    createdAt: "2026-09-01T00:00:00.000Z",
    organizerClerkId: null,
    title: id,
    eventDate,
    locationLabel: "Lieu",
    location: { label: "Lieu", latitude: null, longitude: null, source: null },
    description: null,
    capacityTarget: null,
    attendanceCount: null,
    postMortem: null,
    cleanupObjective: null,
    cleanupZone: null,
    cleanupLogisticsNeeds: null,
    cleanupSupportLevel: null,
    cleanupWasteTypesExpected: [],
    rsvpCounts: { yes: 0, maybe: 0, no: 0, total: 0 },
    myRsvpStatus: null,
  };
}

describe("route event selector model", () => {
  const now = new Date("2026-09-04T12:00:00.000Z");

  it("filters past, today and upcoming events deterministically", () => {
    const events = [event("past", "2026-09-03"), event("today", "2026-09-04"), event("future", "2026-09-05")];

    expect(filterRouteEventsByDate(events, "past", now).map(({ id }) => id)).toEqual(["past"]);
    expect(filterRouteEventsByDate(events, "today", now).map(({ id }) => id)).toEqual(["today"]);
    expect(filterRouteEventsByDate(events, "upcoming", now).map(({ id }) => id)).toEqual(["future"]);
    expect(getRouteEventStatus(events[1]!, now)).toBe("today");
    expect(routeEventStatusLabel("future")).toBe("À venir");
  });
});
