import { beforeEach, describe, expect, it, vi } from "vitest";

const countsMock = vi.hoisted(() => vi.fn());
const snapshotMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/gamification/counters", () => ({
  loadGamificationFunnelCounts: countsMock,
}));
vi.mock("@/lib/public-surface-snapshot-service", () => ({
  loadOrRefreshPublicSurfaceSnapshot: snapshotMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: supabaseMock,
}));

import { GET } from "./route";

beforeEach(() => {
  countsMock.mockReset();
  snapshotMock.mockReset();
  supabaseMock.mockReset();
  supabaseMock.mockReturnValue({ id: "supabase" });
  snapshotMock.mockImplementation(async (options: { buildPayload: () => Promise<unknown> }) => ({
    payload: await options.buildPayload(),
  }));
});

describe("GET /api/gamification/analytics/funnel", () => {
  it("projects the public funnel from the CURRENT counters, including zero-base conversion", async () => {
    countsMock.mockResolvedValue({
      totalUsers: 0,
      usersWithXp: 0,
      usersWithBadges: 2,
      usersHighActivity: 1,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.funnel.map((stage: { conversion: number }) => stage.conversion)).toEqual([100, 0, 200, 100]);
    expect(countsMock).toHaveBeenCalledWith({ id: "supabase" });
    expect(response.headers.get("cache-control")).toContain("public");
  });

  it("calculates rounded conversions and exposes loader failures as API errors", async () => {
    countsMock.mockResolvedValue({
      totalUsers: 3,
      usersWithXp: 1,
      usersWithBadges: 2,
      usersHighActivity: 1,
    });
    const success = await GET();
    expect((await success.json()).funnel.map((stage: { conversion: number }) => stage.conversion))
      .toEqual([100, 33.3, 66.7, 33.3]);

    countsMock.mockRejectedValue(new Error("counter unavailable"));
    const failure = await GET();
    expect(failure.status).toBeGreaterThanOrEqual(400);
  });
});
