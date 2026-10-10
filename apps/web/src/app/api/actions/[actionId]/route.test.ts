import { beforeEach, describe, expect, it } from "vitest";
import { patchAction } from "@/__tests__/support/action-route-helpers";
import { appendActionModerationAuditMock, emitActionUpdateNotificationsMock, extractActionMetadataFromNotesMock, getCurrentUserIdentityMock, loadActionByIdMock, requireAuthenticatedAccessMock, resolveActionDepartmentForPersistenceMock, syncActionOrganizersMock, updateMock, resetPatchRouteMocks } from "./route.test.harness";

describe("PATCH /api/actions/:actionId — lecture et édition normale", () => {
  beforeEach(() => {
    resetPatchRouteMocks();
  });

  it("keeps a pre-action pending until the harvest is completed", async () => {
    const response = await patchAction({ actionPhase: "pre_action" });

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action_phase: "pre_action",
        status: "pending",
      }),
    );
  });

  it("uses the revision returned by each persisted write for concurrent operational notifications", async () => {
    loadActionByIdMock.mockResolvedValue({
      id: "action-test-1",
      updated_at: "old-revision",
      status: "approved",
      action_phase: "pre_action",
      published_at: "2026-09-01T09:00:00.000Z",
      moderation_visibility: "visible",
      action_date: "2026-09-13",
      event_start_time: "09:00:00",
      location_label: "Quai de Seine",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      notes: null,
    });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "admin", activeRole: "admin" });
    let writeNumber = 0;
    updateMock.mockImplementation(() => ({
      eq: () => ({
        select: () => ({
          single: async () => ({
            data: { id: "action-test-1", updated_at: `persisted-revision-${++writeNumber}` },
            error: null,
          }),
        }),
      }),
    }));
    const { PATCH } = await import("./route");

    const requests = ["2026-09-14", "2026-09-15"].map((actionDate) =>
      PATCH(
        new Request("http://localhost/api/actions/action-test-1", {
          method: "PATCH",
          body: JSON.stringify({ actionDate, reason: "Révision opérationnelle validée." }),
        }),
        { params: Promise.resolve({ actionId: "action-test-1" }) },
      ),
    );
    const responses = await Promise.all(requests);

    expect(responses.every((response) => response.status === 200)).toBe(true);
    const eventKeys = emitActionUpdateNotificationsMock.mock.calls.map(
      ([params]) => params.eventKey,
    );
    expect(eventKeys).toEqual([
      "action_update:action-test-1:persisted-revision-1:schedule",
      "action_update:action-test-1:persisted-revision-2:schedule",
    ]);
  });

  it("does not emit an operational notification when the action write fails", async () => {
    loadActionByIdMock.mockResolvedValue({
      id: "action-test-1",
      updated_at: "old-revision",
      status: "approved",
      action_phase: "pre_action",
      published_at: "2026-09-01T09:00:00.000Z",
      moderation_visibility: "visible",
      action_date: "2026-09-13",
      event_start_time: "09:00:00",
      location_label: "Quai de Seine",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      notes: null,
    });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "admin", activeRole: "admin" });
    updateMock.mockImplementation(() => ({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { code: "PERSISTENCE_FAILURE" } }),
        }),
      }),
    }));

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ actionDate: "2026-09-14", reason: "Révision opérationnelle validée." }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(500);
    expect(emitActionUpdateNotificationsMock).not.toHaveBeenCalled();
  });

  it("allows retrospective finalization while administrative requirements are pending", async () => {
    const response = await patchAction({ actionPhase: "post_action_complete" });

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action_phase: "post_action_complete",
      }),
    );
  });

  it("rejects a forged preparation state before loading the action", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({
          preparationData: { preparationState: "action_en_cours" },
        }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(400);
    expect(loadActionByIdMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects clearing all organizers on a structured action", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ organizerAccounts: [] }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("keeps an ordinary final declaration pending moderation", async () => {
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "post_action_draft",
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
  });

  it("rejects finalizing a spontaneous action without an explicitly selected account", async () => {
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      organizer_type: "spontaneous",
      organizer_id: null,
      organizer_name: "",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      notes: null,
    });
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({
          organizerType: "spontaneous",
          organizerAccounts: [],
          organizerName: "Organisateur en attente de compte",
          actionPhase: "post_action_complete",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("does not finalize a spontaneous action when organizer persistence fails", async () => {
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      organizer_type: "spontaneous",
      organizer_id: null,
      organizer_name: "Organisateur en attente de compte",
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
    syncActionOrganizersMock.mockRejectedValueOnce(new Error("organizer RPC failed"));
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({
          organizerType: "spontaneous",
          organizerAccounts: ["user-associated-1"],
          actionPhase: "post_action_complete",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(500);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it.each([
    ["owner", "user-test-1", "benevole"],
    ["admin", "admin-1", "admin"],
  ] as const)("refuses a métier PATCH on a cancelled action for the %s", async (_label, userId, activeRole) => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: true, userId });
    getCurrentUserIdentityMock.mockResolvedValue({
      userId,
      role: activeRole,
      activeRole,
    });
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "cancelled",
      action_phase: "pre_action",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      notes: null,
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ notes: "Modification interdite" }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "state_conflict" });
    expect(updateMock).not.toHaveBeenCalled();
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("persists explicit null measurements without converting them to zero", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ wasteKg: null, cigaretteButts: null }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ waste_kg: null, cigarette_butts: null }),
    );
  });

  it("treats canonical raw PATCH input as server-authoritative and preserves explicit nulls", async () => {
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "post_action_complete",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      cigarette_butts: 3_000,
      notes: "Anciennes notes",
    });
    extractActionMetadataFromNotesMock.mockReturnValueOnce({
      cleanNotes: "Anciennes notes",
      cigaretteButtsKg: 1.2,
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 3_000,
        cigaretteButtsMassKg: 1.2,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
        cigaretteButtsCountProvenance: "weight_converted",
        cigaretteButtsMassProvenance: "measured",
        cigaretteButtsVolumeProvenance: "unknown",
        cigaretteButtsConversionFormulaVersion:
          "impact-terrain-2026-butts-mass-v1",
      },
      associationName: null,
      groupJoinEnabled: false,
      departureLocationLabel: null,
      arrivalLocationLabel: null,
      routeStyle: "souple",
      routeAdjustmentMessage: null,
      placeType: null,
      submissionMode: "complete",
      wasteBreakdown: null,
      wasteMeasurementMethod: null,
      photos: null,
      visionEstimate: null,
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({
          cigaretteButtsMeasurements: {
            cigaretteButtsCount: null,
            cigaretteButtsMassKg: 1.2,
            cigaretteButtsVolumeLiters: null,
            cigaretteButtsCondition: "propre",
            cigaretteButtsCountProvenance: "estimated",
            cigaretteButtsConversionFormulaVersion: "client-forged",
          },
        }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ cigarette_butts: null }),
    );
  });

  it("does not let a user PATCH department fields bypass server attribution", async () => {
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      actor_name: "Auteur",
      action_date: "2026-09-13",
      location_label: "Paris",
      department_code: "75",
      department_name: "Paris",
      latitude: 48.8566,
      longitude: 2.3522,
      derived_geometry_kind: "point",
      derived_geometry_geojson: null,
      notes: null,
    });
    resolveActionDepartmentForPersistenceMock.mockResolvedValueOnce({
      departmentCode: "75",
      departmentName: "Paris",
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({
          departmentCode: "2B",
          departmentName: "Haute-Corse",
        }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        department_code: "75",
        department_name: "Paris",
      }),
    );
    expect(resolveActionDepartmentForPersistenceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        existingDepartmentCode: "75",
        existingDepartmentName: "Paris",
        spatiallyChanged: false,
      }),
    );
    expect(resolveActionDepartmentForPersistenceMock.mock.calls[0][0]).not.toMatchObject({
      departmentCode: "2B",
      departmentName: "Haute-Corse",
    });
  });
});
