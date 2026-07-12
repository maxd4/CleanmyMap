import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const loadManualParticipantIdsForActionMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const extractActionMetadataFromNotesMock = vi.hoisted(() => vi.fn());
const appendActionModerationAuditMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));

vi.mock("@/lib/actions/store", () => ({
  loadActionById: loadActionByIdMock,
  buildPersistedNotes: vi.fn(),
}));

vi.mock("@/lib/actions/group-participation.helpers", () => ({
  loadManualParticipantIdsForAction: loadManualParticipantIdsForActionMock,
}));

vi.mock("@/lib/actions/organizers", () => ({
  loadActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
}));

vi.mock("@/lib/actions/metadata", () => ({
  extractActionMetadataFromNotes: extractActionMetadataFromNotesMock,
}));

vi.mock("@/lib/actions/moderation-audit", () => ({
  appendActionModerationAudit: appendActionModerationAuditMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: vi.fn(),
}));

vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: unauthorizedJsonResponseMock,
}));

describe("PATCH /api/actions/:actionId", () => {
  let updateMock: ReturnType<typeof vi.fn>;
  let fromMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    authMock.mockResolvedValue({ userId: "user-test-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      role: "benevole",
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
    appendActionModerationAuditMock.mockResolvedValue(undefined);
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

  it("auto-approves an admin-like user's own final declaration", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-test-1",
      role: "admin",
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
        status: "approved",
      }),
    );
  });

  it("does not auto-approve when an admin-like user finalizes another user's action", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-test-1",
      role: "admin",
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
});
