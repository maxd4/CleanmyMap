import { vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const recordRepollutionPredictionEvaluationForActionMock = vi.hoisted(() => vi.fn());
const loadManualRegistrationIdsForActionMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const loadCanonicalActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const resolveActionOrganizersMock = vi.hoisted(() => vi.fn());
const syncActionManualParticipantsMock = vi.hoisted(() => vi.fn());
const syncActionOrganizersMock = vi.hoisted(() => vi.fn());
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
const ensureGpxGeometryContributionEligibleMock = vi.hoisted(() => vi.fn());
const recordGpxGeometryContributionIfPresentMock = vi.hoisted(() => vi.fn());
const hasGpxGeometryContributionMock = vi.hoisted(() => vi.fn());
const reconcileGeometryContributionProgressionIfNeededMock = vi.hoisted(() => vi.fn());
const emitActionUpdateNotificationsMock = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/actions/participation/registration-records", () => ({
  loadManualRegistrationIdsForAction: loadManualRegistrationIdsForActionMock,
}));

vi.mock("@/lib/actions/participation/organizers", () => ({
  loadActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
  loadCanonicalActionOrganizerIdsForAction: loadCanonicalActionOrganizerIdsForActionMock,
  resolveActionOrganizers: resolveActionOrganizersMock,
  syncActionManualParticipants: syncActionManualParticipantsMock,
}));

vi.mock("@/lib/actions/participation/organizer-sync", () => ({
  syncActionOrganizers: syncActionOrganizersMock,
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
  parseJsonBodyWithValidation: async (request: Request, schema: { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: { flatten: () => { fieldErrors: Record<string, string[]> } } } }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { ok: false, response: Response.json({ error: "Invalid JSON payload" }, { status: 400 }) };
    }
    const parsed = schema.safeParse(body);
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, response: validationErrorResponseMock(parsed.error?.flatten().fieldErrors ?? {}) };
  },
}));

vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: unauthorizedJsonResponseMock,
}));

vi.mock("@/lib/geo/action-department-resolver", () => ({
  resolveActionDepartmentForPersistence: resolveActionDepartmentForPersistenceMock,
}));

vi.mock("@/lib/actions/geometry/action-geometry-contribution-workflow", () => ({
  ensureGpxGeometryContributionEligible: ensureGpxGeometryContributionEligibleMock,
  hasGpxGeometryContribution: hasGpxGeometryContributionMock,
  recordGpxGeometryContributionIfPresent: recordGpxGeometryContributionIfPresentMock,
  reconcileGeometryContributionProgressionIfNeeded: reconcileGeometryContributionProgressionIfNeededMock,
  stripObservedGeometryProjectionFields: vi.fn((value) => value),
}));

vi.mock("@/lib/actions/action-update-notifications", () => ({
  emitActionUpdateNotifications: emitActionUpdateNotificationsMock,
}));

export {
  appendActionModerationAuditMock,
  emitActionUpdateNotificationsMock,
  extractActionMetadataFromNotesMock,
  getCurrentUserIdentityMock,
  loadActionByIdMock,
  loadActionOrganizerIdsForActionMock,
  loadManualRegistrationIdsForActionMock,
  recordRepollutionPredictionEvaluationForActionMock,
  requireAuthenticatedAccessMock,
  resolveActionDepartmentForPersistenceMock,
  syncActionManualParticipantsMock,
  syncActionOrganizersMock,
  recordGpxGeometryContributionIfPresentMock,
  hasGpxGeometryContributionMock,
  reconcileGeometryContributionProgressionIfNeededMock,
};

export let updateMock: ReturnType<typeof vi.fn>;
let fromMock: ReturnType<typeof vi.fn>;

export function resetPatchRouteMocks() {
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
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  loadActionByIdMock.mockResolvedValue({
    id: "action-test-1",
    updated_at: "old-revision",
    status: "pending",
    action_phase: "pre_action",
    preparation_data: {},
    created_by_clerk_id: "user-test-1",
    notes: null,
  });
  loadManualRegistrationIdsForActionMock.mockResolvedValue(["user-manual-1"]);
  loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-test-1"]);
  loadCanonicalActionOrganizerIdsForActionMock.mockResolvedValue(["user-test-1"]);
  resolveActionOrganizersMock.mockResolvedValue({
    organizers: [],
    unresolvedTokens: [],
  });
  syncActionManualParticipantsMock.mockResolvedValue({
    participants: [],
    unresolvedTokens: [],
  });
  syncActionOrganizersMock.mockResolvedValue({
    organizers: [],
    unresolvedTokens: [],
  });
  appendActionModerationAuditMock.mockResolvedValue(undefined);
  recordRepollutionPredictionEvaluationForActionMock.mockResolvedValue(undefined);
  resolveActionDepartmentForPersistenceMock.mockResolvedValue({
    departmentCode: null,
    departmentName: null,
  });
  ensureGpxGeometryContributionEligibleMock.mockResolvedValue(null);
  hasGpxGeometryContributionMock.mockReturnValue(false);
  recordGpxGeometryContributionIfPresentMock.mockResolvedValue(null);
  reconcileGeometryContributionProgressionIfNeededMock.mockResolvedValue(undefined);
  emitActionUpdateNotificationsMock.mockResolvedValue(true);
  unauthorizedJsonResponseMock.mockReturnValue({ status: 401 });
  handleApiErrorMock.mockResolvedValue(new Response("error", { status: 500 }));
}
