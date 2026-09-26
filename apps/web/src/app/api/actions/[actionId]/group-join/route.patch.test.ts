import { beforeEach, describe, expect, it } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import {
  createGroupJoinAction,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  invokeGroupJoinRoute,
  invokeGroupJoinRouteJson,
  seedGroupJoinTestDefaults,
} from "./route.test.helpers";

const {
  authMock,
  appendActionModerationAuditMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  loadActionOrganizerIdsForActionMock,
} = groupJoinMocks;

describe("PATCH /api/actions/:actionId/group-join", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    appendActionModerationAuditMock.mockResolvedValue(undefined);
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: true,
        }),
      }),
    );
  });

  it("lets the organizer close the group form after publication", async () => {
    const { response, body } = await invokeGroupJoinRouteJson<{
      status?: string;
      groupJoinEnabled?: boolean;
    }>("PATCH", {
      body: { groupJoinEnabled: false },
    });

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.groupJoinEnabled).toBe(false);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  }, 15000);

  it("rejects an unauthenticated toggle", async () => {
    authMock.mockResolvedValueOnce({ userId: null });

    const response = await invokeGroupJoinRoute("PATCH", {
      body: { groupJoinEnabled: false },
    });

    expect(response.status).toBe(401);
  }, 15000);

  it("lets the organizer reopen the group form", async () => {
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: false,
        }),
      }),
    );

    const { response, body } = await invokeGroupJoinRouteJson<{
      status?: string;
      groupJoinEnabled?: boolean;
    }>("PATCH", {
      body: { groupJoinEnabled: true },
    });

    expect(response.status).toBe(200);
    expect(body.groupJoinEnabled).toBe(true);
  }, 15000);

  it("lets an admin close an older group form even without organizer rows", async () => {
    authMock.mockResolvedValueOnce({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "admin", activeRole: "admin" });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          id: "action-old",
          createdByClerkId: "system:google_sheet_sync",
          status: "approved",
          notes: appendActionMetadataToNotes("Historique", {
            groupJoinEnabled: true,
          }),
        }),
      }),
    );

    const { response, body } = await invokeGroupJoinRouteJson<{
      status?: string;
      groupJoinEnabled?: boolean;
    }>("PATCH", {
      requestActionId: "action-old",
      body: { groupJoinEnabled: false },
    });

    expect(response.status).toBe(200);
    expect(body.groupJoinEnabled).toBe(false);
    expect(loadActionOrganizerIdsForActionMock).not.toHaveBeenCalled();
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        targetActionId: "action-old",
        operation: "toggle_group_join",
        outcome: "success",
        previousValue: { groupJoinEnabled: true },
        newValue: { groupJoinEnabled: false },
      }),
    );
    expect(appendActionModerationAuditMock.mock.calls[0]?.[0]).not.toHaveProperty(
      "targetUserId",
    );
  }, 15000);

  it("audits an admin toggle with the canonical target and before/after values", async () => {
    authMock.mockResolvedValueOnce({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "admin-1",
      role: "admin",
      activeRole: "admin",
    });
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user_123",
          groupJoinEnabled: false,
        }),
      }),
    );

    const response = await invokeGroupJoinRoute("PATCH", {
      body: { groupJoinEnabled: true },
    });

    expect(response.status).toBe(200);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "toggle_group_join",
        outcome: "success",
        targetUserId: "user_123",
        previousValue: { groupJoinEnabled: false },
        newValue: { groupJoinEnabled: true },
      }),
    );
  }, 15000);

  it("audits an admin not-found toggle without sensitive details", async () => {
    authMock.mockResolvedValueOnce({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "admin-1",
      role: "admin",
      activeRole: "admin",
    });
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({ id: "other-action" }),
      }),
    );

    const response = await invokeGroupJoinRoute("PATCH", {
      requestActionId: "missing-action",
      body: { groupJoinEnabled: true },
    });

    expect(response.status).toBe(404);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "toggle_group_join",
        outcome: "error",
        details: { stage: "lookup", partialMutation: false },
      }),
    );
    expect(JSON.stringify(appendActionModerationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "notes",
    );
  }, 15000);

  it("audits an admin toggle update error once", async () => {
    authMock.mockResolvedValueOnce({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "admin-1",
      role: "admin",
      activeRole: "admin",
    });
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user_123",
          groupJoinEnabled: true,
        }),
        errors: { actionUpdate: "vendor database detail" },
      }),
    );

    const response = await invokeGroupJoinRoute("PATCH", {
      body: { groupJoinEnabled: false },
    });

    expect(response.status).toBe(500);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        targetUserId: "user_123",
        details: { stage: "update", partialMutation: false },
      }),
    );
    expect(JSON.stringify(appendActionModerationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "vendor database detail",
    );
  }, 15000);

  it("rejects users that are not organizers", async () => {
    authMock.mockResolvedValueOnce({ userId: "user-3" });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce(["user-2"]);

    const response = await invokeGroupJoinRoute("PATCH", {
      body: { groupJoinEnabled: false },
    });

    expect(response.status).toBe(403);
  }, 15000);

  it("allows the organizer to update a pending pre-action", async () => {
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          id: "action-2",
          createdByClerkId: "user-1",
          status: "pending",
          groupJoinEnabled: true,
        }),
      }),
    );

    const { response, body } = await invokeGroupJoinRouteJson<{
      status?: string;
      groupJoinEnabled?: boolean;
    }>("PATCH", {
      requestActionId: "action-2",
      body: { groupJoinEnabled: false },
    });

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.groupJoinEnabled).toBe(false);
  }, 15000);

  it("returns a validation response for malformed JSON", async () => {
    const response = await invokeGroupJoinRoute("PATCH", {
      body: "not-json",
    });

    expect(response.status).toBe(400);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  }, 15000);

  it("rejects toggles for cancelled actions", async () => {
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "cancelled",
          groupJoinEnabled: true,
        }),
      }),
    );

    const response = await invokeGroupJoinRoute("PATCH", {
      body: { groupJoinEnabled: false },
    });

    expect(response.status).toBe(422);
  }, 15000);

  it("records no second audit when the first toggle audit fails", async () => {
    authMock.mockResolvedValueOnce({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "admin-1",
      role: "admin",
      activeRole: "admin",
    });
    appendActionModerationAuditMock.mockRejectedValueOnce(new Error("audit unavailable"));
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-owner",
          groupJoinEnabled: true,
        }),
      }),
    );

    const response = await invokeGroupJoinRoute("PATCH", {
      body: { groupJoinEnabled: false },
    });

    expect(response.status).toBe(500);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
  }, 15000);

  it("audits a lookup failure when the server client cannot be created", async () => {
    authMock.mockResolvedValueOnce({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "admin-1",
      role: "admin",
      activeRole: "admin",
    });
    getSupabaseServerClientMock.mockImplementationOnce(() => {
      throw new Error("client unavailable");
    });

    const response = await invokeGroupJoinRoute("PATCH", {
      body: { groupJoinEnabled: false },
    });

    expect(response.status).toBe(500);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        details: { stage: "lookup", partialMutation: false },
      }),
    );
  }, 15000);
});
