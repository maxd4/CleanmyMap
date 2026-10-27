import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  buildSpogomiVolunteerSourceFingerprint,
  issueSpogomiVolunteerCertificate,
  loadSpogomiCertificateForUser,
  loadSpogomiVolunteerEventForUser,
  loadSpogomiVolunteerSummaryForUser,
  resolveSpogomiVolunteerContributionStatus,
  revokeSpogomiVolunteerCertificate,
} from "./volunteer";

const event = {
  eventId: "event-1", eventName: "SPOGOMI Paris", eventSlug: "spogomi-paris", eventPublic: true, locationLabel: "Paris", eventDate: "2026-06-01",
  eventState: "certified", participantId: "participant-1", identityVerified: true,
  attendanceStatus: "present" as const, actionParticipationConfirmed: true, missions: [],
};

function volunteerSupabase(tables: Record<string, unknown[]>, rpcResult: { data?: unknown; error?: { message: string } | null } = { data: null, error: null }) {
  const from = vi.fn((table: string) => {
    type QueryChain = Record<string, ReturnType<typeof vi.fn>> & { then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown> };
    const chain = {} as QueryChain;
    for (const method of ["select", "eq", "in", "order"]) chain[method] = vi.fn(() => chain);
    chain.range = vi.fn(async () => ({ data: tables[table] ?? [], count: (tables[table] ?? []).length, error: null }));
    chain.maybeSingle = vi.fn(async () => ({ data: (tables[table] ?? [])[0] ?? null, error: null }));
    chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ data: tables[table] ?? [], error: null }).then(resolve, reject);
    return chain;
  });
  const rpc = vi.fn(async () => rpcResult);
  return { supabase: { from, rpc } as never, rpc };
}

const mission = {
  id: "mission-1", eventId: "event-1", eventName: "SPOGOMI Paris", locationLabel: "Paris", eventDate: "2026-06-01",
  kind: "field_safety" as const, status: "certified" as const, certifiedAt: "2026-06-01T12:00:00Z",
  evidenceReference: "presence:safety", certificationVersion: "v1",
};

function volunteerRows(overrides: Record<string, unknown[]> = {}) {
  return {
    spogomi_participants: [{ id: "participant-1", event_id: "event-1", division_id: null, clerk_id: "user-1", registration_status: "registered", attendance_status: "present", account_link_status: "verified" }],
    spogomi_events: [{ id: "event-1", action_id: "action-1", name: "SPOGOMI Paris", location_label: "Paris", event_slug: "spogomi-paris", public_visibility: "published", starts_at: "2026-06-01T09:00:00Z", official_timezone: "Europe/Paris", state: "certified" }],
    spogomi_recognition_attestations: [{ id: mission.id, event_id: mission.eventId, division_id: null, participant_id: "participant-1", kind: mission.kind, status: mission.status, certified_at: mission.certifiedAt, evidence_reference: mission.evidenceReference, certification_version: mission.certificationVersion }],
    action_participants: [{ id: "action-participant-1", action_id: "action-1", participation_status: "confirmed" }],
    ...overrides,
  };
}

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
    expect(resolveSpogomiVolunteerContributionStatus({ event: { ...event, attendanceStatus: "absent" }, certifiedMissions: [mission], currentFingerprint: "fingerprint", latestCertificate: null })).toBe("presence_not_confirmed");
    expect(resolveSpogomiVolunteerContributionStatus({ event, certifiedMissions: [], currentFingerprint: null, latestCertificate: { status: "active", source_fingerprint: "old" } })).toBe("certificate_revoked");
  });

  it("loads only the user-owned volunteer event and returns null for an empty roster", async () => {
    const empty = volunteerSupabase({ spogomi_participants: [] });
    await expect(loadSpogomiVolunteerEventForUser(empty.supabase, "user-1", "event-1")).resolves.toBeNull();

    const fixture = volunteerSupabase(volunteerRows({
      spogomi_events: [{ ...volunteerRows().spogomi_events[0], official_timezone: "invalid/timezone", event_slug: null }],
      spogomi_recognition_attestations: [...volunteerRows().spogomi_recognition_attestations, { ...volunteerRows().spogomi_recognition_attestations[0], id: "mission-2", status: "revoked", evidence_reference: "" }],
    }));
    const loaded = await loadSpogomiVolunteerEventForUser(fixture.supabase, "user-1", "event-1");
    expect(loaded).toMatchObject({ eventId: "event-1", eventSlug: null, eventDate: "2026-06-01", identityVerified: true, actionParticipationConfirmed: true });
    expect(loaded?.missions).toHaveLength(2);
  });

  it("rejects incomplete paginated reads instead of returning a partial volunteer event", async () => {
    const from = vi.fn((table: string) => {
      const chain = {} as Record<string, ReturnType<typeof vi.fn>>;
      for (const method of ["select", "eq", "in", "order"]) chain[method] = vi.fn(() => chain);
      chain.range = vi.fn(async () => ({ data: table === "spogomi_participants" ? [] : [], count: null, error: null }));
      return chain;
    });
    await expect(loadSpogomiVolunteerEventForUser({ from } as never, "user-1", "event-1")).rejects.toThrow("exact row count unavailable");
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

  it("revokes stale proof before refusing a certificate without active certified missions", async () => {
    const fixture = volunteerSupabase(volunteerRows({ spogomi_recognition_attestations: [] }));
    await expect(issueSpogomiVolunteerCertificate(fixture.supabase, "user-1", "event-1"))
      .rejects.toThrow("aucune mission bénévole certifiée");
    expect(fixture.rpc).toHaveBeenCalledWith("revoke_spogomi_volunteer_certificate", expect.objectContaining({ p_user_id: "user-1" }));

    const notAllowed = volunteerSupabase(volunteerRows({ spogomi_participants: [{ ...volunteerRows().spogomi_participants[0], account_link_status: "pending" }] }));
    await expect(issueSpogomiVolunteerCertificate(notAllowed.supabase, "user-1", "event-1"))
      .rejects.toThrow("participation bénévole certifiée n’est pas disponible");
    expect(notAllowed.rpc).not.toHaveBeenCalled();
  });

  it("fails closed for malformed or unavailable certificate RPC responses", async () => {
    const fixture = volunteerSupabase(volunteerRows(), { data: null, error: { message: "certificate rpc unavailable" } });
    await expect(issueSpogomiVolunteerCertificate(fixture.supabase, "user-1", "event-1")).rejects.toThrow("certificate rpc unavailable");

    const malformed = volunteerSupabase(volunteerRows(), { data: [{ id: "bad" }], error: null });
    await expect(issueSpogomiVolunteerCertificate(malformed.supabase, "user-1", "event-1")).rejects.toThrow("réponse de certificat");
  });

  it("returns no certificate when absent and rejects malformed persisted snapshots", async () => {
    const missing = volunteerSupabase({ spogomi_volunteer_certificates: [] });
    await expect(loadSpogomiCertificateForUser(missing.supabase, "user-1", "missing")).resolves.toBeNull();

    const malformed = volunteerSupabase({ spogomi_volunteer_certificates: [{
      id: "certificate-1", certificate_reference: "SPOGOMI-1", user_id: "user-1", event_id: "event-1", division_id: null,
      source_fingerprint: "fingerprint", source_snapshot: { event: {}, missions: [] }, status: "active",
      issued_at: "2026-06-02T10:00:00Z", revoked_at: null, revocation_reason: null,
    }] });
    await expect(loadSpogomiCertificateForUser(malformed.supabase, "user-1", "SPOGOMI-1")).rejects.toThrow("source du certificat");

    const malformedMission = volunteerSupabase({ spogomi_volunteer_certificates: [{
      id: "certificate-2", certificate_reference: "SPOGOMI-2", user_id: "user-1", event_id: "event-1", division_id: null,
      source_fingerprint: "fingerprint", source_snapshot: {
        event: { eventId: "event-1", divisionId: null, eventName: "SPOGOMI Paris", eventSlug: null, eventPublic: true, locationLabel: "Paris", eventDate: "2026-06-01", eventState: "certified", participantId: "participant-1", identityVerified: true, attendanceStatus: "present", actionParticipationConfirmed: true },
        missions: [{}],
      }, status: "active", issued_at: "2026-06-02T10:00:00Z", revoked_at: null, revocation_reason: null,
    }] });
    await expect(loadSpogomiCertificateForUser(malformedMission.supabase, "user-1", "SPOGOMI-2")).rejects.toThrow("source du certificat");
  });

  it("summarizes an empty private volunteer history without inventing certificates or awards", async () => {
    const fixture = volunteerSupabase({
      spogomi_participants: [],
      spogomi_collection_awards: [],
      spogomi_volunteer_certificates: [],
    });
    await expect(loadSpogomiVolunteerSummaryForUser(fixture.supabase, "user-1")).resolves.toMatchObject({
      confirmedEventCount: 0,
      certifiedMissionCount: 0,
      certifiedRefereeOrganizerMissionCount: 0,
      chronology: [],
      certificates: [],
      awards: [],
    });
  });

  it("propagates private certificate read failures", async () => {
    const from = vi.fn((table: string) => {
      const chain = {} as Record<string, ReturnType<typeof vi.fn>>;
      for (const method of ["select", "eq"]) chain[method] = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => table === "spogomi_volunteer_certificates"
        ? { data: null, error: new Error("certificate read unavailable") }
        : { data: null, error: null });
      return chain;
    });
    await expect(loadSpogomiCertificateForUser({ from } as never, "user-1", "SPOGOMI-1")).rejects.toThrow("certificate read unavailable");
  });

  it("propagates certificate revocation failures without claiming a state change", async () => {
    const revokeRpc = vi.fn().mockResolvedValue({ data: null, error: { message: "revoke unavailable" } });
    await expect(revokeSpogomiVolunteerCertificate({ rpc: revokeRpc } as never, "user-1", "event-1", "Correction"))
      .rejects.toThrow("revoke unavailable");
  });
});
