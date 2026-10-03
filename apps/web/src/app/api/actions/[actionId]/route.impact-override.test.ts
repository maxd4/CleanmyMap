import { beforeEach, describe, expect, it } from "vitest";
import { appendActionModerationAuditMock, extractActionMetadataFromNotesMock, getCurrentUserIdentityMock, loadActionByIdMock, loadActionOrganizerIdsForActionMock, requireAuthenticatedAccessMock, updateMock, resetPatchRouteMocks } from "./route.test.harness";

describe("PATCH /api/actions/:actionId — impact validé et overrides admin", () => {
  beforeEach(() => {
    resetPatchRouteMocks();
  });

  it("rejects a creator trying to change validated impact", async () => {
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "approved",
      action_phase: "post_action_complete",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      waste_kg: 1,
      notes: null,
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ wasteKg: 2 }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("lets admin correct validated impact with a reason and an audit snapshot", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "admin-1",
      role: "admin",
      activeRole: "admin",
    });
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: true,
      userId: "admin-1",
    });
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "approved",
      action_phase: "post_action_complete",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      waste_kg: 1,
      cigarette_butts: 2,
      volunteers_count: 3,
      duration_minutes: 30,
      notes: null,
    });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ wasteKg: 2, reason: "Correction terrain" }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ waste_kg: 2 }),
    );
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        targetActionId: "action-test-1",
        targetUserId: "user-test-1",
        operation: "correct_impact",
        reason: "Correction terrain",
        previousValue: expect.objectContaining({ wasteKg: 1 }),
        newValue: expect.objectContaining({ wasteKg: 2 }),
      }),
    );
  });

  it("lets max correct validated impact with a reason and a complete audit trace", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "max-1",
      role: "max",
      activeRole: "max",
    });
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: true,
      userId: "max-1",
    });
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "approved",
      action_phase: "post_action_complete",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      waste_kg: 1,
      cigarette_butts: 2,
      volunteers_count: 3,
      duration_minutes: 30,
      notes: null,
    });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ wasteKg: 2, reason: "Correction globale validée" }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ waste_kg: 2 }));
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "max-1",
        targetActionId: "action-test-1",
        targetUserId: "user-test-1",
        operation: "correct_impact",
        reason: "Correction globale validée",
        previousValue: expect.objectContaining({ wasteKg: 1 }),
        newValue: expect.objectContaining({ wasteKg: 2 }),
      }),
    );
  });

  it("requires a reason before an admin can correct validated impact", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "admin-1",
      role: "admin",
      activeRole: "admin",
    });
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: true,
      userId: "admin-1",
    });
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "approved",
      action_phase: "post_action_complete",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      waste_kg: 1,
      notes: null,
    });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ wasteKg: 2 }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("logs admin overrides when an admin edits another user's action", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      role: "admin",
      activeRole: "admin",
    });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      preparation_data: {},
      created_by_clerk_id: "user-test-2",
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
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-test-1",
        targetActionId: "action-test-1",
        operation: "edit_action",
        outcome: "success",
      }),
    );
  });

  it("records one allowlisted before/after snapshot for an admin override", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "admin", activeRole: "admin" });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      preparation_data: { actionTitle: "Ancienne préparation" },
      created_by_clerk_id: "user-test-2",
      actor_name: "Ancien nom",
      location_label: "Ancien lieu",
      latitude: 48.1,
      longitude: 2.3,
      waste_kg: 1,
      cigarette_butts: 2,
      volunteers_count: 3,
      duration_minutes: 30,
      notes: "Anciennes notes privées",
    });
    extractActionMetadataFromNotesMock.mockReturnValueOnce({
      cleanNotes: "Anciennes notes privées",
      associationName: "Association interne",
      groupJoinEnabled: false,
      departureLocationLabel: null,
      arrivalLocationLabel: null,
      routeStyle: "souple",
      routeAdjustmentMessage: null,
      placeType: "plage",
      submissionMode: "complete",
      wasteBreakdown: { megotsKg: 1, triQuality: "faible" },
      wasteMeasurementMethod: null,
      cigaretteButtsKg: null,
      photos: [
        {
          id: "photo-old",
          name: "ancienne-photo.jpg",
          mimeType: "image/jpeg",
          size: 100,
          width: 10,
          height: 10,
        },
      ],
      visionEstimate: null,
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({
          actorName: "Nouveau nom",
          locationLabel: "Nouveau lieu",
          latitude: 48.2,
          longitude: 2.4,
          wasteKg: 2,
          cigaretteButts: 4,
          volunteersCount: 5,
          durationMinutes: 45,
          notes: "Nouvelles notes privées",
          preparationData: { actionTitle: "Nouvelle préparation" },
          actionPhase: "post_action_complete",
          groupJoinEnabled: true,
          participantAccounts: ["participant-2"],
          wasteBreakdown: { megotsKg: 2, triQuality: "elevee" },
          photos: [
            {
              id: "photo-new",
              name: "nouvelle-photo.jpg",
              mimeType: "image/jpeg",
              size: 200,
              width: 20,
              height: 20,
              dataUrl: "data:image/jpeg;base64,abc",
            },
          ],
        }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendActionModerationAuditMock.mock.calls[0]?.[0] as {
      actorUserId: string;
      targetActionId: string;
      operation: string;
      targetUserId: string;
      previousValue: Record<string, unknown>;
      newValue: Record<string, unknown>;
    };
    const snapshotKeys = [
      "status",
      "actionPhase",
      "groupJoinEnabled",
      "wasteKg",
      "cigaretteButtsKg",
      "cigaretteButts",
      "volunteersCount",
      "durationMinutes",
      "wasteMeasurementMethod",
      "wasteBreakdown",
      "eventStartTime",
      "eventEndTime",
      "actorNameChanged",
      "locationChanged",
      "coordinatesChanged",
      "notesChanged",
      "preparationDataChanged",
      "participantsChanged",
      "wasteBreakdownChanged",
      "photosChanged",
    ];
    expect(audit).toMatchObject({
      actorUserId: "user-test-1",
      targetActionId: "action-test-1",
      operation: "edit_action",
      targetUserId: "user-test-2",
    });
    expect(Object.keys(audit.previousValue)).toEqual(snapshotKeys);
    expect(Object.keys(audit.newValue)).toEqual(snapshotKeys);
    expect(audit.previousValue).toEqual({
      status: "pending",
      actionPhase: "pre_action",
      groupJoinEnabled: false,
      wasteKg: 1,
      cigaretteButtsKg: null,
      cigaretteButts: 2,
      wasteMeasurementMethod: null,
      wasteBreakdown: { megotsKg: 1, triQuality: "faible" },
      volunteersCount: 3,
      durationMinutes: 30,
      eventStartTime: null,
      eventEndTime: null,
      actorNameChanged: true,
      locationChanged: true,
      coordinatesChanged: true,
      notesChanged: true,
      preparationDataChanged: true,
      participantsChanged: true,
      wasteBreakdownChanged: true,
      photosChanged: true,
    });
    expect(audit.newValue).toEqual({
      status: "pending",
      actionPhase: "post_action_complete",
      groupJoinEnabled: true,
      wasteKg: 2,
      cigaretteButtsKg: null,
      cigaretteButts: 4,
      wasteMeasurementMethod: null,
      wasteBreakdown: { megotsKg: 2, triQuality: "elevee" },
      volunteersCount: 5,
      durationMinutes: 45,
      eventStartTime: null,
      eventEndTime: null,
      actorNameChanged: true,
      locationChanged: true,
      coordinatesChanged: true,
      notesChanged: true,
      preparationDataChanged: true,
      participantsChanged: true,
      wasteBreakdownChanged: true,
      photosChanged: true,
    });
    const serializedAudit = JSON.stringify(audit);
    expect(serializedAudit).not.toContain("Ancien nom");
    expect(serializedAudit).not.toContain("Nouveau nom");
    expect(serializedAudit).not.toContain("Ancien lieu");
    expect(serializedAudit).not.toContain("Nouveau lieu");
    expect(serializedAudit).not.toContain("notes privées");
    expect(serializedAudit).not.toContain("photo-old");
    expect(serializedAudit).not.toContain("photo-new");
    expect(serializedAudit).not.toContain("participant-2");
  });
});
