import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAuthenticatedAccessMock,
  getSupabaseServerClientMock,
  getUserProgressionMock,
  loadPendingGamificationReconciliationMock,
} = vi.hoisted(() => ({
  requireAuthenticatedAccessMock: vi.fn(),
  getSupabaseServerClientMock: vi.fn(),
  getUserProgressionMock: vi.fn(),
  loadPendingGamificationReconciliationMock: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/gamification/progression", () => ({
  getUserProgression: getUserProgressionMock,
}));
vi.mock("@/lib/gamification/gamification-reconciliation-notice", () => ({
  loadPendingGamificationReconciliation: loadPendingGamificationReconciliationMock,
}));

import { GET } from "./route";

describe("GET /api/gamification/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getUserProgressionMock.mockResolvedValue({ level: 1 });
    loadPendingGamificationReconciliationMock.mockResolvedValue(null);
  });

  it("returns 401 and does not create a privileged client for anonymous access", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(getUserProgressionMock).not.toHaveBeenCalled();
    expect(loadPendingGamificationReconciliationMock).not.toHaveBeenCalled();
  });

  it("uses the authenticated access userId for the progression and notice reads", async () => {
    const supabase = { from: vi.fn() };
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(getUserProgressionMock).toHaveBeenCalledWith(supabase, "user-1");
    expect(loadPendingGamificationReconciliationMock).toHaveBeenCalledWith(supabase, "user-1");
  });
});
