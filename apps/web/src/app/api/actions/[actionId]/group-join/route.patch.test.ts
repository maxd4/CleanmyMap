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
      }),
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
