import { describe, expect, it } from "vitest";
import { CURRENT_SPOGOMI_BADGE_DEFINITIONS } from "@/lib/gamification/badge-catalog";
import { buildSpogomiRecognitionProjection, type SpogomiRecognitionParticipant } from "./recognition";

const participant = (overrides: Partial<SpogomiRecognitionParticipant> = {}): SpogomiRecognitionParticipant => ({
  participantId: "participant-1", eventId: "event-1", teamId: "team-1", userId: "user-1",
  registrationStatus: "registered", attendanceStatus: "present", identityVerified: true,
  collectorActivityCertified: true, actionParticipationConfirmed: true, teamDisqualified: false,
  ...overrides,
});

describe("SPOGOMI recognition projection", () => {
  it("keeps the ten repeatable identities in the canonical badge owner", () => {
    expect(CURRENT_SPOGOMI_BADGE_DEFINITIONS.map((definition) => definition.id)).toEqual([
      "spogomi_collector", "spogomi_referee", "spogomi_points_bronze", "spogomi_points_silver", "spogomi_points_gold",
      "spogomi_butts_bronze", "spogomi_butts_silver", "spogomi_butts_gold", "spogomi_double_podium", "spogomi_organizer",
    ]);
  });

  it("awards a collector once per event and uses only certified official rankings for medals", () => {
    const projection = buildSpogomiRecognitionProjection({
      eventId: "event-1", eventDate: "2026-06-01",
      participants: [participant(), participant({ participantId: "participant-2", userId: "user-2" }), participant({ participantId: "absent", userId: "user-3", attendanceStatus: "absent" }), participant({ participantId: "unverified", userId: "user-4", identityVerified: false })],
      missions: [
        { missionId: "referee-1", eventId: "event-1", participantId: "participant-1", kind: "referee", status: "certified", certifiedAt: "2026-06-01T12:00:00Z", evidenceReference: "attestation:1", certificationVersion: "a1" },
        { missionId: "organizer-1", eventId: "event-1", participantId: "participant-2", kind: "organizer", status: "certified", certifiedAt: "2026-06-01T12:00:00Z", evidenceReference: "attestation:2", certificationVersion: "a1" },
      ],
      rankings: [
        { eventId: "event-1", teamId: "team-1", kind: "points", rank: 1, status: "certified", teamEligible: true, decisionVersion: "v1", sourceReference: "official:points" },
        { eventId: "event-1", teamId: "team-1", kind: "butts", rank: 2, status: "certified", teamEligible: true, decisionVersion: "v1", sourceReference: "official:butts" },
      ],
    });
    const user1 = projection.awards.filter((award) => award.userId === "user-1");
    expect(user1.map((award) => award.badgeTypeId).sort()).toEqual(["spogomi_butts_silver", "spogomi_collector", "spogomi_double_podium", "spogomi_points_gold", "spogomi_referee"].sort());
    expect(projection.awards.some((award) => award.userId === "user-3" || award.userId === "user-4")).toBe(false);
    expect(new Set(projection.awards.map((award) => `${award.userId}:${award.eventId}:${award.badgeTypeId}`)).size).toBe(projection.awards.length);
  });

  it("does not invent podium awards when the official projection is absent or revoked", () => {
    const projection = buildSpogomiRecognitionProjection({
      eventId: "event-1", eventDate: "2026-06-01", participants: [participant()], missions: [],
      rankings: [{ eventId: "event-1", teamId: "team-1", kind: "points", rank: 1, status: "revoked", teamEligible: true, decisionVersion: "v1", sourceReference: "official:points" }],
    });
    expect(projection.awards.map((award) => award.badgeTypeId)).toEqual(["spogomi_collector"]);
  });

  it("keeps points and butts medals independent while requiring both for double podium", () => {
    const pointsOnly = buildSpogomiRecognitionProjection({
      eventId: "event-1", eventDate: "2026-06-01", participants: [participant()], missions: [],
      rankings: [{ eventId: "event-1", teamId: "team-1", kind: "points", rank: 1, status: "certified", teamEligible: true, decisionVersion: "points-v2", sourceReference: "official:points:v2" }],
    });
    expect(pointsOnly.awards.map((award) => award.badgeTypeId)).toEqual(["spogomi_collector", "spogomi_points_gold"]);
    expect(pointsOnly.awards.find((award) => award.badgeTypeId === "spogomi_points_gold")).toMatchObject({ certificationReference: "official:points:v2", rankingVersion: "points-v2" });

    const buttsOnly = buildSpogomiRecognitionProjection({
      eventId: "event-1", eventDate: "2026-06-01", participants: [participant()], missions: [],
      rankings: [{ eventId: "event-1", teamId: "team-1", kind: "butts", rank: 2, status: "certified", teamEligible: true, decisionVersion: "butts-v2", sourceReference: "official:butts:v2" }],
    });
    expect(buttsOnly.awards.map((award) => award.badgeTypeId)).toEqual(["spogomi_butts_silver", "spogomi_collector"]);
    expect(buttsOnly.awards.find((award) => award.badgeTypeId === "spogomi_butts_silver")).toMatchObject({ certificationReference: "official:butts:v2", rankingVersion: "butts-v2" });
  });

  it("reconciles a changed ranking without retaining revoked medals or duplicating the badge", () => {
    const revokedButts = buildSpogomiRecognitionProjection({
      eventId: "event-1", eventDate: "2026-06-01", participants: [participant()], missions: [],
      rankings: [
        { eventId: "event-1", teamId: "team-1", kind: "points", rank: 2, status: "certified", teamEligible: true, decisionVersion: "points-v2", sourceReference: "official:points:v2" },
        { eventId: "event-1", teamId: "team-1", kind: "butts", rank: 3, status: "revoked", teamEligible: true, decisionVersion: "butts-v1", sourceReference: "official:butts:v1" },
      ],
    });
    expect(revokedButts.awards.map((award) => award.badgeTypeId)).toEqual(["spogomi_collector", "spogomi_points_silver"]);

    const corrected = buildSpogomiRecognitionProjection({
      eventId: "event-1", eventDate: "2026-06-01", participants: [participant()], missions: [],
      rankings: [
        { eventId: "event-1", teamId: "team-1", kind: "points", rank: 1, status: "certified", teamEligible: true, decisionVersion: "points-v3", sourceReference: "official:points:v3" },
        { eventId: "event-1", teamId: "team-1", kind: "butts", rank: 3, status: "certified", teamEligible: true, decisionVersion: "butts-v2", sourceReference: "official:butts:v2" },
      ],
    });
    expect(corrected.awards.filter((award) => award.badgeTypeId === "spogomi_points_gold")).toHaveLength(1);
    expect(corrected.awards.find((award) => award.badgeTypeId === "spogomi_points_gold")).toMatchObject({ certificationReference: "official:points:v3", rankingVersion: "points-v3" });
    expect(corrected.awards.map((award) => award.badgeTypeId)).toEqual(["spogomi_butts_bronze", "spogomi_collector", "spogomi_double_podium", "spogomi_points_gold"]);
  });

  it("requires registration, presence and confirmed action participation for mission badges", () => {
    const mission = { missionId: "referee-1", eventId: "event-1", participantId: "participant-1", kind: "referee" as const, status: "certified" as const, certifiedAt: "2026-06-01T12:00:00Z", evidenceReference: "attestation:1", certificationVersion: "a1" };
    for (const overrides of [{ attendanceStatus: "absent" as const }, { registrationStatus: "withdrawn" as const }, { actionParticipationConfirmed: false }]) {
      const projection = buildSpogomiRecognitionProjection({ eventId: "event-1", eventDate: "2026-06-01", participants: [participant(overrides)], missions: [mission], rankings: [] });
      expect(projection.awards.some((award) => award.badgeTypeId === "spogomi_referee")).toBe(false);
      expect(projection.firstRefereeProofs).toEqual([]);
    }
  });

  it("allows identical badge types on distinct events and never merges them by year", () => {
    const first = buildSpogomiRecognitionProjection({ eventId: "paris-2026", eventDate: "2026-06-01", participants: [participant({ eventId: "paris-2026" })], missions: [], rankings: [] });
    const second = buildSpogomiRecognitionProjection({ eventId: "nice-2026", eventDate: "2026-09-01", participants: [participant({ eventId: "nice-2026", participantId: "participant-2" })], missions: [], rankings: [] });
    expect(first.awards[0]?.eventId).toBe("paris-2026");
    expect(second.awards[0]?.eventId).toBe("nice-2026");
  });
});
