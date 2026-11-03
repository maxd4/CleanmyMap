import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getEligibilityMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/minor-consent-server", () => ({ getUserOptionalConsentEligibility: getEligibilityMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

import { GET, PATCH } from "./route";

function setupChain() {
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    upsert: vi.fn(),
    single: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.upsert.mockReturnValue(chain);
  getSupabaseServerClientMock.mockReturnValue(chain);
  return chain;
}

describe("territorial legend consent route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getEligibilityMock.mockResolvedValue({ ageBand: "15_or_over", parentalConsentVerified: false });
  });

  it("keeps the consent private and disabled by default", async () => {
    const chain = setupChain();
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await GET();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ enabled: false, ageBand: "unknown", activatedAt: null });
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("refuses activation when the age gate is not satisfied", async () => {
    getEligibilityMock.mockResolvedValue({ ageBand: "unknown", parentalConsentVerified: false });
    const response = await PATCH(new Request("http://localhost/api/users/profile/territorial-legend-consent", {
      method: "PATCH",
      body: JSON.stringify({ enabled: true }),
      headers: { "Content-Type": "application/json" },
    }));
    expect(response.status).toBe(403);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("records a fresh activation boundary and clears it on revocation", async () => {
    const chain = setupChain();
    chain.single
      .mockResolvedValueOnce({ data: { enabled: true, age_band: "15_or_over", activated_at: "2026-11-03T12:00:00.000Z", revoked_at: null, updated_at: "2026-11-03T12:00:00.000Z" }, error: null })
      .mockResolvedValueOnce({ data: { enabled: false, age_band: "15_or_over", activated_at: null, revoked_at: "2026-11-03T12:01:00.000Z", updated_at: "2026-11-03T12:01:00.000Z" }, error: null });

    const enabled = await PATCH(new Request("http://localhost/api/users/profile/territorial-legend-consent", { method: "PATCH", body: JSON.stringify({ enabled: true }) }));
    expect(enabled.status).toBe(200);
    expect(chain.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", enabled: true, revoked_at: null }), { onConflict: "user_id" });
    expect((await enabled.json()).activatedAt).toBeTruthy();

    const revoked = await PATCH(new Request("http://localhost/api/users/profile/territorial-legend-consent", { method: "PATCH", body: JSON.stringify({ enabled: false }) }));
    expect(revoked.status).toBe(200);
    expect(chain.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ user_id: "user-1", enabled: false, activated_at: null }), { onConflict: "user_id" });
    expect((await revoked.json()).enabled).toBe(false);
  });
});
