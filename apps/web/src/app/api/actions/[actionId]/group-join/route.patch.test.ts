import { beforeEach, describe, expect, it } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import {
  createGroupJoinAction,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
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
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: false }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      groupJoinEnabled?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.groupJoinEnabled).toBe(false);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
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

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: true }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      groupJoinEnabled?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.groupJoinEnabled).toBe(true);
  }, 15000);

  it("lets an admin close an older group form even without organizer rows", async () => {
    authMock.mockResolvedValueOnce({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "admin" });
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

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-old/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: false }),
      }),
      { params: Promise.resolve({ actionId: "action-old" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      groupJoinEnabled?: boolean;
    };

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
    });
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user_123",
          groupJoinEnabled: false,
        }),
      }),
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: true }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

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
    });
    getSupabaseServerClientMock.mockReturnValueOnce(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({ id: "other-action" }),
      }),
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/missing-action/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: true }),
      }),
      { params: Promise.resolve({ actionId: "missing-action" }) },
    );

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

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: false }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

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

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: false }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    expect(response.status).toBe(403);
  }, 15000);

  it("rejects updates on pending actions", async () => {
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

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-2/group-join", {
        method: "PATCH",
        body: JSON.stringify({ groupJoinEnabled: false }),
      }),
      { params: Promise.resolve({ actionId: "action-2" }) },
    );

    expect(response.status).toBe(422);
  }, 15000);
});
