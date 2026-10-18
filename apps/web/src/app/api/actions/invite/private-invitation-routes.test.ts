import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  identity: vi.fn(),
  organizers: vi.fn(),
  loadAction: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  claim: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: mocks.access }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: mocks.identity }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadCanonicalActionOrganizerIdsForAction: mocks.organizers }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: mocks.loadAction }));
vi.mock("@/lib/actions/participation/post-action-claims", () => ({ claimFinishedActionParticipation: mocks.claim }));
vi.mock("@/lib/actions/participation/claim-audit", () => ({ appendParticipationClaimAudit: mocks.audit }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: () => ({ rpc: mocks.rpc, from: mocks.from }) }));

const action = {
  id: "action-private-1",
  created_by_clerk_id: "user-owner",
  access_mode: "invite_link" as const,
  action_phase: "pre_action" as const,
  status: "pending" as const,
  moderation_visibility: "visible" as const,
  action_date: "2026-11-02",
  event_start_time: "09:00:00",
  location_label: "Quai privé",
  organizer_name: "Collectif test",
  preparation_data: {
    actionTitle: "Action privée",
    shortDescription: "Résumé minimal",
    pointDeRendezVous: "Point de rendez-vous",
    zoneCiblePrevue: "Zone cible",
    meetingTime: "08:45",
    logisticsNotes: "NE DOIT PAS SORTIR",
    safetyInstructions: "NE DOIT PAS SORTIR",
  },
};

function buildRequest(path: string, init?: RequestInit) {
  return new Request(`https://cleanmymap.example${path}`, init);
}

function invitationFrom(data: Record<string, unknown> | null) {
  const chain: {
    select: () => typeof chain;
    eq: () => typeof chain;
    maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
  } = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data, error: null }),
  };
  return chain;
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-18T12:00:00.000Z") });
  vi.resetAllMocks();
  mocks.access.mockResolvedValue({ ok: true, userId: "user-owner" });
  mocks.identity.mockResolvedValue(null);
  mocks.organizers.mockResolvedValue([]);
  mocks.loadAction.mockResolvedValue(action);
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.from.mockReturnValue(invitationFrom({ created_at: "2026-10-18T10:00:00Z", revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("private invitation route boundaries", () => {
  it("rejects an unauthenticated management request before reading the link", async () => {
    mocks.access.mockResolvedValueOnce({ ok: false });
    const { GET } = await import("../[actionId]/invite-link/route");

    const response = await GET(buildRequest("/api/actions/action-private-1/invite-link"), {
      params: Promise.resolve({ actionId: "action-private-1" }),
    });

    if (!response) throw new Error("management GET did not return a response");
    expect(response.status).toBe(401);
    expect(mocks.loadAction).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized creator/organizer boundary", async () => {
    mocks.access.mockResolvedValueOnce({ ok: true, userId: "other-user" });
    const { POST } = await import("../[actionId]/invite-link/route");

    const response = await POST(buildRequest("/api/actions/action-private-1/invite-link", { method: "POST" }), {
      params: Promise.resolve({ actionId: "action-private-1" }),
    });

    if (!response) throw new Error("management POST did not return a response");
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not expose preparation notes through a valid link projection", async () => {
    const token = "A".repeat(43);
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    const { GET } = await import("./[token]/route");

    const response = await GET(buildRequest(`/api/actions/invite/${token}`), {
      params: Promise.resolve({ token }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action.title).toBe("Action privée");
    expect(JSON.stringify(body)).not.toContain("NE DOIT PAS SORTIR");
    expect(body.action).not.toHaveProperty("logisticsNotes");
  });

  it("rejects invalid or revoked tokens and requires Clerk for registration", async () => {
    const { GET, POST } = await import("./[token]/route");
    const invalid = await GET(buildRequest("/api/actions/invite/not-a-token"), {
      params: Promise.resolve({ token: "not-a-token" }),
    });
    expect(invalid.status).toBe(404);
    expect(mocks.from).not.toHaveBeenCalled();

    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: "2026-10-18T11:00:00Z", expires_at: "2027-01-18T10:00:00Z" }));
    const token = "B".repeat(43);
    const revokedGet = await GET(buildRequest(`/api/actions/invite/${token}`), {
      params: Promise.resolve({ token }),
    });
    expect(revokedGet.status).toBe(404);

    mocks.access.mockResolvedValueOnce({ ok: false });
    const unauthenticated = await POST(buildRequest(`/api/actions/invite/${token}`, { method: "POST" }), {
      params: Promise.resolve({ token }),
    });
    expect(unauthenticated.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("confirms an authenticated pre-action registration through the private RPC", async () => {
    const token = "C".repeat(43);
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    mocks.rpc.mockResolvedValueOnce({ data: [{ registration_id: "registration-1", registration_status: "confirmed" }], error: null });
    const { POST } = await import("./[token]/route");

    const response = await POST(buildRequest(`/api/actions/invite/${token}`, { method: "POST" }), {
      params: Promise.resolve({ token }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ flow: "pre_action", registrationStatus: "confirmed", registrationSource: "invite_link" });
    expect(mocks.rpc).toHaveBeenCalledWith("request_private_action_registration", expect.objectContaining({ p_action_id: action.id, p_user_id: "user-owner" }));
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("exposes an awaiting-finalization state without opening registration", async () => {
    const token = "D".repeat(43);
    mocks.loadAction.mockResolvedValue({ ...action, action_date: "2026-10-01", event_start_time: "09:00:00" });
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    const { GET, POST } = await import("./[token]/route");
    const getResponse = await GET(buildRequest(`/api/actions/invite/${token}`), { params: Promise.resolve({ token }) });
    const getBody = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getBody.action.invitationState).toBe("awaiting_finalization");

    const postResponse = await POST(buildRequest(`/api/actions/invite/${token}`, { method: "POST" }), { params: Promise.resolve({ token }) });
    expect(postResponse.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("uses the canonical post-action claim and audit flow after finalization", async () => {
    const token = "E".repeat(43);
    mocks.loadAction.mockResolvedValue({ ...action, action_phase: "post_action_complete", status: "approved", published_at: "2026-10-10T10:00:00Z", action_date: "2026-10-01" });
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }, error: null }) }),
      }),
    });
    mocks.claim.mockResolvedValueOnce({
      participationStatus: "pending",
      participationSource: "post_action_claim",
      alreadyRequested: false,
      previousValue: null,
      newValue: {},
      joinedAt: "2026-10-18T10:00:00Z",
    });
    const { POST } = await import("./[token]/route");
    const response = await POST(buildRequest(`/api/actions/invite/${token}`, { method: "POST" }), { params: Promise.resolve({ token }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ flow: "post_action_claim", participationStatus: "pending", participationSource: "post_action_claim" });
    expect(mocks.claim).toHaveBeenCalledWith(expect.anything(), { actionId: action.id, userId: "user-owner" });
    expect(mocks.audit).toHaveBeenCalledOnce();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects an expired link before loading the action", async () => {
    const token = "F".repeat(43);
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2026-01-18T10:00:00Z" }));
    const { GET } = await import("./[token]/route");
    const response = await GET(buildRequest(`/api/actions/invite/${token}`), { params: Promise.resolve({ token }) });
    expect(response.status).toBe(404);
    expect(mocks.loadAction).not.toHaveBeenCalled();
  });
});
