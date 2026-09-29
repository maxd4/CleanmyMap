import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const requireRlsMock = vi.hoisted(() => vi.fn());

function makeMutationChain(data: unknown, error: Error | null = null) {
  const chain = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  return chain;
}

async function patchPreference(value: boolean) {
  const { PATCH } = await import("./route");
  return PATCH(new Request("http://localhost/api/users/profile/leaderboard-opt-in", {
    method: "PATCH",
    body: JSON.stringify({ leaderboardPublicOptIn: value }),
  }));
}

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/supabase/clerk-rls", () => ({ requireSupabaseClerkRlsClient: requireRlsMock }));

describe("/api/users/profile/leaderboard-opt-in", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
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
    const after = await PATCH(new Request("http://localhost/api/users/profile/leaderboard-opt-in", { method: "PATCH", body: JSON.stringify({ leaderboardPublicOptIn: true }) }));
    expect((await before.json()).leaderboardPublicOptIn).toBe(false);
    expect((await after.json()).leaderboardPublicOptIn).toBe(true);
    expect(chain.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("lets the owner opt out again without exposing private profile fields", async () => {
    const chain = makeMutationChain({ leaderboard_public_opt_in: false });
    requireRlsMock.mockResolvedValue({ from: vi.fn(() => chain) });
    const response = await patchPreference(false);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "updated", leaderboardPublicOptIn: false });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ leaderboard_public_opt_in: false }));
    expect(JSON.stringify(body)).not.toMatch(/userId|email|metadata|xpPending|role/iu);
  });

  it("returns a server error when the profile preference mutation fails", async () => {
    const chain = makeMutationChain(null, new Error("profile write failed"));
    requireRlsMock.mockResolvedValue({ from: vi.fn(() => chain) });
    const response = await patchPreference(true);

    expect(response.status).toBe(500);
  });

  it("rejects anonymous GET and PATCH before touching RLS", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const { GET, PATCH } = await import("./route");
    expect((await GET()).status).toBe(401);
    expect((await PATCH(new Request("http://localhost/api/users/profile/leaderboard-opt-in", { method: "PATCH", body: "{}" }))).status).toBe(401);
    expect(requireRlsMock).not.toHaveBeenCalled();
  });
});
