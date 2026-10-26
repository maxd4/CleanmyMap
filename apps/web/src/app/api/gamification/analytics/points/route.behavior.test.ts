import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const analyticsMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/gamification/points/analytics", () => ({
  loadGamificationPointsAnalytics: analyticsMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: supabaseMock,
}));

import { GET } from "./route";

beforeEach(() => {
  authMock.mockReset();
  analyticsMock.mockReset();
  supabaseMock.mockReset();
  authMock.mockResolvedValue({ userId: "user-1" });
  supabaseMock.mockReturnValue({ id: "supabase" });
  analyticsMock.mockResolvedValue({ totalXp: 12, points: [] });
});

describe("GET /api/gamification/analytics/points", () => {
  it("refuses anonymous access before opening Supabase", async () => {
    authMock.mockResolvedValue({ userId: null });
    const response = await GET(new Request("http://localhost/api/gamification/analytics/points"));

    expect(response.status).toBe(401);
    expect(analyticsMock).not.toHaveBeenCalled();
    expect(supabaseMock).not.toHaveBeenCalled();
  });

  it("supports CURRENT scopes and the legacy days compatibility input", async () => {
    const allTime = await GET(new Request("http://localhost/api/gamification/analytics/points?scope=allTime"));
    expect(allTime.status).toBe(200);
    expect(await allTime.json()).toMatchObject({ scope: "allTime", days: null, scopeLabel: "Depuis la création" });
    expect(analyticsMock).toHaveBeenLastCalledWith({ id: "supabase" }, "user-1", null);

    const legacy = await GET(new Request("http://localhost/api/gamification/analytics/points?days=90"));
    expect(legacy.status).toBe(200);
    expect((await legacy.json()).scope).toBe("rolling90d");
    expect(analyticsMock).toHaveBeenLastCalledWith(
      { id: "supabase" },
      "user-1",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  it("falls back safely for malformed scope values and serializes loader errors", async () => {
    const response = await GET(new Request("http://localhost/api/gamification/analytics/points?scope=invalid&days=not-a-number"));
    expect(response.status).toBe(200);
    expect((await response.json()).scope).toBe("rolling30d");

    analyticsMock.mockRejectedValue(new Error("analytics unavailable"));
    const failure = await GET(new Request("http://localhost/api/gamification/analytics/points"));
    expect(failure.status).toBeGreaterThanOrEqual(400);
  });
});
