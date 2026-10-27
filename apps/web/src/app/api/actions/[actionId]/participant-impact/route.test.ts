import { beforeEach, describe, expect, it } from "vitest";
import {
  createGroupJoinAction,
  createGroupJoinParticipant,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  seedGroupJoinTestDefaults,
} from "@/__tests__/support/group-join-action-id-route";

const {
  authMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  loadActionOrganizerIdsForActionMock,
  appendActionModerationAuditMock,
} = groupJoinMocks;

async function patchParticipantImpact(payload: Record<string, unknown>, rawBody?: string, actionId = "action-1") {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request(`http://localhost/api/actions/${actionId}/participant-impact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: rawBody ?? JSON.stringify(payload),
    }),
    { params: Promise.resolve({ actionId }) },
  );
}

function createParticipantWithStatus(participation_status: "pending" | "confirmed") {
  return createGroupJoinParticipant({
    id: "participant-1",
    action_id: "action-1",
    user_id: "participant-user",
    created_at: "2026-09-26T10:00:00.000Z",
    participation_status,
  });
}

function configureParticipantImpactSupabase(
  participants: ReturnType<typeof createGroupJoinParticipant>[],
  createdByClerkId?: string,
) {
  getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
    action: createGroupJoinAction({
      ...(createdByClerkId ? { createdByClerkId } : {}),
      status: "approved",
    }),
    participants,
  }));
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
    const participants = [createParticipantWithStatus("pending")];
    configureParticipantImpactSupabase(participants);

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
    const participants = [createParticipantWithStatus("confirmed")];
    configureParticipantImpactSupabase(participants, "organizer-1");

    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });

    expect(response.status).toBe(403);
    expect(participants[0]).not.toHaveProperty("individual_waste_kg");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated, malformed and empty measurement payloads before persistence", async () => {
    authMock.mockResolvedValueOnce({ userId: null });
    const unauthenticated = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });
    expect(unauthenticated.status).toBe(401);

    authMock.mockResolvedValue({ userId: "user-1" });
    const malformedJson = await patchParticipantImpact({}, "{");
    expect(malformedJson.status).toBe(400);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    const empty = await patchParticipantImpact({ participantId: "participant-1" });
    expect(empty.status).toBe(422);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing action", { action: createGroupJoinAction({ status: "pending" }), participants: [] }, 404],
    ["missing participant", { action: createGroupJoinAction({ status: "approved" }), participants: [] }, 404],
  ])("refuses a %s without mutation", async (_label, fixture, status) => {
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock(fixture));
    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });
    expect(response.status).toBe(status);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("maps a persistence failure to an error response and leaves audit absent", async () => {
    const participants = [createParticipantWithStatus("confirmed")];
    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved", actionPhase: "post_action_complete" }),
      participants,
      errors: { participantUpdate: "write failed" },
    }));
    const response = await patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    });
    expect(response.status).toBe(500);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("rejects an empty action identifier and preserves an existing measurement when only one measure changes", async () => {
    await expect(patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    }, undefined, "   ")).resolves.toMatchObject({ status: 422 });
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();

    const participant = Object.assign(createParticipantWithStatus("confirmed"), {
      individual_waste_kg: 8,
      individual_waste_condition: "humide",
      individual_waste_measurement_method: "balance_au_sol",
      individual_cigarette_butts_count: 4,
      individual_cigarette_butts_mass_kg: null,
      individual_cigarette_butts_condition: "propre",
    });
    configureParticipantImpactSupabase([participant]);
    const response = await patchParticipantImpact({ participantId: "participant-1", waste: null });
    expect(response.status).toBe(200);
    expect(participant).toMatchObject({
      individual_waste_kg: null,
      individual_cigarette_butts_count: 4,
      individual_cigarette_butts_condition: "propre",
    });
  });

  it("maps action and participant lookup dependency failures without auditing", async () => {
    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved" }),
      errors: { actionLookup: "action lookup failed" },
    }));
    await expect(patchParticipantImpact({
      participantId: "participant-1",
      waste: { kg: 1, condition: "sec", measurementMethod: "balance_au_sol" },
    })).resolves.toMatchObject({ status: 500 });

    getSupabaseServerClientMock.mockReturnValue(createGroupJoinSupabaseMock({
      action: createGroupJoinAction({ status: "approved" }),
      participants: [createParticipantWithStatus("confirmed")],
      errors: { participantLookup: "participant lookup failed" },
    }));
    await expect(patchParticipantImpact({
      participantId: "participant-1",
      butts: { count: 1, condition: "propre" },
    })).resolves.toMatchObject({ status: 500 });
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });
});
