import { describe, expect, it } from "vitest";
import {
  aggregateSpogomiPartnerImpact,
  buildSpogomiPublicOrganizer,
  type SpogomiPartnerEventInput,
} from "./partner-impact";

function event(overrides: Partial<SpogomiPartnerEventInput> = {}): SpogomiPartnerEventInput {
  return {
    eventId: "event-1",
    eventSlug: "edition-1",
    name: "Édition 1",
    locationLabel: "Paris",
    mode: "casual",
    state: "certified",
    startsAt: "2026-06-01T10:00:00.000Z",
    actionId: "action-1",
    organizer: null,
    environmental: {
      status: "available",
      totalWasteMassGrams: 12_000,
      cigaretteButtsMassGrams: 2_000,
      cigaretteButtsCount: 400,
      participantsPresent: 6,
      projectionVersion: "v1",
      sourceHash: "hash-1",
    },
    verifiedParticipantIds: [],
    participantIdentitiesReliable: false,
    certifiedMissions: [{ id: "mission-1", kind: "weighing_sorting" }],
    ...overrides,
  };
}

describe("SPOGOMI partner impact projection", () => {
  it("uses the canonical organizer id and never maps a similar name", () => {
    const organizer = buildSpogomiPublicOrganizer({
      organizerId: "association-pikpik",
      organizerName: "PikPik Environnement",
      eventTerritory: "Paris",
    });
    expect(organizer?.verifiedName).toBe("PikPik Environnement");
    expect(buildSpogomiPublicOrganizer({
      organizerId: "association-pikpik",
      organizerName: "PikPik Environnement bis",
      eventTerritory: "Paris",
    })?.verifiedName).toBe("PikPik Environnement");
    expect(buildSpogomiPublicOrganizer({
      organizerId: "association-other",
      organizerName: "PikPik Environnement",
      eventTerritory: "Paris",
    })).toBeNull();
  });

  it("deduplicates actions, keeps mass and observed butt counts separate, and recomputes corrections", () => {
    const first = event();
    const duplicate = event({ eventId: "event-duplicate", eventSlug: "edition-duplicate" });
    const second = event({
      eventId: "event-2",
      eventSlug: "edition-2",
      actionId: "action-2",
      startsAt: "2027-06-01T10:00:00.000Z",
      environmental: {
        ...first.environmental,
        totalWasteMassGrams: 8_000,
        cigaretteButtsMassGrams: null,
        cigaretteButtsCount: null,
        participantsPresent: 4,
        projectionVersion: "v2",
        sourceHash: "hash-2",
      },
      participantIdentitiesReliable: false,
      certifiedMissions: [{ id: "mission-2", kind: "organizer" }],
    });
    const projection = aggregateSpogomiPartnerImpact([first, duplicate, second]);
    expect(projection.publishedEditionCount).toBe(2);
    expect(projection.totalWasteMassKg).toBe(20);
    expect(projection.cigaretteButtsMassKg).toBe(2);
    expect(projection.nonCigaretteWasteMassKg).toBeNull();
    expect(projection.countedCigaretteButts).toBe(400);
    expect(projection.confirmedTerrainParticipations).toBe(10);
    expect(projection.byYear["2026"].publishedEditionCount).toBe(1);
    expect(projection.byYear["2027"].totalWasteMassKg).toBe(8);
    expect(projection.notes.join(" ")).toContain("séparés");

    const corrected = aggregateSpogomiPartnerImpact([
      event({ environmental: { ...first.environmental, totalWasteMassGrams: 15_000, projectionVersion: "v3", sourceHash: "hash-3" } }),
    ]);
    expect(corrected.totalWasteMassKg).toBe(15);
    expect(corrected.provenance[0].projectionVersion).toBe("v3");
  });

  it("does not invent unique volunteers when identities are incomplete", () => {
    const unavailable = aggregateSpogomiPartnerImpact([event({ verifiedParticipantIds: ["user-1"], participantIdentitiesReliable: false })]);
    expect(unavailable.identifiedUniqueVolunteers).toBeNull();
    expect(unavailable.uniqueVolunteerStatus).toBe("unavailable");

    const reliable = aggregateSpogomiPartnerImpact([
      event({ verifiedParticipantIds: ["user-1", "user-2"], participantIdentitiesReliable: true }),
      event({ eventId: "event-2", actionId: "action-2", verifiedParticipantIds: ["user-2", "user-3"], participantIdentitiesReliable: true }),
    ]);
    expect(reliable.identifiedUniqueVolunteers).toBe(3);
    expect(reliable.uniqueVolunteerStatus).toBe("reliable");
  });
});
