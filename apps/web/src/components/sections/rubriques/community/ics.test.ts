import { describe, expect, it } from "vitest";
import type { CommunityEventItem } from "@/lib/community/http";
import { buildDateAtHour, buildIcsHref, toIcsTimestamp } from "./ics";

function makeEvent(overrides: Partial<CommunityEventItem> = {}): CommunityEventItem {
  return {
    id: "evt-42",
    createdAt: "2026-01-01T00:00:00.000Z",
    organizerClerkId: "user_123",
    title: "Nettoyage berges",
    eventDate: "2026-07-10",
    locationLabel: "Canal Saint-Martin",
    description: "Collecte citoyenne",
    capacityTarget: 40,
    attendanceCount: null,
    postMortem: null,
    rsvpCounts: { yes: 10, maybe: 2, no: 1, total: 13 },
    myRsvpStatus: null,
    ...overrides,
  };
}

describe("community ICS helpers", () => {
  it("formats UTC timestamps in ICS format", () => {
    expect(toIcsTimestamp(new Date(Date.UTC(2026, 0, 2, 3, 4, 5)))).toBe(
      "20260102T030405Z",
    );
  });

  it("builds encoded ICS content with event fields and schedule", () => {
    const event = makeEvent();
    const href = buildIcsHref(event);
    expect(href.startsWith("data:text/calendar;charset=utf-8,")).toBe(true);

    const decoded = decodeURIComponent(
      href.replace("data:text/calendar;charset=utf-8,", ""),
    );

    expect(decoded).toContain("BEGIN:VCALENDAR");
    expect(decoded).toContain(`UID:${event.id}@cleanmymap`);
    expect(decoded).toContain(`SUMMARY:${event.title}`);
    expect(decoded).toContain(`LOCATION:${event.locationLabel}`);
    expect(decoded).toContain(
      `DTSTART:${toIcsTimestamp(buildDateAtHour(event.eventDate, 9, 30))}`,
    );
    expect(decoded).toContain(
      `DTEND:${toIcsTimestamp(buildDateAtHour(event.eventDate, 12, 0))}`,
    );
    expect(decoded).toContain("END:VCALENDAR");
  });
});
