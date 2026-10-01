import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAuthenticatedAccessMock,
  getSupabaseServerClientMock,
  getUserProgressionMock,
  loadGamificationReconciliationInboxMock,
  isGamificationReconciliationNotificationIdMock,
} = vi.hoisted(() => ({
  requireAuthenticatedAccessMock: vi.fn(),
  getSupabaseServerClientMock: vi.fn(),
  getUserProgressionMock: vi.fn(),
  loadGamificationReconciliationInboxMock: vi.fn(),
  isGamificationReconciliationNotificationIdMock: vi.fn((value: unknown) =>
    typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)),
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
  loadGamificationReconciliationInbox: loadGamificationReconciliationInboxMock,
  isGamificationReconciliationNotificationId: isGamificationReconciliationNotificationIdMock,
}));

import { GET } from "./route";

describe("GET /api/gamification/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getUserProgressionMock.mockResolvedValue({ level: 1 });
    loadGamificationReconciliationInboxMock.mockResolvedValue({ history: [], pending: null, targeted: null });
  });

  it("returns 401 and does not create a privileged client for anonymous access", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const response = await GET(new Request("http://localhost/api/gamification/me"));

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(getUserProgressionMock).not.toHaveBeenCalled();
    expect(loadGamificationReconciliationInboxMock).not.toHaveBeenCalled();
  });

  it("uses the authenticated access userId for the progression and notice reads", async () => {
    const supabase = { from: vi.fn() };
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const response = await GET(new Request("http://localhost/api/gamification/me"));

    expect(response.status).toBe(200);
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(getUserProgressionMock).toHaveBeenCalledWith(supabase, "user-1");
    expect(loadGamificationReconciliationInboxMock).toHaveBeenCalledWith(supabase, "user-1", null);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({ reconciliation: null, reconciliationHistory: [], reconciliationTarget: null });
  });

  it("passes only a valid opaque notification identity to targeted receipt resolution", async () => {
    const supabase = { from: vi.fn() };
    const notificationId = "11111111-1111-4111-8111-111111111111";
    getSupabaseServerClientMock.mockReturnValue(supabase);
    loadGamificationReconciliationInboxMock.mockResolvedValue({
      history: [],
      pending: null,
      targeted: { notificationId },
    });

    const response = await GET(new Request(`http://localhost/api/gamification/me?receipt=${notificationId}`));

    expect(response.status).toBe(200);
    expect(loadGamificationReconciliationInboxMock).toHaveBeenCalledWith(supabase, "user-1", notificationId);
    await expect(response.json()).resolves.toMatchObject({ reconciliationTarget: { notificationId } });
  });

  it("fails closed for a composite or malformed receipt query parameter", async () => {
    const supabase = { from: vi.fn() };
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const response = await GET(new Request("http://localhost/api/gamification/me?receipt=user-1%7Cxp%3D48%7Cchanges%3Dsecret"));

    expect(response.status).toBe(200);
    expect(loadGamificationReconciliationInboxMock).toHaveBeenCalledWith(supabase, "user-1", null);
    await expect(response.json()).resolves.toMatchObject({ reconciliationTarget: null });
  });
});
