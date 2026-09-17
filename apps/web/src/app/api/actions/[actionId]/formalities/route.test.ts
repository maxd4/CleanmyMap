import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const loadActionMock = vi.hoisted(() => vi.fn());
const loadOrganizersMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());
const validationErrorMock = vi.hoisted(() =>
  vi.fn((details: Record<string, string[]>) =>
    Response.json({ error: details }, { status: 422 }),
  ),
);
const unauthorizedMock = vi.hoisted(() =>
  vi.fn(() => Response.json({ error: "unauthorized" }, { status: 401 })),
);

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: authMock,
  getCurrentUserIdentity: identityMock,
}));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: loadOrganizersMock,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: supabaseMock }));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: validationErrorMock,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: unauthorizedMock,
}));

const action = () => ({
  id: "action-42",
  action_phase: "pre_action",
  created_by_clerk_id: "user-1",
  department_code: "75",
  department_name: "Paris",
  preparation_data: {
    plannedObjective: "nettoyage",
  },
});

describe("/api/actions/:actionId/formalities", () => {
  let update: ReturnType<typeof vi.fn>;
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, userId: "user-1" });
    identityMock.mockResolvedValue({
      userId: "user-1",
      role: "benevole",
      activeRole: "benevole",
    });
    loadActionMock.mockResolvedValue(action());
    loadOrganizersMock.mockResolvedValue(["user-1"]);
    update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "action-42" }, error: null }),
        }),
      }),
    });
    from = vi.fn().mockReturnValue({ update });
    supabaseMock.mockReturnValue({ from });
    handleApiErrorMock.mockImplementation(() => Response.json({ error: "server" }, { status: 500 }));
  });

  it("does not load a private action for an anonymous visitor", async () => {
    authMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/actions/action-42/formalities"), {
      params: Promise.resolve({ actionId: "action-42" }),
    });

    expect(response.status).toBe(401);
    expect(loadActionMock).not.toHaveBeenCalled();
    expect(supabaseMock).not.toHaveBeenCalled();
  });

  it("returns an explainable unknown qualification when the manager is not known", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/action-42/formalities"), {
      params: Promise.resolve({ actionId: "action-42" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.qualification.formalities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementStatus: "unknown",
          procedureKind: "unknown",
        }),
      ]),
    );
    expect(body.workflow.progress[0].userStatus).toBe("not_started");
    expect(body.workflow.trace.verifiedOn).toBeNull();
  });

  it("qualifies and persists the user-owned context without accepting a forged sent state", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/actions/action-42/formalities", {
        method: "PATCH",
        body: JSON.stringify({
          facts: {
            territory: { countryCode: "FR", code: "FR-75", label: "Paris (75)" },
            publicSpace: "public_domain",
            manager: { kind: "paris_city", label: null },
            isCleanwalk: true,
            isPublicRoadwayActivity: false,
            isItinerant: false,
            isClaiming: false,
            hasInstallations: true,
            requiresPhysicalOccupation: true,
            localCustomaryUse: false,
            largeCrowdOrComplexInstallations: false,
          },
        }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.qualification.formalities[0].requirementStatus).toBe("required");
    expect(body.qualification.formalities[0].source.verifiedOn).toBe("2026-09-17");
    expect(body.workflow.progress[0].userStatus).toBe("not_started");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        preparation_data: expect.objectContaining({
          formalitiesContext: expect.objectContaining({ publicSpace: "public_domain" }),
          formalitiesWorkflow: expect.objectContaining({
            progress: expect.arrayContaining([
              expect.objectContaining({ userStatus: "not_started" }),
            ]),
          }),
        }),
      }),
    );
  });

  it("requires action management permission before changing formalities", async () => {
    identityMock.mockResolvedValueOnce({
      userId: "other-user",
      role: "benevole",
      activeRole: "benevole",
    });
    authMock.mockResolvedValueOnce({ ok: true, userId: "other-user" });
    loadOrganizersMock.mockResolvedValueOnce([]);
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/actions/action-42/formalities", {
        method: "PATCH",
        body: JSON.stringify({ transition: { formalityId: "x", kind: "declare_sent" } }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );

    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
});
