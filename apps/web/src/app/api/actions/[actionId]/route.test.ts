import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const recordRepollutionPredictionEvaluationForActionMock = vi.hoisted(() => vi.fn());
const loadManualParticipantIdsForActionMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const syncActionManualParticipantsMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const extractActionMetadataFromNotesMock = vi.hoisted(() => vi.fn());
const appendActionModerationAuditMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());
const validationErrorResponseMock = vi.hoisted(() =>
  vi.fn((errors: Record<string, string[]>) =>
    Response.json({ error: errors }, { status: 400 }),
  ),
);
const resolveActionDepartmentForPersistenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));

vi.mock("@/lib/actions/store", () => ({
  loadActionById: loadActionByIdMock,
  buildPersistedNotes: vi.fn(),
  recordRepollutionPredictionEvaluationForAction:
    recordRepollutionPredictionEvaluationForActionMock,
}));

vi.mock("@/lib/actions/store-notes", () => ({
  buildPersistedNotes: vi.fn(),
}));

vi.mock("@/lib/actions/store-post-processing", () => ({
  recordRepollutionPredictionEvaluationForAction:
    recordRepollutionPredictionEvaluationForActionMock,
}));

vi.mock("@/lib/actions/participation/group-participation.helpers", () => ({
  loadManualParticipantIdsForAction: loadManualParticipantIdsForActionMock,
}));

vi.mock("@/lib/actions/participation/organizers", () => ({
  loadActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
  syncActionManualParticipants: syncActionManualParticipantsMock,
}));

vi.mock("@/lib/actions/metadata", () => ({
  extractActionMetadataFromNotes: extractActionMetadataFromNotesMock,
}));

vi.mock("@/lib/actions/moderation-audit", () => ({
  appendActionModerationAudit: appendActionModerationAuditMock,
  isModerationReasonRequired: (operation: string) => operation === "correct_impact",
  normalizeModerationReason: (
    value: unknown,
    options?: { required?: boolean },
  ) => {
    const normalized = typeof value === "string" ? value.trim() : "";
    return normalized && (!options?.required || normalized.length >= 5)
      ? normalized
      : null;
  },
}));

vi.mock("@/lib/actions/permissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/actions/permissions")>(
    "@/lib/actions/permissions",
  );
  return actual;
});

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: validationErrorResponseMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: unauthorizedJsonResponseMock,
}));

vi.mock("@/lib/geo/action-department-resolver", () => ({
  resolveActionDepartmentForPersistence: resolveActionDepartmentForPersistenceMock,
}));

describe("PATCH /api/actions/:actionId", () => {
  let updateMock: ReturnType<typeof vi.fn>;
  let fromMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: true,
      userId: "user-test-1",
    });
    getCurrentUserIdentityMock.mockResolvedValue({
      role: "benevole",
      activeRole: "benevole",
    });
    extractActionMetadataFromNotesMock.mockReturnValue({
      cleanNotes: null,
      associationName: null,
      groupJoinEnabled: false,
      departureLocationLabel: null,
      arrivalLocationLabel: null,
      routeStyle: "souple",
      routeAdjustmentMessage: null,
      placeType: null,
      submissionMode: "quick",
      wasteBreakdown: null,
      wasteMeasurementMethod: null,
      cigaretteButtsKg: null,
      photos: null,
      visionEstimate: null,
    });
    updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "action-test-1" },
            error: null,
          }),
        }),
      }),
    });
    fromMock = vi.fn().mockReturnValue({
      update: updateMock,
    });
    getSupabaseServerClientMock.mockReturnValue({
      from: fromMock,
    });
    loadActionByIdMock.mockResolvedValue({
      id: "action-test-1",
      status: "pending",
      action_phase: "pre_action",
      preparation_data: {},
      created_by_clerk_id: "user-test-1",
      notes: null,
    });
    loadManualParticipantIdsForActionMock.mockResolvedValue(["user-manual-1"]);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-test-1"]);
    syncActionManualParticipantsMock.mockResolvedValue({
      participants: [],
      unresolvedTokens: [],
    });
    appendActionModerationAuditMock.mockResolvedValue(undefined);
    recordRepollutionPredictionEvaluationForActionMock.mockResolvedValue(undefined);
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    unauthorizedJsonResponseMock.mockReturnValue({ status: 401 });
    handleApiErrorMock.mockResolvedValue(new Response("error", { status: 500 }));
  });

  it("returns manual participants with the action editor payload", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/actions/action-test-1"), {
      params: Promise.resolve({ actionId: "action-test-1" }),
    });

    const body = (await response.json()) as {
      action?: { participantAccounts?: string[] };
    };

    expect(response.status).toBe(200);
    expect(body.action?.participantAccounts).toEqual(["user-manual-1"]);
    expect(loadManualParticipantIdsForActionMock).toHaveBeenCalledWith(
      expect.anything(),
      "action-test-1",
    );
  }, 15000);

  it("keeps a pre-action pending until the harvest is completed", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ actionPhase: "pre_action" }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action_phase: "pre_action",
        status: "pending",
      }),
    );
  });

  it("keeps an ordinary final declaration pending moderation", async () => {
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

  it("lets an elected account with ACTIVE_ROLE=admin correct validated impact with the admin audit contract", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "elu-1",
      role: "elu",
      activeRole: "admin",
    });
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: true,
      userId: "elu-1",
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
        body: JSON.stringify({ wasteKg: 2, reason: "Correction élu validée" }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ waste_kg: 2 }));
    expect(appendActionModerationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "elu-1",
        targetActionId: "action-test-1",
        targetUserId: "user-test-1",
        operation: "correct_impact",
        reason: "Correction élu validée",
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

  it("rejects an elected active role from correcting validated impact", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-test-1",
      role: "elu",
      activeRole: "elu",
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

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-test-1", {
        method: "PATCH",
        body: JSON.stringify({ wasteKg: 2, reason: "Tentative élu" }),
      }),
      { params: Promise.resolve({ actionId: "action-test-1" }) },
    );

    expect(response.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
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

  it("keeps an admin user's own final declaration in normal moderation", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-test-1",
      role: "admin",
      activeRole: "admin",
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
    expect(recordRepollutionPredictionEvaluationForActionMock).not.toHaveBeenCalled();
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
      preparation_data: {},
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
