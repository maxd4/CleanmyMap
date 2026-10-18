import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  identity: vi.fn(),
  organizers: vi.fn(),
  loadAction: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: mocks.access }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: mocks.identity }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadCanonicalActionOrganizerIdsForAction: mocks.organizers }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: mocks.loadAction }));
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

beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue({ ok: true, userId: "user-owner" });
  mocks.identity.mockResolvedValue(null);
  mocks.organizers.mockResolvedValue([]);
  mocks.loadAction.mockResolvedValue(action);
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.from.mockReturnValue({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: { created_at: "2026-10-18T10:00:00Z", revoked_at: null }, error: null }) }),
    }),
  });
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
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { action_id: action.id, revoked_at: null }, error: null }) }),
      }),
    });
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

    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { action_id: action.id, revoked_at: "2026-10-18T11:00:00Z" }, error: null }) }),
      }),
    });
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
});
