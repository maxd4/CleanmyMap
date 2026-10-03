import { describe, expect, it } from "vitest";
import { serializeCommunityEventDescription, defaultCommunityEventOps } from "./event-ops";
import { toCommunityEventItem, type CommunityEventProjectionRow } from "./event-item";

const event: CommunityEventProjectionRow = {
  id: "event-1",
  created_at: "2026-09-10T08:00:00.000Z",
  organizer_clerk_id: "organizer-1",
  title: "Collecte publique",
  event_date: "2026-09-10",
  location_label: "Paris",
  latitude: null,
  longitude: null,
  location_source: null,
  description: "Description publique",
};

const organizer = {
  userId: null,
  displayName: "Organisateur",
  roleBadge: { id: "role_benevole", label: "Bénévole", icon: "RBV" },
  profileBadge: { id: "profile_benevole", label: "Profil bénévole", icon: "PBV" },
};

describe("toCommunityEventItem", () => {
  it("projects an event without encoded Ops and preserves nullable location", () => {
    const item = toCommunityEventItem(event, null, { canEditOwnOps: false });

    expect(item).toMatchObject({
      id: "event-1",
      description: "Description publique",
      organizerClerkId: "organizer-1",
      canEditOwnOps: false,
      location: {
        label: "Paris",
        latitude: null,
        longitude: null,
        source: null,
      },
      capacityTarget: null,
      attendanceCount: null,
      postMortem: null,
      cleanupObjective: null,
      cleanupZone: null,
      cleanupLogisticsNeeds: null,
      cleanupSupportLevel: null,
      cleanupWasteTypesExpected: [],
      rsvpCounts: { yes: 0, maybe: 0, no: 0, total: 0 },
      myRsvpStatus: null,
    });
    expect(item.organizer).toBeUndefined();
  });

  it("projects every encoded Ops field and the user's RSVP status", () => {
    const item = toCommunityEventItem(
      {
        ...event,
        description: serializeCommunityEventDescription("Description publique", {
          ...defaultCommunityEventOps(),
          capacityTarget: 40,
          attendanceCount: 17,
          postMortem: "Retour suffisamment détaillé",
          cleanupObjective: "Nettoyer le quai",
          cleanupZone: "Quai de Seine",
          cleanupLogisticsNeeds: "Gants et sacs",
          cleanupSupportLevel: "fort",
          cleanupWasteTypesExpected: ["plastique", "verre"],
        }),
      },
      {
        eventId: "event-1",
        yesCount: 8,
        maybeCount: 3,
        noCount: 1,
        totalCount: 12,
        myRsvpStatus: "maybe",
      },
      { canEditOwnOps: true, organizer },
    );

    expect(item).toMatchObject({
      description: "Description publique",
      capacityTarget: 40,
      attendanceCount: 17,
      postMortem: "Retour suffisamment détaillé",
      cleanupObjective: "Nettoyer le quai",
      cleanupZone: "Quai de Seine",
      cleanupLogisticsNeeds: "Gants et sacs",
      cleanupSupportLevel: "fort",
      cleanupWasteTypesExpected: ["plastique", "verre"],
      rsvpCounts: { yes: 8, maybe: 3, no: 1, total: 12 },
      myRsvpStatus: "maybe",
      canEditOwnOps: true,
      organizer,
    });
  });

  it.each([true, false])("keeps canEditOwnOps=%s from the consumer context", (canEditOwnOps) => {
    expect(toCommunityEventItem(event, null, { canEditOwnOps }).canEditOwnOps).toBe(canEditOwnOps);
  });

  it("allows an anonymous report context to force a null RSVP status", () => {
    const item = toCommunityEventItem(
      event,
      {
        eventId: "event-1",
        yesCount: 1,
        maybeCount: 0,
        noCount: 0,
        totalCount: 1,
        myRsvpStatus: "yes",
      },
      { canEditOwnOps: false, myRsvpStatus: null },
    );

    expect(item.myRsvpStatus).toBeNull();
  });
});
