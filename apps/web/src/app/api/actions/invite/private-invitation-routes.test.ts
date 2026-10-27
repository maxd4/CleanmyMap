import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashInvitationToken } from "@/lib/actions/private-invitation";
import { parseJsonSafely } from "@/lib/actions/http-errors";

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
  const row = data
    ? {
        registration_status: "confirmed",
        registration_source: "invite_link",
        registration_cancellation_reason: null,
        participation_status: "pending",
        participation_source: "post_action_claim",
        ...data,
      }
    : null;
  const chain: {
    select: () => typeof chain;
    eq: () => typeof chain;
    maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
  } = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: row, error: null }),
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
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ action: { title: "Action privée" } });
    expect(JSON.stringify(body)).not.toContain("NE DOIT PAS SORTIR");
    expect(body).not.toHaveProperty("action.logisticsNotes");
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
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ flow: "pre_action", registrationStatus: "confirmed", registrationSource: "invite_link" });
    expect(mocks.rpc).toHaveBeenCalledWith("request_private_action_registration", expect.objectContaining({ p_action_id: action.id, p_user_id: "user-owner" }));
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it.each([
    {
      message: "private_registration_action_awaiting_finalization",
      status: 409,
      expected: {
        code: "ACTION_AWAITING_FINALIZATION",
        error: "Action en attente de finalisation. Les demandes ouvriront lorsque le bilan sera finalisé.",
      },
    },
    {
      message: "private_registration_already_decided",
      status: 409,
      expected: {
        code: "REGISTRATION_ALREADY_DECIDED",
        error: "Cette inscription a déjà été refusée ou annulée.",
      },
    },
    {
      message: "private_registration_invitation_invalid",
      status: 404,
      expected: { error: "Lien d’invitation invalide, expiré ou révoqué." },
    },
    {
      message: "private_registration_action_unavailable",
      status: 404,
      expected: { error: "Cette action n’est plus disponible pour une demande privée." },
    },
  ])("maps the SQL invitation error $message to its HTTP contract", async ({ message, status, expected }) => {
    const token = "G".repeat(43);
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message, code: "P0001", details: "private SQL detail", hint: "private SQL hint" },
    });
    const { POST } = await import("./[token]/route");

    const response = await POST(buildRequest(`/api/actions/invite/${token}`, { method: "POST" }), {
      params: Promise.resolve({ token }),
    });

    expect(response.status).toBe(status);
    await expect(parseJsonSafely(response)).resolves.toMatchObject(expected);
  });

  it("exposes an awaiting-finalization state without opening registration", async () => {
    const token = "D".repeat(43);
    mocks.loadAction.mockResolvedValue({ ...action, action_date: "2026-10-01", event_start_time: "09:00:00" });
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    const { GET, POST } = await import("./[token]/route");
    const getResponse = await GET(buildRequest(`/api/actions/invite/${token}`), { params: Promise.resolve({ token }) });
    const getBody = await parseJsonSafely(getResponse);
    expect(getResponse.status).toBe(200);
    expect(getBody).toMatchObject({ action: { invitationState: "awaiting_finalization" } });

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
    const body = await parseJsonSafely(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ flow: "post_action_claim", participationStatus: "pending", participationSource: "post_action_claim" });
    expect(mocks.claim).toHaveBeenCalledWith(expect.anything(), {
      actionId: action.id,
      userId: "user-owner",
      tokenHash: hashInvitationToken(token),
    });
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

  it("does not load recipient data for an anonymous preview", async () => {
    const token = "H".repeat(43);
    mocks.access.mockResolvedValueOnce({ ok: false });
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    const { GET } = await import("./[token]/route");
    const response = await GET(buildRequest(`/api/actions/invite/${token}`), { params: Promise.resolve({ token }) });
    const body = await parseJsonSafely(response);
    expect(response.status).toBe(200);
    expect((body as { action?: unknown }).action).toMatchObject({ registrationStatus: null, participationStatus: null });
    expect(mocks.access).toHaveBeenCalledTimes(1);
  });

  it("refuses malformed or closed invitation records without loading private action data", async () => {
    const { GET } = await import("./[token]/route");
    const malformedToken = "I".repeat(43);
    mocks.from.mockReturnValue(invitationFrom({ action_id: 42, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    const malformed = await GET(buildRequest(`/api/actions/invite/${malformedToken}`), { params: Promise.resolve({ token: malformedToken }) });
    expect(malformed.status).toBe(422);
    expect(mocks.loadAction).not.toHaveBeenCalled();

    const closedToken = "J".repeat(43);
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    mocks.loadAction.mockResolvedValueOnce({ ...action, status: "cancelled", action_phase: "pre_action" });
    const closed = await GET(buildRequest(`/api/actions/invite/${closedToken}`), { params: Promise.resolve({ token: closedToken }) });
    expect(closed.status).toBe(404);
  });

  it("fails closed on link and recipient dependency errors without exposing details", async () => {
    const token = "N".repeat(43);
    mocks.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: "private database detail" } }) }),
      }),
    });
    const { GET } = await import("./[token]/route");
    const linkFailure = await GET(buildRequest(`/api/actions/invite/${token}`), { params: Promise.resolve({ token }) });
    expect(linkFailure.status).toBe(500);
    expect(JSON.stringify(await parseJsonSafely(linkFailure))).not.toContain("private database detail");

    mocks.from.mockReturnValue(invitationFrom({
      action_id: action.id,
      revoked_at: null,
      expires_at: "2027-01-18T10:00:00Z",
      registration_status: "unexpected",
    }));
    const recipientFailure = await GET(buildRequest(`/api/actions/invite/${token}`), { params: Promise.resolve({ token }) });
    expect(recipientFailure.status).toBe(422);
    expect(JSON.stringify(await parseJsonSafely(recipientFailure))).not.toContain("unexpected");
  });

  it("projects authenticated post-action recipient state and uses fallback fields", async () => {
    const token = "O".repeat(43);
    mocks.loadAction.mockResolvedValue({
      ...action,
      action_phase: "post_action_complete",
      status: "approved",
      published_at: "2026-10-10T10:00:00Z",
      action_date: "2026-10-01",
      preparation_data: null,
      event_start_time: null,
    });
    mocks.from.mockReturnValue(invitationFrom({
      action_id: action.id,
      revoked_at: null,
      expires_at: "2027-01-18T10:00:00Z",
      participation_status: "confirmed",
      participation_source: "invite_link",
    }));
    const { GET } = await import("./[token]/route");
    const response = await GET(buildRequest(`/api/actions/invite/${token}`), { params: Promise.resolve({ token }) });
    const body = await parseJsonSafely(response);
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      action: {
        title: action.location_label,
        shortDescription: null,
        meetingTime: null,
        pointDeRendezVous: action.location_label,
        participationStatus: "confirmed",
        participationSource: "invite_link",
      },
    });
  });

  it("rejects an invalid registration RPC projection without returning a success", async () => {
    const token = "K".repeat(43);
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    mocks.rpc.mockResolvedValueOnce({ data: [{ registration_status: "not-a-status" }], error: null });
    const { POST } = await import("./[token]/route");
    const response = await POST(buildRequest(`/api/actions/invite/${token}`, { method: "POST" }), { params: Promise.resolve({ token }) });
    expect(response.status).toBe(422);
  });

  it("does not turn an unexpected registration dependency error into success", async () => {
    const token = "P".repeat(43);
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    mocks.rpc.mockRejectedValueOnce(new Error("private registration internals"));
    const { POST } = await import("./[token]/route");
    const response = await POST(buildRequest(`/api/actions/invite/${token}`, { method: "POST" }), { params: Promise.resolve({ token }) });
    expect(response.status).toBe(500);
    expect(JSON.stringify(await parseJsonSafely(response))).not.toContain("private registration internals");
  });

  it.each([
    ["NotFoundError", 404],
    ["ValidationError", 422],
  ] as const)("maps post-action claim %s without leaking dependency details", async (name, status) => {
    const token = `${name === "NotFoundError" ? "L" : "M"}`.repeat(43);
    mocks.loadAction.mockResolvedValueOnce({ ...action, action_phase: "post_action_complete", status: "approved", published_at: "2026-10-10T10:00:00Z", action_date: "2026-10-01" });
    mocks.from.mockReturnValue(invitationFrom({ action_id: action.id, revoked_at: null, expires_at: "2027-01-18T10:00:00Z" }));
    const error = new Error(name === "NotFoundError" ? "private internal detail" : "raison interne");
    error.name = name;
    mocks.claim.mockRejectedValueOnce(error);
    const { POST } = await import("./[token]/route");
    const response = await POST(buildRequest(`/api/actions/invite/${token}`, { method: "POST" }), { params: Promise.resolve({ token }) });
    expect(response.status).toBe(status);
    const body = await parseJsonSafely(response);
    expect(JSON.stringify(body)).not.toContain("private internal detail");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
