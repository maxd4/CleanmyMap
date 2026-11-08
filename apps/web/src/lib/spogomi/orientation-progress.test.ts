import { describe, expect, it } from "vitest";

import { buildSpogomiOrientationProgress } from "./orientation-progress";

function volunteerEvent(overrides: Partial<{
  eventId: string;
  eventName: string;
  eventState: string;
  identityVerified: boolean;
  attendanceStatus: "unknown" | "present" | "absent" | null;
  actionParticipationConfirmed: boolean;
  missions: Array<{ kind: "collector" | "referee"; status: "certified" | "revoked"; evidenceReference: string }>;
}> = {}) {
  return {
    eventId: "event-1", eventName: "Paris", eventState: "certified", identityVerified: true,
    attendanceStatus: "present" as const, actionParticipationConfirmed: true,
    missions: [{ kind: "referee" as const, status: "certified" as const, evidenceReference: "evidence-1" }],
    ...overrides,
  };
}

function personalEvent(overrides: Partial<{ id: string; name: string; eventSlug: string | null; state: string; relations: Array<"organizer" | "referee" | "field_operator">; publicVisibility: "private" | "published"; publicResultsVisibility: "hidden" | "provisional" | "certified" }> = {}) {
  return {
    id: "event-1", name: "Paris", eventSlug: "paris", state: "certified", relations: ["organizer" as const], publicVisibility: "published" as const, publicResultsVisibility: "certified" as const, ...overrides,
  };
}

describe("buildSpogomiOrientationProgress", () => {
  it("keeps certified proofs scoped to their event and ignores revoked missions", () => {
    const proofs = buildSpogomiOrientationProgress({
      userId: "user-1",
      personalEvents: [],
      volunteerSummary: {
        chronology: [
          volunteerEvent(),
          volunteerEvent({ eventId: "event-2", eventName: "Lille", eventState: "active", identityVerified: false, attendanceStatus: "unknown", actionParticipationConfirmed: false, missions: [{ kind: "referee", status: "revoked", evidenceReference: "revoked" }] }),
        ],
        certificates: [{ eventId: "event-1", status: "active" } as never, { eventId: "event-2", status: "revoked" } as never],
      },
      operationalCertifications: [],
    });

    expect(proofs).toEqual(expect.arrayContaining([
      { key: "volunteer.participation", eventId: "event-1", eventName: "Paris", evidence: "certified_participation" },
      { key: "volunteer.contributions", eventId: "event-1", eventName: "Paris", evidence: "certified_mission" },
      { key: "volunteer.attestations", eventId: "event-1", eventName: "Paris", evidence: "active_attestation" },
    ]));
    expect(proofs.some((proof) => proof.eventId === "event-2")).toBe(false);
  });

  it("keeps an identity-unverified certified mission neutral while preserving revoked-proof handling", () => {
    const proofs = buildSpogomiOrientationProgress({
      userId: "user-1",
      personalEvents: [],
      volunteerSummary: {
        chronology: [volunteerEvent({ identityVerified: false, missions: [{ kind: "collector", status: "certified", evidenceReference: "evidence-2" }] })],
        certificates: [{ eventId: "event-1", status: "revoked" } as never],
      },
      operationalCertifications: [],
    });

    expect(proofs).toEqual([]);
  });

  it("requires a current operational certification attributed to the account and event", () => {
    const proofs = buildSpogomiOrientationProgress({
      userId: "user-1",
      personalEvents: [personalEvent({ relations: ["field_operator"] })],
      volunteerSummary: { chronology: [], certificates: [] },
      operationalCertifications: [
        { certificationId: "measurement-1", eventId: "event-1", certifiedByClerkId: "user-1", certifiedAt: "2026-11-09T10:00:00.000Z" },
        { certificationId: "measurement-2", eventId: "event-2", certifiedByClerkId: "user-1", certifiedAt: "2026-11-09T10:00:00.000Z" },
        { certificationId: "measurement-3", eventId: "event-1", certifiedByClerkId: "other-user", certifiedAt: "2026-11-09T10:00:00.000Z" },
      ],
    });

    expect(proofs).toEqual([
      { key: "referee.certification", eventId: "event-1", eventName: "Paris", evidence: "operational_certification" },
    ]);
  });

  it("requires the organizer relation and effective public event visibility before accepting publication proofs", () => {
    const proofs = buildSpogomiOrientationProgress({
      userId: "user-1",
      personalEvents: [
        personalEvent(),
        personalEvent({ id: "event-2", name: "Lille", relations: ["referee"], publicVisibility: "published", publicResultsVisibility: "certified" }),
        personalEvent({ id: "event-3", name: "Nice", relations: ["organizer"], publicVisibility: "private", publicResultsVisibility: "certified" }),
        personalEvent({ id: "event-4", name: "Lyon", relations: ["organizer"], state: "cancelled", publicVisibility: "published", publicResultsVisibility: "certified" }),
        personalEvent({ id: "event-5", name: "Nantes", relations: ["organizer"], eventSlug: null, publicVisibility: "published", publicResultsVisibility: "certified" }),
      ],
      volunteerSummary: { chronology: [], certificates: [] },
      operationalCertifications: [],
    });

    expect(proofs).toEqual([
      { key: "organizer.event_publication", eventId: "event-1", eventName: "Paris", evidence: "event_published" },
      { key: "organizer.results_publication", eventId: "event-1", eventName: "Paris", evidence: "results_published" },
    ]);
  });
});
