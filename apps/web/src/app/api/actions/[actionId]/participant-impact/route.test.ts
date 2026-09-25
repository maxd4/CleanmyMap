import { beforeEach, describe, expect, it } from "vitest";
import {
  createGroupJoinAction,
  createGroupJoinParticipant,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  seedGroupJoinTestDefaults,
} from "../group-join/route.test.helpers";

const {
  authMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  loadActionOrganizerIdsForActionMock,
  appendActionModerationAuditMock,
} = groupJoinMocks;

async function patchParticipantImpact(payload: Record<string, unknown>) {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request("http://localhost/api/actions/action-1/participant-impact", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ actionId: "action-1" }) },
  );
}

describe("PATCH /api/actions/:actionId/participant-impact", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    appendActionModerationAuditMock.mockResolvedValue(undefined);
  });

  it("allows the action organizer, preserves raw values and audits the change", async () => {
    const participants = [createGroupJoinParticipant({
      id: "participant-1",
      action_id: "action-1",
      user_id: "participant-user",
      created_at: "2026-09-26T10:00:00.000Z",
      participation_status: "confirmed",
    })];
    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ createdByClerkId: "user-1", status: "approved", actionPhase: "post_action_complete" }),
      participants,
    }));

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 10, condition: "humide", measurementMethod: "balance_au_sol" },
      butts: { count: 7, massKg: 1, condition: "propre" },
      reason: "Pesée vérifiée sur place.",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.individualImpact).toMatchObject({
      wasteKg: 10,
      wasteCondition: "humide",
      cigaretteButtsCount: 7,
      cigaretteButtsMassKg: 1,
      cigaretteButtsProvenance: "counted",
      equivalentSecKg: 7,
    });
    expect(participants[0]).toMatchObject({
      individual_waste_kg: 10,
      individual_waste_condition: "humide",
      individual_cigarette_butts_count: 7,
      individual_cigarette_butts_mass_kg: 1,
      individual_cigarette_butts_provenance: "counted",
      individual_impact_measured_by: "user-1",
    });
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "user-1",
      targetActionId: "action-1",
      targetUserId: "participant-user",
      operation: "record_individual_impact_measurement",
      reason: "Pesée vérifiée sur place.",
      previousValue: null,
    }));
  });

  it("allows an administrator and refuses a non-confirmed participant", async () => {
    authMock.mockResolvedValue({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "admin-1", role: "admin", activeRole: "admin" });
    loadActionOrganizerIdsForActionMock.mockResolvedValue([]);
    const participants = [createGroupJoinParticipant({
      id: "participant-1",
      action_id: "action-1",
      user_id: "participant-user",
      created_at: "2026-09-26T10:00:00.000Z",
      participation_status: "pending",
    })];
    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved" }),
      participants,
    }));

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(422);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("denies an ordinary participant before mutation", async () => {
    authMock.mockResolvedValue({ userId: "participant-user" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "participant-user", role: "benevole", activeRole: "benevole" });
    loadActionOrganizerIdsForActionMock.mockResolvedValue([]);
    const participants = [createGroupJoinParticipant({
      id: "participant-1",
      action_id: "action-1",
      user_id: "participant-user",
      created_at: "2026-09-26T10:00:00.000Z",
      participation_status: "confirmed",
    })];
    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ createdByClerkId: "organizer-1", status: "approved" }),
      participants,
    }));

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(403);
    expect(participants[0]).not.toHaveProperty("individual_waste_kg");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });
});
