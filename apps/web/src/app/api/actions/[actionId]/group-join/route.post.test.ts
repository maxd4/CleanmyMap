import { beforeEach, describe, expect, it } from "vitest";
import {
  createGroupJoinAction,
  createGroupJoinParticipant,
  createGroupJoinProfile,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  seedGroupJoinTestDefaults,
} from "./route.test.helpers";

const {
  authMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  appendActionModerationAuditMock,
  refreshProgressionProfileMock,
} = groupJoinMocks;

describe("POST /api/actions/:actionId/group-join admin moderation", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "elu-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "elu" });
    refreshProgressionProfileMock.mockResolvedValue(undefined);
    appendActionModerationAuditMock.mockResolvedValue(undefined);
  });

  it("adds a participant directly from search", async () => {
    const participants: Array<{
      id: string;
      created_at: string;
      updated_at?: string;
      action_id: string;
      user_id: string;
      joined_at?: string;
      participation_status?: "pending" | "confirmed" | "cancelled";
      participation_source?: "group_form" | "admin" | "import";
    }> = [];
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
    expect(body.participationSource).toBe("admin");
    expect(body.participantsCount).toBe(1);
    expect(participants[0]?.user_id).toBe("user-2");
    expect(participants[0]?.participation_status).toBe("confirmed");
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "elu-1",
        targetActionId: "action-1",
        operation: "admin_add_participant",
        outcome: "success",
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
        actorUserId: "elu-1",
        targetActionId: "action-1",
        operation: "admin_review_reject",
        outcome: "success",
      }),
    );
  }, 15000);
});

describe("POST /api/actions/:actionId/group-join", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "admin" });
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
});
