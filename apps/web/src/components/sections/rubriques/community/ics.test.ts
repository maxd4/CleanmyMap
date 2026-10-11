import { describe, expect, it } from"vitest";
import type { CommunityEventItem } from"@/lib/community/http";
import { buildActionIcsHref, buildDateAtHour, buildIcsHref, toIcsTimestamp } from"./ics";

function makeEvent(overrides: Partial<CommunityEventItem> = {}): CommunityEventItem {
 return {
 id:"evt-42",
 createdAt:"2026-01-01T00:00:00.000Z",
 organizerClerkId:"user_123",
 canEditOwnOps:false,
 title:"Nettoyage berges",
 eventDate:"2026-07-10",
 locationLabel:"Canal Saint-Martin",
 location: { label:"Canal Saint-Martin", latitude:null, longitude:null, source:null },
 description:"Collecte citoyenne",
 capacityTarget: 40,
 attendanceCount: null,
 postMortem: null,
 cleanupObjective: null,
 cleanupZone: null,
 cleanupLogisticsNeeds: null,
 cleanupSupportLevel: null,
 cleanupWasteTypesExpected: [],
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
 href.replace("data:text/calendar;charset=utf-8,",""),
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

 it("exports a date-only action without inventing a 09:30 time", () => {
  const href = buildActionIcsHref({ id: "action/42", title: "Berges; nord, matin", actionDate: "2026-10-25", location: "Quai\nNord" });
  const decoded = decodeURIComponent(href.replace("data:text/calendar;charset=utf-8,", ""));
  expect(decoded).toContain("DTSTART;VALUE=DATE:20261025");
  expect(decoded).not.toContain("09:30");
  expect(decoded).toContain("SUMMARY:Berges\\; nord\\, matin");
  expect(decoded).toContain("LOCATION:Quai\\nNord");
 });

 it("keeps a confirmed local time with an explicit Paris timezone", () => {
  const href = buildActionIcsHref({ id: "action-42", title: "Action", actionDate: "2026-07-10", startTime: "10:00", endTime: "12:00" });
  const decoded = decodeURIComponent(href.replace("data:text/calendar;charset=utf-8,", ""));
  expect(decoded).toContain("DTSTART;TZID=Europe/Paris:20260710T100000");
  expect(decoded).toContain("DTEND;TZID=Europe/Paris:20260710T120000");
 });
});
