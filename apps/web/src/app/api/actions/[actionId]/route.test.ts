import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const extractActionMetadataFromNotesMock = vi.hoisted(() => vi.fn());
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

vi.mock("@/lib/actions/metadata", () => ({
  extractActionMetadataFromNotes: extractActionMetadataFromNotesMock,
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
    unauthorizedJsonResponseMock.mockReturnValue({ status: 401 });
    handleApiErrorMock.mockResolvedValue(new Response("error", { status: 500 }));
  });

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

  it("approves the action once the final declaration is completed", async () => {
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
});
