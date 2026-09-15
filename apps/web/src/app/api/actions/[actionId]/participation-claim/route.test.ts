import { beforeEach, describe, expect, it } from "vitest";
import {
  createGroupJoinAction,
  createGroupJoinParticipant,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  seedGroupJoinTestDefaults,
} from "../group-join/route.test.helpers";

const {
  getSupabaseServerClientMock,
  appendActionModerationAuditMock,
  authMock,
} = groupJoinMocks;

describe("POST /api/actions/:actionId/participation-claim", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-2" });
    appendActionModerationAuditMock.mockResolvedValue(undefined);
  });

  it("creates one pending post-action claim and replays it idempotently", async () => {
    const participants: Parameters<typeof createGroupJoinSupabaseMock>[0]["participants"] = [];
    const registrations = [
      createGroupJoinParticipant({
        action_id: "action-1",
        user_id: "user-2",
        created_at: "2026-09-12T09:00:00.000Z",
        registered_at: "2026-09-12T09:00:00.000Z",
        registration_status: "confirmed",
        registration_source: "group_form",
      }),
    ];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          actionPhase: "post_action_complete",
          actionDate: "2026-09-13",
        }),
        participants,
        registrations,
      }),
    );

    const { POST } = await import("./route");
    const context = { params: Promise.resolve({ actionId: "action-1" }) };
    const firstResponse = await POST(
      new Request("http://localhost/api/actions/action-1/participation-claim", {
        method: "POST",
      }),
      context,
    );
    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody).toMatchObject({
      status: "ok",
      participationStatus: "pending",
      participationSource: "post_action_claim",
      alreadyRequested: false,
    });
    expect(participants).toHaveLength(1);
    expect(registrations).toHaveLength(1);
    expect(registrations[0]).toMatchObject({
      user_id: "user-2",
      registration_status: "confirmed",
      registration_source: "group_form",
    });
    expect(participants[0]).toMatchObject({
      action_id: "action-1",
      user_id: "user-2",
      participation_status: "pending",
      participation_source: "post_action_claim",
    });

    const secondResponse = await POST(
      new Request("http://localhost/api/actions/action-1/participation-claim", {
        method: "POST",
      }),
      context,
    );
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody).toMatchObject({
      participationStatus: "pending",
      participationSource: "post_action_claim",
      alreadyRequested: true,
    });
    expect(participants).toHaveLength(1);
    expect(registrations).toHaveLength(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "post_action_claim",
        actorUserId: "user-2",
        targetActionId: "action-1",
        targetUserId: "user-2",
        previousValue: null,
        newValue: expect.objectContaining({
          participationStatus: "pending",
          participationSource: "post_action_claim",
        }),
      }),
    );
  });

  it.each([
    ["future", { actionPhase: "post_action_complete" as const, actionDate: "2099-01-01" }],
    ["pre-action", { actionPhase: "pre_action" as const, actionDate: "2026-09-13" }],
    ["hidden", { actionPhase: "post_action_complete" as const, actionDate: "2026-09-13", moderationVisibility: "hidden" as const }],
  ])("refuses an ineligible %s action without creating a participant", async (_label, action) => {
    const participants: Parameters<typeof createGroupJoinSupabaseMock>[0]["participants"] = [];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction(action),
        participants,
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/participation-claim", {
        method: "POST",
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(404);
    expect(participants).toHaveLength(0);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("keeps an earlier cancelled relation terminal", async () => {
    const participants = [
      createGroupJoinParticipant({
        action_id: "action-1",
        user_id: "user-2",
        created_at: "2026-09-12T10:00:00.000Z",
        participation_status: "cancelled",
        participation_source: "post_action_claim",
      }),
    ];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          actionPhase: "post_action_complete",
          actionDate: "2026-09-13",
        }),
        participants,
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/participation-claim", {
        method: "POST",
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(422);
    expect((await response.json()).details.actionId).toEqual([expect.any(String)]);
    expect(participants).toHaveLength(1);
    expect(participants[0]?.participation_status).toBe("cancelled");
  });

  it("requires authentication before the action lookup", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/action-1/participation-claim", {
        method: "POST",
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
