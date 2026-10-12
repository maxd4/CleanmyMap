import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { buildSpogomiVolunteerSourceFingerprint, resolveSpogomiVolunteerContributionStatus } from "./volunteer";

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

  it("offers a new certificate when the current certified proof differs from an invalid or stale version", () => {
    const mission = { id: "mission-1", eventId: "event-1", eventName: "SPOGOMI Paris", locationLabel: "Paris", eventDate: "2026-06-01", kind: "field_safety" as const, status: "certified" as const, certifiedAt: "2026-06-01T12:00:00Z", evidenceReference: "presence:safety", certificationVersion: "v1" };
    const fingerprint = buildSpogomiVolunteerSourceFingerprint(event, [mission]);
    const base = { event, certifiedMissions: [mission], currentFingerprint: fingerprint };
    expect(resolveSpogomiVolunteerContributionStatus({ ...base, latestCertificate: null })).toBe("certificate_available");
    expect(resolveSpogomiVolunteerContributionStatus({ ...base, latestCertificate: { status: "revoked", source_fingerprint: fingerprint } })).toBe("certificate_reissue_available");
    expect(resolveSpogomiVolunteerContributionStatus({ ...base, latestCertificate: { status: "active", source_fingerprint: "stale" } })).toBe("certificate_reissue_available");
    expect(resolveSpogomiVolunteerContributionStatus({ ...base, latestCertificate: { status: "active", source_fingerprint: fingerprint } })).toBe("certificate_current");
  });

  it("does not turn an unverified or uncertified participant into a certificate action", () => {
    const mission = { id: "mission-1", eventId: "event-1", eventName: "SPOGOMI Paris", locationLabel: "Paris", eventDate: "2026-06-01", kind: "field_safety" as const, status: "certified" as const, certifiedAt: "2026-06-01T12:00:00Z", evidenceReference: "presence:safety", certificationVersion: "v1" };
    expect(resolveSpogomiVolunteerContributionStatus({ event: { ...event, identityVerified: false }, certifiedMissions: [mission], currentFingerprint: "fingerprint", latestCertificate: null })).toBe("identity_unlinked");
    expect(resolveSpogomiVolunteerContributionStatus({ event, certifiedMissions: [], currentFingerprint: null, latestCertificate: null })).toBe("validation_pending");
  });
});
