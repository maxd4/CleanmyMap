import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionModerationAuditMock, getCurrentUserIdentityMock, loadActionByIdMock, loadActionOrganizerIdsForActionMock, syncActionManualParticipantsMock, updateMock, resetPatchRouteMocks } from "./route.test.harness";

describe("PATCH /api/actions/:actionId — audit et échecs partiels", () => {
  beforeEach(() => {
    resetPatchRouteMocks();
  });

  it("audits an admin action update failure with partialMutation false", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "admin", activeRole: "admin" });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      preparation_data: {},
      created_by_clerk_id: "user-test-2",
      actor_name: "Nom interne",
      location_label: "Lieu interne",
      latitude: null,
      longitude: null,
      waste_kg: 1,
      cigarette_butts: 0,
      volunteers_count: 1,
      duration_minutes: 30,
      notes: null,
    });
    updateMock.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "raw database detail" },
          }),
        }),
      }),
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ locationLabel: "Nouveau lieu" }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(500);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        targetUserId: "user-test-2",
        details: { stage: "action_update", partialMutation: false },
      }),
    );
    expect(JSON.stringify(appendActionModerationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "raw database detail",
    );
  });

  it("audits participant sync failures after the action update with partialMutation true", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "admin", activeRole: "admin" });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      preparation_data: {},
      created_by_clerk_id: "user-test-2",
      actor_name: "Nom interne",
      location_label: "Lieu interne",
      latitude: null,
      longitude: null,
      waste_kg: 1,
      cigarette_butts: 0,
      volunteers_count: 1,
      duration_minutes: 30,
      notes: null,
    });
    syncActionManualParticipantsMock.mockRejectedValueOnce(
      new Error("raw participant sync detail"),
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({
          locationLabel: "Nouveau lieu",
          participantAccounts: ["participant-2"],
        }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(500);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        targetUserId: "user-test-2",
        details: { stage: "participant_sync", partialMutation: true },
      }),
    );
    expect(JSON.stringify(appendActionModerationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "raw participant sync detail",
    );
  });

});
