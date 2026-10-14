import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mobileAuth: vi.fn(),
  getSupabase: vi.fn(),
  loadJoinable: vi.fn(),
  loadHistory: vi.fn(),
  join: vi.fn(),
  claim: vi.fn(),
  fetchUnified: vi.fn(),
  toPublic: vi.fn((value: unknown) => value),
  rpc: vi.fn(),
  rebuildBadges: vi.fn(),
  refreshProgression: vi.fn(),
}));

vi.mock("@/lib/auth/mobile-bearer", () => ({ requireMobileAuthenticatedAccess: mocks.mobileAuth }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabase }));
vi.mock("@/lib/actions/participation/group-participation", () => ({
  loadJoinableActions: mocks.loadJoinable,
  loadUserParticipationHistory: mocks.loadHistory,
  joinActionParticipation: mocks.join,
}));
vi.mock("@/lib/actions/participation/post-action-claims", () => ({ claimFinishedActionParticipation: mocks.claim }));
vi.mock("@/lib/actions/unified-source", () => ({ fetchUnifiedActionContracts: mocks.fetchUnified }));
vi.mock("@/lib/actions/data-contract", () => ({ toPublicActionListItem: mocks.toPublic }));
vi.mock("@/lib/gamification/progression-tracking", () => ({ refreshProgressionProfile: mocks.refreshProgression }));
vi.mock("@/lib/gamification/badges/rebuild", () => ({ rebuildUserGamificationBadges: mocks.rebuildBadges }));

import { GET, POST } from "./route";

const future = { id: "future-1", location_label: "Lyon", actionTitle: "Berges", action_date: "2099-01-01", status: "approved" };

function request(url: string, init?: RequestInit) {
  return new Request(`https://cleanmymap.test${url}`, init);
}

describe("/api/mobile/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mobileAuth.mockResolvedValue({ ok: true, userId: "user-mobile" });
    mocks.getSupabase.mockReturnValue({ rpc: mocks.rpc });
    mocks.loadJoinable.mockResolvedValue([future]);
    mocks.loadHistory.mockResolvedValue([]);
    mocks.fetchUnified.mockResolvedValue({ items: [] });
    mocks.rpc.mockResolvedValue({ data: [{ registration_id: "registration-1" }], error: null });
    mocks.join.mockResolvedValue({ participationStatus: "pending", joinedAt: "now", participantsCount: 1 });
    mocks.rebuildBadges.mockResolvedValue(undefined);
    mocks.refreshProgression.mockResolvedValue(undefined);
  });

  it("requires a verified native bearer session", async () => {
    mocks.mobileAuth.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    expect((await GET(request("/api/mobile/actions"))).status).toBe(401);
    expect(mocks.loadJoinable).not.toHaveBeenCalled();
  });

  it("returns future actions, private invitations and history through the bounded projection", async () => {
    const response = await GET(request("/api/mobile/actions?q=lyon&view=future"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      future: [future],
      past: [],
      invitations: [{ registration_id: "registration-1" }],
    });
    expect(mocks.loadJoinable).toHaveBeenCalledWith(expect.anything(), { limit: 12, userId: "user-mobile" });
  });

  it("projects completed actions through the past view and search filter", async () => {
    const completed = {
      type: "action",
      metadata: { actionPhase: "post_action_complete" },
      dates: { observedAt: "2020-01-01", eventStartTime: null },
      id: "past-1",
      location_label: "Lyon",
      actionTitle: "Berges nettoyées",
    };
    mocks.fetchUnified.mockResolvedValue({ items: [completed] });
    mocks.toPublic.mockImplementation((value: unknown) => value);

    const response = await GET(request("/api/mobile/actions?view=past&q=berges"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ future: [], past: [completed] });
    expect(mocks.loadJoinable).not.toHaveBeenCalled();
    expect(mocks.fetchUnified).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ limit: 48 }));
  });

  it("creates a pending registration for the authenticated user without turning it into presence", async () => {
    const response = await POST(request("/api/mobile/actions", {
      method: "POST",
      headers: { Authorization: "Bearer native-jwt", "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: "future-1", intent: "join" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.join).toHaveBeenCalledWith(expect.anything(), {
      actionId: "future-1",
      userId: "user-mobile",
      isAdminLike: false,
    });
    await expect(response.json()).resolves.toMatchObject({ intent: "join", participationStatus: "pending" });
  });

  it("refreshes the authenticated progression after a confirmed registration", async () => {
    mocks.join.mockResolvedValue({ participationStatus: "confirmed", joinedAt: "now", participantsCount: 2 });

    const response = await POST(request("/api/mobile/actions", {
      method: "POST",
      headers: { Authorization: "Bearer native-jwt", "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: "future-1", intent: "join" }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.rebuildBadges).toHaveBeenCalledWith(expect.anything(), "user-mobile");
    expect(mocks.refreshProgression).toHaveBeenCalledWith(expect.anything(), "user-mobile");
  });

  it("rejects an expired session before any mutation", async () => {
    mocks.mobileAuth.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const response = await POST(request("/api/mobile/actions", {
      method: "POST",
      headers: { Authorization: "Bearer expired-jwt", "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: "future-1", intent: "join" }),
    }));
    expect(response.status).toBe(401);
    expect(mocks.join).not.toHaveBeenCalled();
  });
});
