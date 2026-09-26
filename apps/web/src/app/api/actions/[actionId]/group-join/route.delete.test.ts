import { beforeEach, describe, expect, it } from "vitest";
import {
  createGroupJoinAction,
  createGroupJoinParticipant,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  invokeGroupJoinRoute,
  invokeGroupJoinRouteJson,
  seedGroupJoinTestDefaults,
} from "./route.test.helpers";

const {
  authMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  refreshProgressionProfileMock,
} = groupJoinMocks;

function seedDeleteParticipants(
  statuses: Array<"pending" | "confirmed">,
): ReturnType<typeof createGroupJoinParticipant>[] {
  const participants = statuses.map((participationStatus, index) =>
    createGroupJoinParticipant({
      id: `participant-${index + 1}`,
      created_at: `2026-06-0${index + 1}T10:00:00Z`,
      joined_at: `2026-06-0${index + 1}T10:00:00Z`,
      updated_at: `2026-06-0${index + 3}T10:00:00Z`,
      participation_status: participationStatus,
      participation_source: "group_form",
      action_id: "action-1",
      user_id: `user-${index + 1}`,
    }),
  );
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
  return participants;
}

async function deleteAndReadResponse() {
  return invokeGroupJoinRouteJson<{
    alreadyCancelled?: boolean;
    participationStatus?: string;
    participantsCount?: number;
  }>("DELETE");
}

function expectSuccessfulDelete(
  response: Response,
  body: Awaited<ReturnType<typeof deleteAndReadResponse>>["body"],
  participantsCount: number,
) {
  expect(response.status).toBe(200);
  expect(body.alreadyCancelled).toBe(false);
  expect(body.participationStatus).toBe("cancelled");
  expect(body.participantsCount).toBe(participantsCount);
}

describe("DELETE /api/actions/:actionId/group-join", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it("rejects anonymous requests", async () => {
    authMock.mockResolvedValueOnce({ userId: null });

    const response = await invokeGroupJoinRoute("DELETE");

    expect(response.status).toBe(401);
  }, 15000);

  it("rejects an empty action id before cancelling participation", async () => {
    const response = await invokeGroupJoinRoute("DELETE", {
      requestActionId: "",
      paramsActionId: "  ",
    });

    expect(response.status).toBe(422);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  }, 15000);

  it("returns a server error when the cancellation client cannot be created", async () => {
    getSupabaseServerClientMock.mockImplementationOnce(() => {
      throw new Error("client unavailable");
    });

    const response = await invokeGroupJoinRoute("DELETE");

    expect(response.status).toBe(500);
  }, 15000);

  it("cancels a pending request without changing confirmed counts", async () => {
    const participants = seedDeleteParticipants(["pending"]);

    const { response, body } = await deleteAndReadResponse();
    expectSuccessfulDelete(response, body, 0);
    expect(participants[0]?.participation_status).toBe("cancelled");
    expect(refreshProgressionProfileMock).toHaveBeenCalledWith(expect.anything(), "user-1");
  }, 15000);

  it("lets a participant leave an accepted form", async () => {
    const participants = seedDeleteParticipants(["confirmed", "confirmed"]);

    const { response, body } = await deleteAndReadResponse();
    expectSuccessfulDelete(response, body, 1);
    expect(participants[0]?.participation_status).toBe("cancelled");
    expect(participants[1]?.participation_status).toBe("confirmed");
  }, 15000);
});
