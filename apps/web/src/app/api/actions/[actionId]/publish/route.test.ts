import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveActionFormalitiesFacts } from "@/lib/actions/formalities-facts";
import { qualifyActionFormalities } from "@/lib/actions/formalities-qualification";
import { buildFormalitiesWorkflowState } from "@/lib/actions/formalities-workflow";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const emitAdministrativeRequirementNotificationsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/actions/administrative-requirement-notifications", () => ({
  emitAdministrativeRequirementNotifications:
    emitAdministrativeRequirementNotificationsMock,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: vi.fn(() => new Response("Unauthorized", { status: 401 })),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: vi.fn((error: unknown) => new Response(error instanceof Error ? error.message : "error", { status: 500 })),
}));

function createUpdateClient(result: { data: unknown; error: unknown }) {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    select: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
  };
  return {
    from: vi.fn(() => chain),
    rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
  };
}

describe("POST /api/actions/:actionId/publish", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "owner-1", role: null, activeRole: null });
    loadActionOrganizerIdsForActionMock.mockResolvedValue([]);
    loadActionByIdMock.mockResolvedValue({
      id: "action-1",
      created_by_clerk_id: "owner-1",
      action_phase: "pre_action",
      published_at: null,
    });
    emitAdministrativeRequirementNotificationsMock.mockResolvedValue(true);
  });

  it("publishes a private pre-action without changing moderation status", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createUpdateClient({ data: { id: "action-1", published_at: "2026-09-14T10:00:00.000Z" }, error: null }),
    );
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("published");
    expect(body.alreadyPublished).toBe(false);
    expect(emitAdministrativeRequirementNotificationsMock).toHaveBeenCalledWith({
      supabase: expect.anything(),
      actionId: "action-1",
    });
    expect(getSupabaseServerClientMock().from).not.toHaveBeenCalledWith("action_participants");
  });

  it("refuses publication by a third party", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "intruder-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "intruder-1", role: null, activeRole: null });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(403);
  });

  it("is idempotent when the action is already published", async () => {
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-1",
      created_by_clerk_id: "owner-1",
      action_phase: "pre_action",
      published_at: "2026-09-14T10:00:00.000Z",
    });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.alreadyPublished).toBe(true);
    expect(emitAdministrativeRequirementNotificationsMock).not.toHaveBeenCalled();
  });

  it.each(["rejected", "cancelled"] as const)(
    "refuses to publish a %s terminal pre-action",
    async (status) => {
      loadActionByIdMock.mockResolvedValueOnce({
        id: "action-1",
        created_by_clerk_id: "owner-1",
        action_phase: "pre_action",
        status,
        published_at: status === "cancelled" ? "2026-09-14T10:00:00.000Z" : null,
      });
      const { POST } = await import("./route");
      const response = await POST(new Request("http://localhost"), {
        params: Promise.resolve({ actionId: "action-1" }),
      });
      expect(response.status).toBe(422);
    },
  );

  it("rejects a spontaneous action with only a legacy display label", async () => {
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-1",
      created_by_clerk_id: "owner-1",
      action_phase: "pre_action",
      published_at: null,
      organizer_type: "spontaneous",
      organizer_name: "Ancien référent libre",
    });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce([]);
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ actionId: "action-1" }),
    });

    expect(response.status).toBe(422);
  });

  it("does not let the internal administrative attestation bypass a required formality", async () => {
    const facts = {
      ...deriveActionFormalitiesFacts({ departmentCode: "75", departmentName: "Paris", plannedObjective: "nettoyage" }),
      publicSpace: "public_domain" as const,
      manager: { kind: "paris_city" as const, label: "Ville de Paris" },
      hasInstallations: true,
      requiresPhysicalOccupation: true,
      isPublicRoadwayActivity: false,
      isItinerant: false,
      isClaiming: false,
      localCustomaryUse: false,
      largeCrowdOrComplexInstallations: false,
    };
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({ facts, qualification });
    loadActionByIdMock.mockResolvedValueOnce({
      id: "action-1",
      created_by_clerk_id: "owner-1",
      action_phase: "pre_action",
      published_at: null,
      status: "pending",
      organizer_type: "association",
      preparation_data: {
        formalitiesContext: facts,
        formalitiesWorkflow: workflow,
        administrativeRequirements: { status: "validated", validatedAt: "2026-10-10T10:00:00.000Z" },
      },
    });
    const supabase = createUpdateClient({ data: { id: "action-1", published_at: null }, error: null });
    getSupabaseServerClientMock.mockReturnValue(supabase);
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    const body = await response.json();
    expect(response.status).toBe(422);
    expect(body.code).toBe("required_formality_not_ready");
    expect(body.formalityIds).toContain("paris-city-public-domain-aot");
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
