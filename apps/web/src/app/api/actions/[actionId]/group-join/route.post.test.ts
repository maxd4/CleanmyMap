import { beforeEach, describe, expect, it } from "vitest";
import { createGroupJoinAction, createGroupJoinParticipant, createGroupJoinProfile, createGroupJoinSupabaseMock, groupJoinMocks, seedGroupJoinTestDefaults, type GroupJoinParticipantRow } from "./route.test.helpers";
const { authMock, getCurrentUserIdentityMock, getSupabaseServerClientMock, appendActionModerationAuditMock, rebuildUserGamificationBadgesMock, refreshProgressionProfileMock } = groupJoinMocks;

async function postActionGroupJoin(payload: Record<string, unknown>) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/actions/action-1/group-join", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ actionId: "action-1" }) },
  );
}

function seedApprovedActionParticipants(): GroupJoinParticipantRow[] {
  const participants: GroupJoinParticipantRow[] = [];
  getSupabaseServerClientMock.mockReturnValue(
    createGroupJoinSupabaseMock({
      action: createGroupJoinAction({
        createdByClerkId: "user-owner",
        status: "approved",
        groupJoinEnabled: true,
      }),
      participants,
    }),
  );
  return participants;
}
describe("POST /api/actions/:actionId/group-join admin moderation", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "admin", activeRole: "admin" });
    refreshProgressionProfileMock.mockResolvedValue(undefined);
    appendActionModerationAuditMock.mockResolvedValue(undefined);
  });

  it("adds a participant directly from search", async () => {
    const participants: GroupJoinParticipantRow[] = [];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants,
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantUserId: "user-2",
          reason: "Ajout direct demandé par le référent.",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      participantId?: string;
      participantUserId?: string;
      participationStatus?: string;
      participationSource?: string;
      participantsCount?: number;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.participantUserId).toBe("user-2");
    expect(body.participationStatus).toBe("confirmed");
    expect(body.participationSource).toBe("admin_override");
    expect(body.participantsCount).toBe(1);
    expect(participants[0]?.user_id).toBe("user-2");
    expect(participants[0]?.participation_status).toBe("confirmed");
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        targetActionId: "action-1",
        operation: "admin_add_participant",
        outcome: "success",
        reason: "Ajout direct demandé par le référent.",
        targetUserId: "user-2",
        previousValue: null,
        newValue: expect.objectContaining({
          participationStatus: "confirmed",
          participationSource: "admin_override",
        }),
      }),
    );
  }, 15000);

  it("rejects an elected account while ACTIVE_ROLE=elu from a global participant override", async () => {
    authMock.mockResolvedValueOnce({ userId: "elu-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "elu-1",
      role: "elu",
      activeRole: "elu",
    });
    const participants = seedApprovedActionParticipants();
    groupJoinMocks.loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantUserId: "user-2",
          reason: "Ajout élu non autorisé.",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(403);
    expect(participants).toHaveLength(0);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  }, 15000);

  it("allows an elected account with ACTIVE_ROLE=admin to use the audited participant override", async () => {
    authMock.mockResolvedValueOnce({ userId: "elu-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "elu-1",
      role: "elu",
      activeRole: "admin",
    });
    seedApprovedActionParticipants();

    const response = await postActionGroupJoin({
      participantUserId: "user-2",
      reason: "Ajout administratif justifié.",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      participationStatus: "confirmed",
      participationSource: "admin_override",
    });
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "elu-1",
        targetActionId: "action-1",
        targetUserId: "user-2",
        operation: "admin_add_participant",
        outcome: "success",
        reason: "Ajout administratif justifié.",
        previousValue: null,
        newValue: expect.objectContaining({
          participationStatus: "confirmed",
          participationSource: "admin_override",
        }),
      }),
    );
  }, 15000);

  it("excludes an accepted participant through moderation", async () => {
    const participants = [
      createGroupJoinParticipant({
        id: "participant-1",
        created_at: "2026-06-01T10:00:00Z",
        joined_at: "2026-06-01T10:00:00Z",
        participation_status: "confirmed",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-2",
      }),
    ];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants,
        profiles: [
          createGroupJoinProfile({
            id: "user-2",
            display_name: "Alice",
            handle: "alice",
          }),
        ],
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantId: "participant-1",
          decision: "reject",
          reason: "Participant indisponible confirmé.",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      participationStatus?: string;
      participantsCount?: number;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.participationStatus).toBe("cancelled");
    expect(body.participantsCount).toBe(0);
    expect(participants[0]?.participation_status).toBe("cancelled");
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        targetActionId: "action-1",
        operation: "admin_remove_participant",
        outcome: "success",
        reason: "Participant indisponible confirmé.",
        previousValue: expect.objectContaining({
          participationStatus: "confirmed",
          participationSource: "group_form",
        }),
        newValue: expect.objectContaining({
          participationStatus: "cancelled",
          participationSource: "group_form",
        }),
      }),
    );
  }, 15000);

  it("rejects admin direct participant add without a valid reason", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants: [],
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantUserId: "user-2",
          reason: "non",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(400);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "admin_add_participant",
        outcome: "error",
        details: { stage: "lookup", partialMutation: false },
      }),
    );
  }, 15000);

  it("audits a participation update error before any write", async () => {
    const participants = [
      createGroupJoinParticipant({
        id: "participant-1",
        created_at: "2026-06-01T10:00:00Z",
        participation_status: "pending",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-2",
      }),
    ];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user_123",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants,
        errors: { participantUpdate: "vendor database detail" },
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantId: "participant-1",
          decision: "accept",
          reason: "Validation administrative.",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(500);
    expect(participants[0]?.participation_status).toBe("pending");
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "admin_review_accept",
        outcome: "error",
        targetUserId: "user-2",
        details: { stage: "participation_update", partialMutation: false },
      }),
    );
    expect(JSON.stringify(appendActionModerationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "vendor database detail",
    );
  }, 15000);

  it("marks an admin add as partial when the post-update count fails", async () => {
    const participants: GroupJoinParticipantRow[] = [];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user_123",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants,
        errors: { participantCount: "vendor database detail" },
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantUserId: "user-2",
          reason: "Ajout administratif justifié.",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(500);
    expect(participants).toHaveLength(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "admin_add_participant",
        outcome: "error",
        targetUserId: "user-2",
        details: { stage: "post_update", partialMutation: true },
      }),
    );
    expect(JSON.stringify(appendActionModerationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "vendor database detail",
    );
  }, 15000);

  it("audits an admin participation not-found before any write", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({ id: "other-action" }),
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/missing-action/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantUserId: "user-2",
          reason: "Ajout administratif justifié.",
        }),
      }),
      { params: Promise.resolve({ actionId: "missing-action" }) },
    );

    expect(response.status).toBe(404);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "admin_add_participant",
        outcome: "error",
        details: { stage: "lookup", partialMutation: false },
      }),
    );
  }, 15000);
});
describe("POST /api/actions/:actionId/group-join", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "admin", activeRole: "admin" });
    refreshProgressionProfileMock.mockResolvedValue(undefined);
    appendActionModerationAuditMock.mockResolvedValue(undefined);
  });
  it("accepts a pending request", async () => {
    const participants = [
      createGroupJoinParticipant({
        id: "participant-1",
        created_at: "2026-06-01T10:00:00Z",
        joined_at: "2026-06-01T10:00:00Z",
        participation_status: "pending",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-2",
      }),
    ];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants,
        profiles: [
          createGroupJoinProfile({
            id: "user-2",
            display_name: "Alice",
            handle: "alice",
          }),
        ],
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantId: "participant-1",
          decision: "accept",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      participationStatus?: string;
      participationSource?: string;
      participantId?: string;
    };

    expect(response.status).toBe(200);
    expect(body.participantId).toBe("participant-1");
    expect(body.participationStatus).toBe("confirmed");
    expect(body.participationSource).toBe("group_form");
    expect(participants[0]?.participation_status).toBe("confirmed");
    expect(rebuildUserGamificationBadgesMock).toHaveBeenCalledWith(expect.anything(), "user-2");
    expect(refreshProgressionProfileMock).toHaveBeenCalledWith(expect.anything(), "user-2");
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        targetActionId: "action-1",
        operation: "admin_review_accept",
        outcome: "success",
      }),
    );
  }, 15000);

  it("lets an action organizer accept a pending request without admin audit", async () => {
    authMock.mockResolvedValueOnce({ userId: "organizer-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "benevole", activeRole: "benevole" });
    const participants = [
      createGroupJoinParticipant({
        id: "participant-1",
        created_at: "2026-06-01T10:00:00Z",
        joined_at: "2026-06-01T10:00:00Z",
        participation_status: "pending",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-2",
      }),
    ];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-owner",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants,
        profiles: [
          createGroupJoinProfile({
            id: "user-2",
            display_name: "Alice",
            handle: "alice",
          }),
        ],
      }),
    );
    groupJoinMocks.loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([
      "organizer-1",
    ]);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantId: "participant-1",
          decision: "accept",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      participationStatus?: string;
      participationSource?: string;
    };

    expect(response.status).toBe(200);
    expect(body.participationStatus).toBe("confirmed");
    expect(body.participationSource).toBe("group_form");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  }, 15000);

  it("lets an action organizer add a participant directly without admin audit", async () => {
    authMock.mockResolvedValueOnce({ userId: "organizer-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "benevole", activeRole: "benevole" });
    groupJoinMocks.loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([
      "organizer-1",
    ]);
    const participants: GroupJoinParticipantRow[] = [];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-owner",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants,
      }),
    );

    const response = await postActionGroupJoin({ participantUserId: "user-2" });

    const body = (await response.json()) as {
      participantUserId?: string;
      participationStatus?: string;
      participantsCount?: number;
    };

    expect(response.status).toBe(200);
    expect(body.participantUserId).toBe("user-2");
    expect(body.participationStatus).toBe("confirmed");
    expect(body.participantsCount).toBe(1);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  }, 15000);

  it("rejects users that are not organizers or admin-like moderators", async () => {
    authMock.mockResolvedValueOnce({ userId: "user-9" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "benevole", activeRole: "benevole" });
    groupJoinMocks.loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([
      "organizer-1",
    ]);
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-owner",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants: [
          createGroupJoinParticipant({
            id: "participant-1",
            created_at: "2026-06-01T10:00:00Z",
            joined_at: "2026-06-01T10:00:00Z",
            participation_status: "pending",
            participation_source: "group_form",
            action_id: "action-1",
            user_id: "user-2",
          }),
        ],
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({
          participantId: "participant-1",
          decision: "accept",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(403);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  }, 15000);
});

describe("POST /api/actions/:actionId/group-join post-action claims", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "user-1",
      role: "benevole",
      activeRole: "benevole",
    });
    appendActionModerationAuditMock.mockResolvedValue(undefined);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it.each([
    ["accept", "confirmed" as const],
    ["reject", "cancelled" as const],
  ])("lets the action owner %s a claim without changing group access", async (decision, expectedStatus) => {
    const supabase = createGroupJoinSupabaseMock({
      action: createGroupJoinAction({
        createdByClerkId: "user-1",
        actionPhase: "post_action_complete",
        actionDate: "2026-09-13",
      }),
      participants: [
        createGroupJoinParticipant({
          id: "claim-1",
          action_id: "action-1",
          user_id: "user-2",
          created_at: "2026-09-12T10:00:00.000Z",
          participation_status: "pending",
          participation_source: "post_action_claim",
        }),
      ],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "POST",
        body: JSON.stringify({ participantId: "claim-1", decision }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      participationStatus: expectedStatus,
      participationSource: "post_action_claim",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
    if (decision === "accept") {
      expect(rebuildUserGamificationBadgesMock).toHaveBeenCalledWith(expect.anything(), "user-2");
      expect(refreshProgressionProfileMock).toHaveBeenCalledWith(expect.anything(), "user-2");
    } else {
      expect(rebuildUserGamificationBadgesMock).not.toHaveBeenCalled();
      expect(refreshProgressionProfileMock).not.toHaveBeenCalled();
    }
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "post_action_claim_review",
        actorUserId: "user-1",
        targetUserId: "user-2",
        details: expect.objectContaining({ decision }),
      }),
    );
  });
});
