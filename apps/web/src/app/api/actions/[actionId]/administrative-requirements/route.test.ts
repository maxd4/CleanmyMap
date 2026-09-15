import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const loadCanonicalActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const validateAdministrativeRequirementsRpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: loadCanonicalActionOrganizerIdsForActionMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

function buildAction(preparationData: Record<string, unknown> = {}) {
  return {
    id: "action-42",
    action_phase: "pre_action" as const,
    preparation_data: preparationData,
    created_by_clerk_id: "creator-1",
    updated_at: "2026-09-15T09:00:00.000Z",
  };
}

describe("POST /api/actions/:actionId/administrative-requirements", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "benevole", activeRole: "benevole" });
    loadCanonicalActionOrganizerIdsForActionMock.mockResolvedValue(["organizer-1", "coorganizer-1"]);
    validateAdministrativeRequirementsRpcMock.mockResolvedValue({
      data: {
        alreadyValidated: false,
        actionId: "action-42",
        administrativeRequirements: {
          status: "validated",
          validatedAt: "2026-09-15T10:00:00.000Z",
        },
      },
      error: null,
    });
    getSupabaseServerClientMock.mockReturnValue({
      rpc: validateAdministrativeRequirementsRpcMock,
    });
  });

  it("allows an organizer and delegates the protected transition to the server RPC", async () => {
    loadActionByIdMock.mockResolvedValue(buildAction());

    const { POST } = await import("./route");
    const context = { params: Promise.resolve({ actionId: "action-42" }) };
    const first = await POST(new Request("http://localhost"), context);
    const firstBody = await first.json();

    expect(first.status).toBe(200);
    expect(firstBody).toMatchObject({
      status: "ok",
      actionId: "action-42",
      administrativeRequirements: { status: "validated" },
    });
    expect(validateAdministrativeRequirementsRpcMock).toHaveBeenCalledWith(
      "validate_action_administrative_requirements",
      {
        p_action_id: "action-42",
        p_validated_by_user_id: "organizer-1",
      },
    );

    const second = await POST(new Request("http://localhost"), context);
    expect(second.status).toBe(200);
    expect(validateAdministrativeRequirementsRpcMock).toHaveBeenCalledTimes(2);
  });

  it("allows a canonical co-organizer without treating creator status as permission", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "coorganizer-1" });
    loadActionByIdMock.mockResolvedValue(buildAction());

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ actionId: "action-42" }),
    });

    expect(response.status).toBe(200);
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
  });

  it("returns 403 for a creator who is not in action_organizers", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "creator-1" });
    loadCanonicalActionOrganizerIdsForActionMock.mockResolvedValue(["organizer-1"]);
    loadActionByIdMock.mockResolvedValue(buildAction());

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ actionId: "action-42" }),
    });

    expect(response.status).toBe(403);
    expect(validateAdministrativeRequirementsRpcMock).not.toHaveBeenCalled();
  });

  it("allows admin, max and elu based on active role", async () => {
    const { POST } = await import("./route");
    for (const activeRole of ["admin", "max", "elu"] as const) {
      loadActionByIdMock.mockReset().mockResolvedValue(buildAction());
      getCurrentUserIdentityMock.mockResolvedValue({ role: activeRole, activeRole });
      await POST(new Request("http://localhost"), {
        params: Promise.resolve({ actionId: "action-42" }),
      });
    }
    expect(validateAdministrativeRequirementsRpcMock).toHaveBeenCalledTimes(3);
  });
});
