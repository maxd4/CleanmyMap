import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const summaryMock = vi.hoisted(() => vi.fn());
const ensureMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/gamification/referrals/referrals-cache", () => ({
  fetchCachedReferralSummary: summaryMock,
}));
vi.mock("@/lib/gamification/referrals/referrals", () => ({
  ensureReferralInviteForUser: ensureMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: supabaseMock,
}));

import { GET, POST } from "./route";

beforeEach(() => {
  authMock.mockReset();
  summaryMock.mockReset();
  ensureMock.mockReset();
  supabaseMock.mockReset();
  authMock.mockResolvedValue({ userId: "user-1" });
  supabaseMock.mockReturnValue({ id: "supabase" });
  summaryMock.mockResolvedValue({ invited: 2, accepted: 1 });
  ensureMock.mockResolvedValue({ created: true, summary: { invited: 3, accepted: 1 } });
});

describe("/api/gamification/referrals", () => {
  it("reads the cached summary without opening a privileged client", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", summary: { invited: 2, accepted: 1 } });
    expect(summaryMock).toHaveBeenCalledWith("user-1");
    expect(supabaseMock).not.toHaveBeenCalled();
  });

  it("creates the invite through the canonical producer and returns its result", async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      created: true,
      summary: { invited: 3, accepted: 1 },
    });
    expect(ensureMock).toHaveBeenCalledWith({ id: "supabase" }, "user-1");
  });

  it("refuses anonymous reads and writes, and serializes producer errors", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await GET()).status).toBe(401);
    expect((await POST()).status).toBe(401);

    authMock.mockResolvedValue({ userId: "user-1" });
    ensureMock.mockRejectedValue(new Error("producer unavailable"));
    expect((await POST()).status).toBeGreaterThanOrEqual(400);
  });
});
