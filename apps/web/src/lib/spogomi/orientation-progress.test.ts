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

function personalEvent(overrides: Partial<{ id: string; name: string; relations: Array<"organizer" | "referee">; publicVisibility: "private" | "published"; publicResultsVisibility: "hidden" | "provisional" | "certified" }> = {}) {
  return {
    id: "event-1", name: "Paris", relations: ["organizer" as const], publicVisibility: "published" as const, publicResultsVisibility: "certified" as const, ...overrides,
  };
}

describe("buildSpogomiOrientationProgress", () => {
  it("keeps certified proofs scoped to their event and ignores revoked missions", () => {
    const proofs = buildSpogomiOrientationProgress({
      personalEvents: [],
      volunteerSummary: {
        chronology: [
          volunteerEvent(),
          volunteerEvent({ eventId: "event-2", eventName: "Lille", eventState: "active", identityVerified: false, attendanceStatus: "unknown", actionParticipationConfirmed: false, missions: [{ kind: "referee", status: "revoked", evidenceReference: "revoked" }] }),
        ],
        certificates: [{ eventId: "event-1", status: "active" } as never, { eventId: "event-2", status: "revoked" } as never],
      },
    });

    expect(proofs).toEqual(expect.arrayContaining([
      { key: "volunteer.participation", eventId: "event-1", eventName: "Paris", evidence: "certified_participation" },
      { key: "volunteer.contributions", eventId: "event-1", eventName: "Paris", evidence: "certified_mission" },
      { key: "volunteer.attestations", eventId: "event-1", eventName: "Paris", evidence: "active_attestation" },
      { key: "referee.certification", eventId: "event-1", eventName: "Paris", evidence: "certified_mission" },
    ]));
    expect(proofs.some((proof) => proof.eventId === "event-2")).toBe(false);
  });

  it("requires the organizer relation before accepting publication proofs", () => {
    const proofs = buildSpogomiOrientationProgress({
      personalEvents: [
        personalEvent(),
        personalEvent({ id: "event-2", name: "Lille", relations: ["referee"], publicVisibility: "published", publicResultsVisibility: "certified" }),
      ],
      volunteerSummary: { chronology: [], certificates: [] },
    });

    expect(proofs).toEqual([
      { key: "organizer.event_publication", eventId: "event-1", eventName: "Paris", evidence: "event_published" },
      { key: "organizer.results_publication", eventId: "event-1", eventName: "Paris", evidence: "results_published" },
    ]);
  });
});
