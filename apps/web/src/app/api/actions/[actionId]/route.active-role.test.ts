import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const extractActionMetadataFromNotesMock = vi.hoisted(() => vi.fn());
const appendActionModerationAuditMock = vi.hoisted(() => vi.fn());
const resolveActionDepartmentForPersistenceMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));
vi.mock("@/lib/actions/store", () => ({
  loadActionById: loadActionByIdMock,
  buildPersistedNotes: vi.fn(),
  recordRepollutionPredictionEvaluationForAction: vi.fn(),
}));
vi.mock("@/lib/actions/store-post-processing", () => ({
  recordRepollutionPredictionEvaluationForAction: vi.fn(),
}));
vi.mock("@/lib/actions/participation/registration-records", () => ({
  loadManualRegistrationIdsForAction: vi.fn(),
}));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
  syncActionManualParticipants: vi.fn(),
}));
vi.mock("@/lib/actions/store-notes", () => ({
  buildPersistedNotes: vi.fn(),
}));
vi.mock("@/lib/actions/metadata", () => ({
  extractActionMetadataFromNotes: extractActionMetadataFromNotesMock,
}));
vi.mock("@/lib/actions/moderation-audit", () => ({
  appendActionModerationAudit: appendActionModerationAuditMock,
  isModerationReasonRequired: (operation: string) => operation === "correct_impact",
  normalizeModerationReason: (value: unknown, options?: { required?: boolean }) => {
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
  handleApiError: vi.fn(() => new Response("error", { status: 500 })),
  validationErrorResponse: vi.fn((errors: Record<string, string[]>) =>
    Response.json({ error: errors }, { status: 400 }),
  ),
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: vi.fn(() => new Response("Unauthorized", { status: 401 })),
}));
vi.mock("@/lib/geo/action-department-resolver", () => ({
  resolveActionDepartmentForPersistence: resolveActionDepartmentForPersistenceMock,
}));

function buildUpdateClient() {
  const chain = {
    update: (...args: unknown[]) => {
      updateMock(...args);
      return chain;
    },
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: { id: "action-test-1" }, error: null })),
  };
  return { from: vi.fn(() => chain) };
}

function buildApprovedAction() {
  return {
    id: "action-test-1",
    status: "approved",
    action_phase: "post_action_complete",
    preparation_data: {},
    created_by_clerk_id: "creator-1",
    waste_kg: 1,
    cigarette_butts: 2,
    volunteers_count: 3,
    duration_minutes: 30,
    notes: null,
  };
}

describe("PATCH /api/actions/:actionId ACTIVE_ROLE boundaries", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "elu-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "elu-1",
      role: "elu",
      activeRole: "elu",
    });
    loadActionByIdMock.mockResolvedValue(buildApprovedAction());
    loadActionOrganizerIdsForActionMock.mockResolvedValue([]);
    extractActionMetadataFromNotesMock.mockReturnValue({
      cleanNotes: null,
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
      cigaretteButtsKg: null,
      photos: null,
      visionEstimate: null,
    });
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    appendActionModerationAuditMock.mockResolvedValue(undefined);
    getSupabaseServerClientMock.mockReturnValue(buildUpdateClient());
  });

  it("allows GRANTED_ROLE=elu with ACTIVE_ROLE=admin to correct validated impact", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "elu-1",
      role: "elu",
      activeRole: "admin",
    });

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
        targetUserId: "creator-1",
        operation: "correct_impact",
        reason: "Correction élu validée",
        previousValue: expect.objectContaining({ wasteKg: 1 }),
        newValue: expect.objectContaining({ wasteKg: 2 }),
      }),
    );
  });

  it("does not grant an elected active role the global impact override", async () => {
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
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });
});
