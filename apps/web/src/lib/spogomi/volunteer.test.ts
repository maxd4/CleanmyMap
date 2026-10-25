import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  buildSpogomiVolunteerSourceFingerprint,
  issueSpogomiVolunteerCertificate,
  resolveSpogomiVolunteerContributionStatus,
  revokeSpogomiVolunteerCertificate,
} from "./volunteer";

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

  it("issues a certificate from the certified volunteer snapshot and keeps the RPC actor bound to the user", async () => {
    const mission = { id: "mission-1", eventId: "event-1", eventName: "SPOGOMI Paris", locationLabel: "Paris", eventDate: "2026-06-01", kind: "field_safety" as const, status: "certified" as const, certifiedAt: "2026-06-01T12:00:00Z", evidenceReference: "presence:safety", certificationVersion: "v1" };
    const certificate = {
      id: "certificate-1", certificate_reference: "SPOGOMI-2026-0001", user_id: "user-1", event_id: "event-1", division_id: null,
      source_fingerprint: buildSpogomiVolunteerSourceFingerprint(event, [mission]),
      source_snapshot: { event, missions: [mission] }, status: "active", issued_at: "2026-06-02T10:00:00Z", revoked_at: null, revocation_reason: null,
    };
    const rowsByTable: Record<string, unknown[]> = {
      spogomi_participants: [{ id: "participant-1", event_id: "event-1", division_id: null, clerk_id: "user-1", registration_status: "registered", attendance_status: "present", account_link_status: "verified" }],
      spogomi_events: [{ id: "event-1", action_id: "action-1", name: event.eventName, location_label: event.locationLabel, event_slug: event.eventSlug, public_visibility: "published", starts_at: "2026-06-01T09:00:00Z", official_timezone: "Europe/Paris", state: "certified" }],
      spogomi_recognition_attestations: [{ id: mission.id, event_id: mission.eventId, division_id: null, participant_id: "participant-1", kind: mission.kind, status: mission.status, certified_at: mission.certifiedAt, evidence_reference: mission.evidenceReference, certification_version: mission.certificationVersion }],
      action_participants: [{ id: "action-participant-1", action_id: "action-1", participation_status: "confirmed" }],
    };
    const rpc = vi.fn().mockResolvedValue({ data: certificate, error: null });
    const supabase = { from: (table: string) => {
      const chain = {
        select: () => chain, eq: () => chain, in: () => chain, order: () => chain,
        range: async () => ({ data: rowsByTable[table] ?? [], error: null, count: (rowsByTable[table] ?? []).length }),
      };
      return chain;
    }, rpc } as never;

    await expect(issueSpogomiVolunteerCertificate(supabase, "user-1", "event-1")).resolves.toMatchObject({
      certificateReference: "SPOGOMI-2026-0001",
      sourceFingerprint: certificate.source_fingerprint,
    });
    expect(rpc).toHaveBeenCalledWith("issue_spogomi_volunteer_certificate", expect.objectContaining({
      p_user_id: "user-1", p_event_id: "event-1", p_actor_clerk_id: "user-1", p_source_fingerprint: certificate.source_fingerprint,
    }));
  });

  it("revokes a certificate through the canonical RPC", async () => {
    const revokeRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    await expect(revokeSpogomiVolunteerCertificate({ rpc: revokeRpc } as never, "user-1", "event-1", "Correction de la preuve")).resolves.toBeUndefined();
    expect(revokeRpc).toHaveBeenCalledWith("revoke_spogomi_volunteer_certificate", {
      p_user_id: "user-1", p_event_id: "event-1", p_reason: "Correction de la preuve", p_actor_clerk_id: "user-1",
    });
  });
});
