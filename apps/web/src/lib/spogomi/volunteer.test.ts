import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { buildSpogomiVolunteerSourceFingerprint } from "./volunteer";

const event = {
  eventId: "event-1", eventName: "SPOGOMI Paris", eventSlug: "spogomi-paris", eventPublic: true, locationLabel: "Paris", eventDate: "2026-06-01",
  eventState: "certified", participantId: "participant-1", identityVerified: true,
  attendanceStatus: "present" as const, actionParticipationConfirmed: true, missions: [],
};

describe("SPOGOMI volunteer certificate source", () => {
  it("keeps a stable opaque source fingerprint and changes it after a correction", () => {
    const mission = { id: "mission-1", eventId: "event-1", eventName: "SPOGOMI Paris", locationLabel: "Paris", eventDate: "2026-06-01", kind: "field_safety" as const, status: "certified" as const, certifiedAt: "2026-06-01T12:00:00Z", evidenceReference: "presence:safety", certificationVersion: "v1" };
    const first = buildSpogomiVolunteerSourceFingerprint(event, [mission]);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(buildSpogomiVolunteerSourceFingerprint(event, [mission])).toBe(first);
    expect(buildSpogomiVolunteerSourceFingerprint(event, [{ ...mission, certificationVersion: "v2" }])).not.toBe(first);
  });
});
