import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionModerationAuditMock, getCurrentUserIdentityMock, loadActionByIdMock, loadActionOrganizerIdsForActionMock, syncActionManualParticipantsMock, updateMock, resetPatchRouteMocks, hasGpxGeometryContributionMock, recordGpxGeometryContributionIfPresentMock, reconcileGeometryContributionProgressionIfNeededMock, requireAuthenticatedAccessMock } from "./route.test.harness";

function buildActionFixture() {
  return {
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
  };
}

function configureAdminAction() {
  getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "admin", activeRole: "admin" });
  loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
  requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: true, userId: "user-test-1" });
  loadActionByIdMock.mockResolvedValueOnce(buildActionFixture());
}

async function patchAction(body: Record<string, unknown>) {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request("http://localhost/api/actions/action-test-1", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ actionId: "action-test-1" }) },
  );
}

function expectAuditFailure(
  response: Response,
  stage: string,
  partialMutation: boolean,
  leakedDetail: string,
) {
  expect(response.status).toBe(500);
  expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
  expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
    expect.objectContaining({
      outcome: "error",
      targetUserId: "user-test-2",
      details: expect.objectContaining({
        stage,
        atomicity: "PARTIAL_ALLOWED",
        partialMutation,
      }),
    }),
  );
  expect(JSON.stringify(appendActionModerationAuditMock.mock.calls[0]?.[0])).not.toContain(
    leakedDetail,
  );
}

describe("PATCH /api/actions/:actionId — audit et échecs partiels", () => {
  beforeEach(() => {
    resetPatchRouteMocks();
  });

  it("audits an admin action update failure with partialMutation false", async () => {
    configureAdminAction();
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

    const response = await patchAction({ locationLabel: "Nouveau lieu" });

    expectAuditFailure(response, "action_update", false, "raw database detail");
  });

  it("audits participant sync failures after the action update with partialMutation true", async () => {
    configureAdminAction();
    syncActionManualParticipantsMock.mockRejectedValueOnce(
      new Error("raw participant sync detail"),
    );

    const response = await patchAction({
      locationLabel: "Nouveau lieu",
      participantAccounts: ["participant-2"],
    });

    expectAuditFailure(response, "participant_sync", true, "raw participant sync detail");
  });

  it("audits a persisted contribution as partial when a later post-step fails", async () => {
    configureAdminAction();
    hasGpxGeometryContributionMock.mockReturnValueOnce(true);
    recordGpxGeometryContributionIfPresentMock.mockResolvedValueOnce({ accepted: true, persisted: true });
    reconcileGeometryContributionProgressionIfNeededMock.mockRejectedValueOnce(new Error("post step"));

    const response = await patchAction({
      locationLabel: "Lieu",
      geometrySource: "gpx_import",
      derivedGeometryGeoJson: "{\"type\":\"LineString\",\"coordinates\":[[2,48],[2.1,48.1]]}",
      preparationData: { routeObservedDistanceKm: 1 },
    });

    expect(response.status).toBe(500);
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      details: expect.objectContaining({ stage: "geometry_contribution", partialMutation: true }),
    }));
  });

});
