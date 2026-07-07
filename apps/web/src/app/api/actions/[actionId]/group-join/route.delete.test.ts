import { beforeEach, describe, expect, it } from "vitest";
import {
  createGroupJoinAction,
  createGroupJoinParticipant,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  seedGroupJoinTestDefaults,
} from "./route.test.helpers";

const {
  authMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  refreshProgressionProfileMock,
} = groupJoinMocks;

describe("DELETE /api/actions/:actionId/group-join", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it("rejects anonymous requests", async () => {
    authMock.mockResolvedValueOnce({ userId: null });

    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost/api/actions/action-1/group-join"), {
      params: Promise.resolve({ actionId: "action-1" }),
    });

    expect(response.status).toBe(401);
  }, 15000);

  it("cancels a pending request without changing confirmed counts", async () => {
    const participants = [
      createGroupJoinParticipant({
        id: "participant-1",
        created_at: "2026-06-01T10:00:00Z",
        joined_at: "2026-06-01T10:00:00Z",
        updated_at: "2026-06-03T10:00:00Z",
        participation_status: "pending",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-1",
      }),
    ];
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants,
      }),
    );

    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost/api/actions/action-1/group-join"), {
      params: Promise.resolve({ actionId: "action-1" }),
    });

    const body = (await response.json()) as {
      alreadyCancelled?: boolean;
      participationStatus?: string;
      participantsCount?: number;
    };

    expect(response.status).toBe(200);
    expect(body.alreadyCancelled).toBe(false);
    expect(body.participationStatus).toBe("cancelled");
    expect(body.participantsCount).toBe(0);
    expect(participants[0]?.participation_status).toBe("cancelled");
    expect(refreshProgressionProfileMock).toHaveBeenCalledWith(expect.anything(), "user-1");
  }, 15000);

  it("lets a participant leave an accepted form", async () => {
    const participants = [
      createGroupJoinParticipant({
        id: "participant-1",
        created_at: "2026-06-01T10:00:00Z",
        joined_at: "2026-06-01T10:00:00Z",
        updated_at: "2026-06-03T10:00:00Z",
        participation_status: "confirmed",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-1",
      }),
      createGroupJoinParticipant({
        id: "participant-2",
        created_at: "2026-06-02T10:00:00Z",
        joined_at: "2026-06-02T10:00:00Z",
        updated_at: "2026-06-04T10:00:00Z",
        participation_status: "confirmed",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-2",
      }),
    ];
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants,
      }),
    );

    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost/api/actions/action-1/group-join"), {
      params: Promise.resolve({ actionId: "action-1" }),
    });

    const body = (await response.json()) as {
      alreadyCancelled?: boolean;
      participationStatus?: string;
      participantsCount?: number;
    };

    expect(response.status).toBe(200);
    expect(body.alreadyCancelled).toBe(false);
    expect(body.participationStatus).toBe("cancelled");
    expect(body.participantsCount).toBe(1);
    expect(participants[0]?.participation_status).toBe("cancelled");
    expect(participants[1]?.participation_status).toBe("confirmed");
  }, 15000);
});
