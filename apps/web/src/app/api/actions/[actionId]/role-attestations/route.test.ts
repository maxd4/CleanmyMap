import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const canManageActionMock = vi.hoisted(() => vi.fn());
const canManageActionsGloballyMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerRowsMock = vi.hoisted(() => vi.fn());
const loadActionParticipationReviewPageMock = vi.hoisted(() => vi.fn());
const loadActionRoleAttestationStateMock = vi.hoisted(() => vi.fn());
const reviewActionRoleAttestationMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: requireActionRequestAccessMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: getCurrentUserIdentityMock }));
vi.mock("@/lib/actions/permissions", () => ({ canManageAction: canManageActionMock, canManageActionsGlobally: canManageActionsGloballyMock }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadActionOrganizerRowsForAction: loadActionOrganizerRowsMock }));
vi.mock("@/lib/actions/participation/group-participation", () => ({ loadActionParticipationReviewPage: loadActionParticipationReviewPageMock }));
vi.mock("@/lib/actions/role-attestations", async () => {
  const actual = await vi.importActual<typeof import("@/lib/actions/role-attestations")>("@/lib/actions/role-attestations");
  return { ...actual, loadActionRoleAttestationState: loadActionRoleAttestationStateMock, reviewActionRoleAttestation: reviewActionRoleAttestationMock };
});
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

const action = {
  id: "action-1",
  status: "approved",
  action_phase: "post_action_complete",
  published_at: "2026-10-19T10:00:00.000Z",
  moderation_visibility: "visible",
  created_by_clerk_id: "creator-1",
};

function participantQuery(status: string | null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: status ? { participation_status: status } : null, error: null }),
  };
  return query;
}

describe("/api/actions/[actionId]/role-attestations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "reviewer-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "coordinateur", activeRole: "coordinateur" });
    canManageActionMock.mockReturnValue(true);
    canManageActionsGloballyMock.mockReturnValue(false);
    loadActionByIdMock.mockResolvedValue(action);
    loadActionOrganizerRowsMock.mockResolvedValue([{ organizer_clerk_id: "reviewer-1", organizer_label: "Reviewer", organizer_handle: null, is_primary: true }]);
    loadActionParticipationReviewPageMock.mockResolvedValue({ items: [{ userId: "volunteer-1", displayName: "Volunteer", handle: null, participationStatus: "confirmed" }], hasMore: false, nextOffset: null });
    loadActionRoleAttestationStateMock.mockResolvedValue({ assignments: [{ user_id: "volunteer-1", role_code: "group_lead" }], attestations: [] });
    reviewActionRoleAttestationMock.mockResolvedValue({ id: "attestation-1", verification_status: "confirmed" });
  });

  it("requires authentication before reading the evidence", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: false });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(401);
    expect(loadActionByIdMock).not.toHaveBeenCalled();
  });

  it("does not expose pending or absent participants to a volunteer", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "volunteer-1" });
    canManageActionMock.mockReturnValue(false);
    loadActionParticipationReviewPageMock.mockResolvedValue({ items: [], hasMore: false, nextOffset: null });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(403);
  });

  it("returns a bounded reviewer page and its stable continuation", async () => {
    loadActionParticipationReviewPageMock.mockResolvedValueOnce({
      items: [{ userId: "volunteer-1", displayName: "Volunteer", handle: null, participationStatus: "confirmed" }],
      hasMore: true,
      nextOffset: 102,
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/action-1/role-attestations?limit=2&offset=100"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(loadActionParticipationReviewPageMock).toHaveBeenCalledWith(undefined, expect.objectContaining({ limit: 2, offset: 100, userId: undefined }));
    await expect(response.json()).resolves.toMatchObject({ pagination: { hasMore: true, nextOffset: 102 } });
  });

  it("forces a volunteer lookup to the authenticated participant identity", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "volunteer-1" });
    canManageActionMock.mockReturnValue(false);
    loadActionParticipationReviewPageMock.mockResolvedValue({
      items: [{ userId: "volunteer-1", displayName: "Volunteer", handle: null, participationStatus: "confirmed" }],
      hasMore: false,
      nextOffset: null,
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/action-1/role-attestations?limit=100&offset=100"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(loadActionParticipationReviewPageMock).toHaveBeenCalledWith(undefined, expect.objectContaining({ limit: 1, offset: 0, userId: "volunteer-1" }));
  });

  it("keeps self-review pending and delegates the transaction to the RPC", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "volunteer-1" });
    const query = participantQuery("confirmed");
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn(() => query) });
    loadActionOrganizerRowsMock.mockResolvedValue([{ organizer_clerk_id: "volunteer-1", organizer_label: "Volunteer", organizer_handle: null, is_primary: true }]);
    const pending = { id: "attestation-1", verification_status: "pending", revision: 1 };
    reviewActionRoleAttestationMock.mockResolvedValue(pending);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ userId: "volunteer-1", roleCode: "group_lead", decision: "confirm" }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(reviewActionRoleAttestationMock).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ userId: "volunteer-1", roleCode: "group_lead" }));
    await expect(response.json()).resolves.toMatchObject({ attestation: { verification_status: "pending" } });
  });

  it("allows an authorized reviewer to confirm only a final participant", async () => {
    const query = participantQuery("confirmed");
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn(() => query) });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ userId: "volunteer-1", roleCode: "group_lead", decision: "confirm" }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(reviewActionRoleAttestationMock).toHaveBeenCalledTimes(1);
  });

  it("passes an identical terminal confirmation retry to the idempotent RPC", async () => {
    loadActionRoleAttestationStateMock.mockResolvedValue({
      assignments: [{ user_id: "volunteer-1", role_code: "group_lead" }],
      attestations: [{
        id: "attestation-1",
        user_id: "volunteer-1",
        role_code: "group_lead",
        verification_status: "confirmed",
        reviewer_clerk_id: "reviewer-1",
        decision_reason: null,
      }],
    });
    reviewActionRoleAttestationMock.mockResolvedValue({ id: "attestation-1", verification_status: "confirmed", revision: 1 });
    const query = participantQuery("confirmed");
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn(() => query) });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ userId: "volunteer-1", roleCode: "group_lead", decision: "confirm" }),
    }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(reviewActionRoleAttestationMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ attestation: { revision: 1, verification_status: "confirmed" } });
  });

  it("rejects a non-idempotent terminal correction without a reason before the RPC", async () => {
    loadActionRoleAttestationStateMock.mockResolvedValue({
      assignments: [{ user_id: "volunteer-1", role_code: "group_lead" }],
      attestations: [{
        id: "attestation-1",
        user_id: "volunteer-1",
        role_code: "group_lead",
        verification_status: "confirmed",
        reviewer_clerk_id: "reviewer-2",
        decision_reason: null,
      }],
    });
    const query = participantQuery("confirmed");
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn(() => query) });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ userId: "volunteer-1", roleCode: "group_lead", decision: "confirm" }),
    }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(409);
    expect(reviewActionRoleAttestationMock).not.toHaveBeenCalled();
  });
});
