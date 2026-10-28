import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  identity: vi.fn(),
  loadAction: vi.fn(),
  organizers: vi.fn(),
  participation: vi.fn(),
  state: vi.fn(),
  review: vi.fn(),
  canManage: vi.fn(),
  canManageGlobal: vi.fn(),
  finalized: vi.fn(),
  policy: vi.fn(),
  server: vi.fn(),
}));

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: mocks.access }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: mocks.identity }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: mocks.loadAction }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadActionOrganizerRowsForAction: mocks.organizers }));
vi.mock("@/lib/actions/participation/group-participation", () => ({ loadActionParticipationReviewPage: mocks.participation }));
vi.mock("@/lib/actions/role-attestations", () => ({
  isActionFinalizedForRoleAttestation: mocks.finalized,
  loadActionRoleAttestationState: mocks.state,
  reviewActionRoleAttestation: mocks.review,
}));
vi.mock("@/lib/actions/permissions", () => ({
  canManageAction: mocks.canManage,
  canManageActionsGlobally: mocks.canManageGlobal,
}));
vi.mock("@/lib/actions/role-attestation-policy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/actions/role-attestation-policy")>("@/lib/actions/role-attestation-policy");
  mocks.policy = vi.fn(actual.evaluateRoleAttestationPolicy);
  return { ...actual, evaluateRoleAttestationPolicy: mocks.policy };
});
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.server }));

const action = {
  id: "action-1",
  created_by_clerk_id: "owner-1",
  action_phase: "post_action_complete",
  status: "approved",
};

const state = {
  assignments: [{ user_id: "participant-1", role_code: "group_lead" }],
  attestations: [{
    user_id: "participant-1",
    role_code: "group_lead",
    verification_status: "pending",
    reviewer_clerk_id: "reviewer-old",
    provenance_snapshot: { source: "assignment" },
    decision_reason: null,
  }],
};

function request(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

function context(actionId = "action-1") {
  return { params: Promise.resolve({ actionId }) };
}

function query(data: unknown = { participation_status: "confirmed" }, error: { message: string } | null = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data, error })),
  };
  return chain;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ ok: true, userId: "reviewer-1" });
  mocks.identity.mockResolvedValue({ userId: "reviewer-1", role: "admin", activeRole: "admin" });
  mocks.loadAction.mockResolvedValue(action);
  mocks.organizers.mockResolvedValue([{ organizer_clerk_id: "owner-1" }]);
  mocks.canManage.mockReturnValue(true);
  mocks.canManageGlobal.mockReturnValue(true);
  mocks.finalized.mockReturnValue(true);
  mocks.state.mockResolvedValue(state);
  mocks.participation.mockResolvedValue({
    items: [{ userId: "participant-1", displayName: "Participant", handle: "participant", participationStatus: "confirmed" }],
    hasMore: false,
    nextOffset: null,
  });
  mocks.review.mockResolvedValue({ verification_status: "confirmed" });
  mocks.server.mockReturnValue({ from: vi.fn(() => query()) });
});

describe("role attestation route boundaries", () => {
  it("fails closed for unauthenticated, missing and non-finalized reads", async () => {
    const { GET } = await import("./route");
    mocks.access.mockResolvedValueOnce({ ok: false });
    await expect(GET(request("/api/actions/action-1/role-attestations"), context())).resolves.toMatchObject({ status: 401 });

    mocks.loadAction.mockResolvedValueOnce(null);
    await expect(GET(request("/api/actions/action-1/role-attestations"), context())).resolves.toMatchObject({ status: 404 });

    mocks.finalized.mockReturnValueOnce(false);
    await expect(GET(request("/api/actions/action-1/role-attestations"), context())).resolves.toMatchObject({ status: 409 });
  });

  it("returns paginated manager evidence with private no-store headers", async () => {
    const { GET } = await import("./route");
    const response = await GET(request("/api/actions/action-1/role-attestations?limit=0&offset=999999"), context());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body).toMatchObject({
      canReview: true,
      pagination: { hasMore: false, nextOffset: null },
      participants: [{ userId: "participant-1", attestations: [{ reviewer_clerk_id: "reviewer-old" }] }],
    });
    expect(mocks.participation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ limit: 1, offset: 100000 }));
  });

  it("limits a participant read to its own confirmed evidence and redacts reviewer data", async () => {
    mocks.canManage.mockReturnValue(false);
    mocks.canManageGlobal.mockReturnValue(false);
    mocks.access.mockResolvedValue({ ok: true, userId: "participant-1" });
    mocks.identity.mockResolvedValue({ userId: "participant-1", role: "benevole", activeRole: "benevole" });
    const { GET } = await import("./route");
    const response = await GET(request("/api/actions/action-1/role-attestations?limit=50&offset=2"), context());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.canReview).toBe(false);
    expect(body.participants[0].attestations[0]).toMatchObject({ reviewer_clerk_id: null, provenance_snapshot: {} });
    expect(mocks.participation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ limit: 1, offset: 0, userId: "participant-1" }));

    mocks.participation.mockResolvedValueOnce({ items: [], hasMore: false, nextOffset: null });
    await expect(GET(request("/api/actions/action-1/role-attestations"), context())).resolves.toMatchObject({ status: 403 });
  });

  it("rejects malformed POST payloads before calling the review service", async () => {
    const { POST } = await import("./route");
    mocks.access.mockResolvedValueOnce({ ok: false });
    await expect(POST(request("/api/actions/action-1/role-attestations", { method: "POST", body: "{}" }), context())).resolves.toMatchObject({ status: 401 });
    await expect(POST(request("/api/actions/action-1/role-attestations", { method: "POST", body: "{" }), context())).resolves.toMatchObject({ status: 422 });
    await expect(POST(request("/api/actions/action-1/role-attestations", { method: "POST", body: JSON.stringify({ userId: "participant-1", roleCode: "unknown", decision: "confirm" }) }), context())).resolves.toMatchObject({ status: 422 });
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("enforces reviewer, lifecycle, participation, reason and policy invariants", async () => {
    const { POST } = await import("./route");
    const body = { userId: "participant-1", roleCode: "group_lead", decision: "confirm" };

    mocks.canManage.mockReturnValueOnce(false);
    await expect(POST(request("/api/actions/action-1/role-attestations", { method: "POST", body: JSON.stringify(body) }), context())).resolves.toMatchObject({ status: 403 });

    mocks.finalized.mockReturnValueOnce(false);
    await expect(POST(request("/api/actions/action-1/role-attestations", { method: "POST", body: JSON.stringify(body) }), context())).resolves.toMatchObject({ status: 409 });

    mocks.server.mockReturnValueOnce({ from: vi.fn(() => query({ participation_status: "pending" })) });
    mocks.state.mockResolvedValueOnce(state);
    await expect(POST(request("/api/actions/action-1/role-attestations", {
      method: "POST",
      body: JSON.stringify({ ...body, reason: "Participation à vérifier" }),
    }), context())).resolves.toMatchObject({ status: 409 });
    expect(mocks.policy).toHaveBeenLastCalledWith(expect.objectContaining({
      actionFinalized: true,
      participationStatus: "pending",
      reviewerAuthorized: true,
      reviewerIsGlobalAdmin: true,
      reviewerUserId: "reviewer-1",
      targetUserId: "participant-1",
      hasPlannedAssignment: true,
      decision: "confirm",
      reason: "Participation à vérifier",
      currentStatus: "pending",
      currentReviewerUserId: "reviewer-old",
      currentDecisionReason: null,
    }));
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("keeps a non-privileged self-review pending and delegates that pending state", async () => {
    mocks.canManageGlobal.mockReturnValue(false);
    mocks.access.mockResolvedValue({ ok: true, userId: "participant-1" });
    mocks.identity.mockResolvedValue({ userId: "participant-1", role: "benevole", activeRole: "benevole" });
    mocks.server.mockReturnValueOnce({ from: vi.fn(() => query({ participation_status: "confirmed" })) });
    mocks.review.mockResolvedValueOnce({ verification_status: "pending" });
    const { POST } = await import("./route");
    const response = await POST(request("/api/actions/action-1/role-attestations", {
      method: "POST",
      body: JSON.stringify({ userId: "participant-1", roleCode: "group_lead", decision: "confirm" }),
    }), context());
    expect(response.status).toBe(200);
    expect(mocks.policy).toHaveBeenCalledWith(expect.objectContaining({
      participationStatus: "confirmed",
      reviewerAuthorized: true,
      reviewerIsGlobalAdmin: false,
      reviewerUserId: "participant-1",
      targetUserId: "participant-1",
    }));
    expect(await response.json()).toMatchObject({ attestation: { verification_status: "pending" } });
  });

  it.each([
    ["pending", { participation_status: "pending" }],
    ["cancelled", { participation_status: "cancelled" }],
    ["absent", null],
  ])("refuses a %s participation before the review RPC", async (_label, participation) => {
    mocks.server.mockReturnValueOnce({ from: vi.fn(() => query(participation)) });
    const { POST } = await import("./route");
    const response = await POST(request("/api/actions/action-1/role-attestations", {
      method: "POST",
      body: JSON.stringify({ userId: "participant-1", roleCode: "group_lead", decision: "confirm" }),
    }), context());
    expect(response.status).toBe(409);
    expect(mocks.policy).toHaveBeenLastCalledWith(expect.objectContaining({
      participationStatus: participation?.participation_status ?? undefined,
    }));
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("allows an identical terminal confirmation retry through the idempotent owner", async () => {
    mocks.state.mockResolvedValueOnce({
      assignments: [{ user_id: "participant-1", role_code: "group_lead" }],
      attestations: [{
        ...state.attestations[0],
        verification_status: "confirmed",
        reviewer_clerk_id: "reviewer-1",
        decision_reason: null,
      }],
    });
    mocks.server.mockReturnValueOnce({ from: vi.fn(() => query({ participation_status: "confirmed" })) });
    const { POST } = await import("./route");
    const response = await POST(request("/api/actions/action-1/role-attestations", {
      method: "POST",
      body: JSON.stringify({ userId: "participant-1", roleCode: "group_lead", decision: "confirm" }),
    }), context());
    expect(response.status).toBe(200);
    expect(mocks.policy).toHaveBeenLastCalledWith(expect.objectContaining({
      currentStatus: "confirmed",
      currentReviewerUserId: "reviewer-1",
      currentDecisionReason: null,
    }));
    expect(mocks.review).toHaveBeenCalledTimes(1);
  });

  it("refuses a non-idempotent terminal correction without a reason before the RPC", async () => {
    mocks.state.mockResolvedValueOnce({
      assignments: [{ user_id: "participant-1", role_code: "group_lead" }],
      attestations: [{
        ...state.attestations[0],
        verification_status: "confirmed",
        reviewer_clerk_id: "reviewer-2",
        decision_reason: null,
      }],
    });
    mocks.server.mockReturnValueOnce({ from: vi.fn(() => query({ participation_status: "confirmed" })) });
    const { POST } = await import("./route");
    const response = await POST(request("/api/actions/action-1/role-attestations", {
      method: "POST",
      body: JSON.stringify({ userId: "participant-1", roleCode: "group_lead", decision: "confirm" }),
    }), context());
    expect(response.status).toBe(409);
    expect(mocks.policy).toHaveBeenLastCalledWith(expect.objectContaining({ currentReviewerUserId: "reviewer-2", reason: null }));
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("delegates a motivated authorized terminal correction to the owner", async () => {
    mocks.state.mockResolvedValueOnce({
      assignments: [{ user_id: "participant-1", role_code: "group_lead" }],
      attestations: [{
        ...state.attestations[0],
        verification_status: "confirmed",
        reviewer_clerk_id: "reviewer-2",
        decision_reason: null,
      }],
    });
    mocks.server.mockReturnValueOnce({ from: vi.fn(() => query({ participation_status: "confirmed" })) });
    const { POST } = await import("./route");
    const response = await POST(request("/api/actions/action-1/role-attestations", {
      method: "POST",
      body: JSON.stringify({ userId: "participant-1", roleCode: "group_lead", decision: "confirm", reason: "Correction auditée" }),
    }), context());
    expect(response.status).toBe(200);
    expect(mocks.review).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ reason: "Correction auditée" }));
  });

  it("persists an allowed confirmation and maps dependency failures safely", async () => {
    const { POST } = await import("./route");
    const response = await POST(request("/api/actions/action-1/role-attestations", {
      method: "POST",
      body: JSON.stringify({ userId: "participant-1", roleCode: "group_lead", decision: "confirm", reason: "Confirmé" }),
    }), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", attestation: { verification_status: "confirmed" } });

    mocks.review.mockRejectedValueOnce(new Error("lifecycle_closed"));
    await expect(POST(request("/api/actions/action-1/role-attestations", { method: "POST", body: JSON.stringify({ userId: "participant-1", roleCode: "group_lead", decision: "confirm" }) }), context())).resolves.toMatchObject({ status: 409 });

    mocks.server.mockReturnValueOnce({ from: vi.fn(() => query(null, { message: "participant read failed" })) });
    await expect(POST(request("/api/actions/action-1/role-attestations", { method: "POST", body: JSON.stringify({ userId: "participant-1", roleCode: "group_lead", decision: "confirm" }) }), context())).resolves.toMatchObject({ status: 500 });
  });
});
