import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  getSupabase: vi.fn(),
  loadCertificate: vi.fn(),
  loadEvent: vi.fn(),
  fingerprint: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth, currentUser: mocks.currentUser }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabase }));
vi.mock("@/lib/spogomi/volunteer", () => ({
  buildSpogomiVolunteerSourceFingerprint: mocks.fingerprint,
  loadSpogomiCertificateForUser: mocks.loadCertificate,
  loadSpogomiVolunteerEventForUser: mocks.loadEvent,
  revokeSpogomiVolunteerCertificate: mocks.revoke,
}));

import { GET } from "./route";

const context = { params: Promise.resolve({ certificateReference: "opaque-certificate-1" }) };
const certificate = {
  id: "certificate-row-1", certificateReference: "opaque-certificate-1", userId: "user-1", eventId: "event-1", sourceFingerprint: "fingerprint-1",
  sourceSnapshot: {}, status: "active" as const, issuedAt: "2026-06-02T10:00:00Z", revokedAt: null, revocationReason: null,
};
const event = {
  eventId: "event-1", eventName: "SPOGOMI Paris", eventSlug: "paris-2026", eventPublic: true, locationLabel: "Paris", eventDate: "2026-06-01", eventState: "certified",
  participantId: "participant-1", identityVerified: true, attendanceStatus: "present" as const, actionParticipationConfirmed: true,
  missions: [{ id: "mission-1", eventId: "event-1", eventName: "SPOGOMI Paris", locationLabel: "Paris", eventDate: "2026-06-01", kind: "field_safety" as const, status: "certified" as const, certifiedAt: "2026-06-01T12:00:00Z", evidenceReference: "evidence:1", certificationVersion: "v1" }],
};

describe("GET /api/spogomi/certificates/[certificateReference]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for an anonymous requester and 404 for another user's opaque reference", async () => {
    mocks.auth.mockResolvedValueOnce({ userId: null });
    expect((await GET(new Request("http://localhost"), context)).status).toBe(401);

    mocks.auth.mockResolvedValueOnce({ userId: "user-2" });
    mocks.getSupabase.mockReturnValue({});
    mocks.loadCertificate.mockResolvedValueOnce(null);
    expect((await GET(new Request("http://localhost"), context)).status).toBe(404);
    expect(mocks.loadCertificate).toHaveBeenLastCalledWith({}, "user-2", "opaque-certificate-1");
    expect(mocks.loadEvent).not.toHaveBeenCalled();
  });

  it("generates a real private PDF with only the authorized attestation fields", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.getSupabase.mockReturnValue({});
    mocks.loadCertificate.mockResolvedValue(certificate);
    mocks.loadEvent.mockResolvedValue(event);
    mocks.fingerprint.mockReturnValue("fingerprint-1");
    mocks.currentUser.mockResolvedValue({ firstName: "Ada", lastName: "Lovelace" });

    const response = await GET(new Request("http://localhost"), context);
    const text = new TextDecoder().decode(new Uint8Array(await response.arrayBuffer()));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Disposition")).toContain("opaque-certificate-1.pdf");
    expect(text).toContain("Attestation de participation");
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("SPOGOMI Paris");
    expect(text).toContain("opaque-certificate-1");
    expect(text).not.toContain("heures bénévoles");
    expect(text).not.toContain("quantité individuelle");
    expect(text).not.toContain("tampon fédéral");
    expect(text).not.toContain("Signature fédérale");
  });

  it("revokes the certificate without producing a PDF after a source correction", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.getSupabase.mockReturnValue({});
    mocks.loadCertificate.mockResolvedValue(certificate);
    mocks.loadEvent.mockResolvedValue(event);
    mocks.fingerprint.mockReturnValue("corrected-fingerprint");
    const response = await GET(new Request("http://localhost"), context);
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ status: "revoked" });
    expect(mocks.revoke).toHaveBeenCalledWith({}, "user-1", "event-1", expect.stringContaining("corrigée"));
    expect(mocks.currentUser).not.toHaveBeenCalled();
  });
});
