import { afterAll, beforeEach, describe, vi } from "vitest";
import { registerActionFormScenario } from "./route.test.action-form-scenario";
import { registerActionLifecycleScenarios } from "./route.test.action-lifecycle-scenarios";
import { registerActionVisibilityScenarios } from "./route.test.action-visibility-scenarios";
import { registerCleanPlaceScenarios } from "./route.test.clean-place-scenarios";
import { registerSanitizedErrorScenario } from "./route.test.sanitized-error-scenario";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const refreshProgressionProfileMock = vi.hoisted(() => vi.fn());
const syncUserActionProgressionMock = vi.hoisted(() => vi.fn());
const invalidatePublicSurfaceSnapshotsByRouteMock = vi.hoisted(() => vi.fn());
const copyValidatedActionToLocalStoreMock = vi.hoisted(() => vi.fn());
const copyValidatedSpotToLocalStoreMock = vi.hoisted(() => vi.fn());
const moderateSignalementMock = vi.hoisted(() => vi.fn());
const readSignalementForModerationMock = vi.hoisted(() => vi.fn());
const emitActionValidatedMock = vi.hoisted(() => vi.fn());
const emitSpotValidatedMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/data/local-sync", () => ({
  copyValidatedActionToLocalStore: copyValidatedActionToLocalStoreMock,
  copyValidatedSpotToLocalStore: copyValidatedSpotToLocalStoreMock,
}));

vi.mock("@/lib/admin/moderation/signalement-moderation", () => ({
  moderateSignalement: moderateSignalementMock,
  readSignalementForModeration: readSignalementForModerationMock,
}));

vi.mock("@/lib/events/emit", () => ({
  emitActionRejected: vi.fn(),
  emitActionValidated: emitActionValidatedMock,
  emitSpotValidated: emitSpotValidatedMock,
}));

vi.mock("@/lib/actions/participation/organizers", () => ({
  loadActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
}));

vi.mock("@/lib/gamification/progression-tracking", () => ({
  refreshProgressionProfile: refreshProgressionProfileMock,
  syncUserActionProgression: syncUserActionProgressionMock,
}));

vi.mock("@/lib/public-surface-snapshots", () => ({
  invalidatePublicSurfaceSnapshotsByRoute: invalidatePublicSurfaceSnapshotsByRouteMock,
}));

describe("POST /api/admin/moderation", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["creator-1", "organizer-1"]);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
    syncUserActionProgressionMock.mockResolvedValue(1);
    invalidatePublicSurfaceSnapshotsByRouteMock.mockResolvedValue(undefined);
    copyValidatedActionToLocalStoreMock.mockResolvedValue({
      source: "actions",
      copied: true,
    });
    copyValidatedSpotToLocalStoreMock.mockResolvedValue(true);
    readSignalementForModerationMock.mockResolvedValue({
      id: "spot-1",
      created_at: "2026-08-20T10:00:00.000Z",
      created_by_clerk_id: "creator-1",
      label: "Ancien libellé",
      latitude: 48.1,
      longitude: 2.3,
      status: "new",
      notes: "Anciennes notes",
      sourceTable: "trash_spotter_spots",
      spot_type: "spot",
      validated_at: null,
      cleaned_at: null,
    });
    moderateSignalementMock.mockResolvedValue({
      found: true,
      sourceTable: "trash_spotter_spots",
      signalement: {
        id: "spot-1",
        created_at: "2026-08-20T10:00:00.000Z",
        created_by_clerk_id: "creator-1",
        label: "Zone validée",
        latitude: 48.1,
        longitude: 2.3,
        status: "validated",
        notes: "Anciennes notes",
        sourceTable: "trash_spotter_spots",
        spot_type: "spot",
        validated_at: "2026-08-27T10:00:00.000Z",
        cleaned_at: null,
      },
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  const scenarioContext = {
    mocks: {
      requireAdminAccessMock,
      getSupabaseAdminClientMock,
      appendAdminOperationAuditMock,
      loadActionOrganizerIdsForActionMock,
      refreshProgressionProfileMock,
      syncUserActionProgressionMock,
      invalidatePublicSurfaceSnapshotsByRouteMock,
      copyValidatedActionToLocalStoreMock,
      copyValidatedSpotToLocalStoreMock,
      moderateSignalementMock,
      readSignalementForModerationMock,
      emitActionValidatedMock,
      emitSpotValidatedMock,
    },
  };

  registerActionFormScenario(scenarioContext);
  registerCleanPlaceScenarios(scenarioContext);
  registerActionLifecycleScenarios(scenarioContext);
  registerActionVisibilityScenarios(scenarioContext);
  registerSanitizedErrorScenario(scenarioContext);
});
