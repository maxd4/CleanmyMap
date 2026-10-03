import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionModerationAuditMock, getCurrentUserIdentityMock, loadActionByIdMock, loadActionOrganizerIdsForActionMock, syncActionManualParticipantsMock, updateMock, resetPatchRouteMocks, hasGpxGeometryContributionMock, recordGpxGeometryContributionIfPresentMock, reconcileGeometryContributionProgressionIfNeededMock, requireAuthenticatedAccessMock } from "./route.test.harness";

describe("PATCH /api/actions/:actionId — audit et échecs partiels", () => {
  beforeEach(() => {
    resetPatchRouteMocks();
  });

  it("audits an admin action update failure with partialMutation false", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "admin", activeRole: "admin" });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: true, userId: "user-test-1" });
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
        details: expect.objectContaining({
          stage: "action_update",
          atomicity: "PARTIAL_ALLOWED",
          partialMutation: false,
        }),
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
        details: expect.objectContaining({
          stage: "participant_sync",
          atomicity: "PARTIAL_ALLOWED",
          partialMutation: true,
        }),
      }),
    );
    expect(JSON.stringify(appendActionModerationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "raw participant sync detail",
    );
  });

  it("audits a persisted contribution as partial when a later post-step fails", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "admin", activeRole: "admin" });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: true, userId: "user-test-1" });
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1", status: "pending", action_phase: "pre_action", preparation_data: {},
      created_by_clerk_id: "user-test-2", actor_name: "Nom interne", location_label: "Lieu",
      latitude: null, longitude: null, waste_kg: 1, cigarette_butts: 0, volunteers_count: 1,
      duration_minutes: 30, notes: null,
    });
    hasGpxGeometryContributionMock.mockReturnValueOnce(true);
    recordGpxGeometryContributionIfPresentMock.mockResolvedValueOnce({ accepted: true, persisted: true });
    reconcileGeometryContributionProgressionIfNeededMock.mockRejectedValueOnce(new Error("post step"));

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ locationLabel: "Lieu", geometrySource: "gpx_import", derivedGeometryGeoJson: "{\"type\":\"LineString\",\"coordinates\":[[2,48],[2.1,48.1]]}", preparationData: { routeObservedDistanceKm: 1 } }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(500);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      details: expect.objectContaining({ stage: "geometry_contribution", partialMutation: true }),
    }));
  });

});
