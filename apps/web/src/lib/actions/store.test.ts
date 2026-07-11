import { describe, expect, it } from "vitest";
import type { CreateActionPayload } from "@/lib/actions/types";
import {
  buildInitialActionParticipantRows,
  resolveActionCreationStatus,
  resolvePersistedCigaretteButts,
} from "./store";

function buildPayload(overrides: Partial<CreateActionPayload> = {}): CreateActionPayload {
  return {
    actorName: "Test",
    associationName: "Action spontanée",
    actionDate: "2026-04-22",
    locationLabel: "Test lieu",
    wasteKg: 2,
    cigaretteButts: 0,
    volunteersCount: 2,
    durationMinutes: 30,
    notes: "Test",
    ...overrides,
  };
}

describe("resolvePersistedCigaretteButts", () => {
  it("derives butts from megots weight when available", () => {
    const payload = buildPayload({
      wasteBreakdown: {
        megotsKg: 0.4,
        megotsCondition: "propre",
      },
      cigaretteButtsCount: 120,
    });

    expect(resolvePersistedCigaretteButts(payload)).toBe(1000);
  });

  it("falls back to the count slider when no megots weight is present", () => {
    const payload = buildPayload({
      wasteBreakdown: {
        megotsKg: 0,
        megotsCondition: "propre",
      },
      cigaretteButtsCount: 120,
    });

    expect(resolvePersistedCigaretteButts(payload)).toBe(120);
  });
});

describe("resolveActionCreationStatus", () => {
  it("approves admin-like submissions immediately", () => {
    expect(resolveActionCreationStatus(true)).toBe("approved");
  });

  it("keeps regular submissions pending", () => {
    expect(resolveActionCreationStatus(false)).toBe("pending");
  });
});

describe("buildInitialActionParticipantRows", () => {
  it("confirms organizers and queues the declarant when they differ", () => {
    const rows = buildInitialActionParticipantRows({
      actionId: "action-1",
      creatorUserId: "user-declarant",
      organizers: [
        {
          userId: "user-organizer",
          displayName: "Organisateur",
          handle: "orga",
          isPrimary: true,
          sourceToken: null,
        },
      ],
    });

    expect(rows).toEqual([
      expect.objectContaining({
        action_id: "action-1",
        user_id: "user-organizer",
        participation_status: "confirmed",
        participation_source: "group_form",
      }),
      expect.objectContaining({
        action_id: "action-1",
        user_id: "user-declarant",
        participation_status: "pending",
        participation_source: "group_form",
      }),
    ]);
  });

  it("keeps the declarant confirmed when they are also the organizer", () => {
    const rows = buildInitialActionParticipantRows({
      actionId: "action-2",
      creatorUserId: "user-organizer",
      organizers: [
        {
          userId: "user-organizer",
          displayName: "Organisateur",
          handle: "orga",
          isPrimary: true,
          sourceToken: null,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action_id: "action-2",
      user_id: "user-organizer",
      participation_status: "confirmed",
    });
  });

  it("adds manual participants as confirmed entries without duplicating known accounts", () => {
    const rows = buildInitialActionParticipantRows({
      actionId: "action-3",
      creatorUserId: "user-creator",
      organizers: [
        {
          userId: "user-organizer",
          displayName: "Organisateur",
          handle: "orga",
          isPrimary: true,
          sourceToken: null,
        },
      ],
      manualParticipants: [
        {
          userId: "user-organizer",
          displayName: "Organisateur",
          handle: "orga",
          sourceToken: null,
        },
        {
          userId: "user-manual-1",
          displayName: "Participant 1",
          handle: "p1",
          sourceToken: "token-1",
        },
        {
          userId: "user-creator",
          displayName: "Créateur",
          handle: "creator",
          sourceToken: null,
        },
        {
          userId: "user-manual-2",
          displayName: "Participant 2",
          handle: "p2",
          sourceToken: "token-2",
        },
        {
          userId: "user-manual-1",
          displayName: "Participant 1",
          handle: "p1",
          sourceToken: "token-1",
        },
      ],
    });

    expect(rows).toEqual([
      expect.objectContaining({
        action_id: "action-3",
        user_id: "user-organizer",
        participation_status: "confirmed",
        participation_source: "group_form",
      }),
      expect.objectContaining({
        action_id: "action-3",
        user_id: "user-creator",
        participation_status: "pending",
        participation_source: "group_form",
      }),
      expect.objectContaining({
        action_id: "action-3",
        user_id: "user-manual-1",
        participation_status: "confirmed",
        participation_source: "manual_add",
      }),
      expect.objectContaining({
        action_id: "action-3",
        user_id: "user-manual-2",
        participation_status: "confirmed",
        participation_source: "manual_add",
      }),
    ]);
  });
});
