import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const requireRlsMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/supabase/clerk-rls", () => ({
  requireSupabaseClerkRlsClient: requireRlsMock,
}));

describe("/api/users/profile/leaderboard-opt-in", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
  });

  it("keeps the default private and lets the owner enable it", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: { leaderboard_public_opt_in: false }, error: null })
      .mockResolvedValueOnce({ data: { leaderboard_public_opt_in: true }, error: null });
    const chain = {
      select: vi.fn(() => chain),
      update: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle,
    };
    requireRlsMock.mockResolvedValue({ from: vi.fn(() => chain) });
    const { GET, PATCH } = await import("./route");

    const before = await GET();
    const after = await PATCH(
      new Request("http://localhost/api/users/profile/leaderboard-opt-in", {
        method: "PATCH",
        body: JSON.stringify({ leaderboardPublicOptIn: true }),
      }),
    );

    expect((await before.json()).leaderboardPublicOptIn).toBe(false);
    expect((await after.json()).leaderboardPublicOptIn).toBe(true);
    expect(chain.eq).toHaveBeenCalledWith("id", "user-1");
  });
});
