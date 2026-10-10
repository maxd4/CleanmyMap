import { beforeEach, describe, expect, it } from "vitest";
import { patchAction } from "@/__tests__/support/action-route-helpers";
import { appendActionModerationAuditMock, getCurrentUserIdentityMock, loadActionByIdMock, loadActionOrganizerIdsForActionMock, loadManualInvitationStatusesForActionMock, loadManualRegistrationIdsForActionMock, recordRepollutionPredictionEvaluationForActionMock, syncActionManualParticipantsMock, syncActionOrganizersMock, updateMock, resetPatchRouteMocks } from "./route.test.harness";

describe("PATCH /api/actions/:actionId — participants et organisateurs", () => {
  beforeEach(() => {
    resetPatchRouteMocks();
  });

  it("returns manual participants with the action editor payload", async () => {
    const { GET } = await import("./route");
    loadManualInvitationStatusesForActionMock.mockResolvedValueOnce([
      { userId: "user-manual-1", status: "pending" },
      { userId: "user-refused", status: "rejected" },
    ]);

    const response = await GET(new Request("http://localhost/api/actions/action-test-1"), {
      params: Promise.resolve({ actionId: "action-test-1" }),
    });

    const body = (await response.json()) as {
      action?: { organizerAccounts?: string[]; participantAccounts?: string[]; manualInvitationStatuses?: unknown[] };
    };

    expect(response.status).toBe(200);
    expect(body.action?.organizerAccounts).toEqual([]);
    expect(body.action?.participantAccounts).toEqual(["user-manual-1"]);
    expect(body.action?.manualInvitationStatuses).toEqual([
      { userId: "user-manual-1", status: "pending" },
      { userId: "user-refused", status: "rejected" },
    ]);
    expect(loadManualRegistrationIdsForActionMock).toHaveBeenCalledWith(
      expect.anything(),
      "action-test-1",
    );
    expect(loadManualInvitationStatusesForActionMock).toHaveBeenCalledWith(
      expect.anything(),
      "action-test-1",
    );
  }, 15000);

  it("keeps an admin user's own final declaration in normal moderation", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-test-1",
      role: "admin",
      activeRole: "admin",
    });
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      preparation_data: {
        administrativeRequirements: {
          status: "validated",
          validatedAt: "2026-09-15T10:00:00.000Z",
          validatedByUserId: "validator-1",
        },
      },
      created_by_clerk_id: "user-test-1",
      notes: null,
    });

    const response = await patchAction({ actionPhase: "post_action_complete" });

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action_phase: "post_action_complete",
        status: "pending",
      }),
    );
    expect(recordRepollutionPredictionEvaluationForActionMock).not.toHaveBeenCalled();
  });

  it("transmits associated organizers when an authorized action is resumed", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({
          organizerAccounts: ["user-associated-1", "user-associated-2"],
        }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(syncActionOrganizersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: "action-test-1",
        organizerAccounts: ["user-associated-1", "user-associated-2"],
      }),
    );
  });

  it("returns unresolved participant accounts as a validation error before the mutation is accepted", async () => {
    syncActionManualParticipantsMock.mockResolvedValueOnce({
      participants: [],
      unresolvedTokens: ["missing-user"],
    });
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ participantAccounts: ["missing-user"] }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(400);
    expect(syncActionManualParticipantsMock).toHaveBeenCalled();
  });

  it("keeps an admin user's finalization of another action pending", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-test-1",
      role: "admin",
      activeRole: "admin",
    });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      preparation_data: {
        administrativeRequirements: {
          status: "validated",
          validatedAt: "2026-09-15T10:00:00.000Z",
          validatedByUserId: "validator-1",
        },
      },
      created_by_clerk_id: "user-test-2",
      notes: null,
    });

    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ actionPhase: "post_action_complete" }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action_phase: "post_action_complete",
        status: "pending",
      }),
    );
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-test-1",
        targetActionId: "action-test-1",
        operation: "edit_action",
        outcome: "success",
      }),
    );
  });

  it("lets an organizer edit the action even when they are not the creator", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      role: "benevole",
      activeRole: "benevole",
    });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce(["user-test-2"]);
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      notes: null,
    });

    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ locationLabel: "Nouveau lieu" }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });
});
