import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const getEligibilityMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: requireActionRequestAccessMock }));
vi.mock("@/lib/minor-consent-server", () => ({ getUserOptionalConsentEligibility: getEligibilityMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

import { GET, PATCH } from "./route";

function setupChain() {
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    rpc: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  getSupabaseServerClientMock.mockReturnValue(chain);
  return chain;
}

describe("territorial legend consent route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getEligibilityMock.mockResolvedValue({ ageBand: "15_or_over", parentalConsentVerified: false });
  });

  it("keeps the consent private and disabled by default", async () => {
    const chain = setupChain();
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await GET(new Request("http://localhost/api/users/profile/territorial-legend-consent"));
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
    chain.rpc
      .mockResolvedValueOnce({ data: { enabled: true, age_band: "15_or_over", activated_at: "2026-11-03T12:00:00.000Z", revoked_at: null, updated_at: "2026-11-03T12:00:00.000Z" }, error: null })
      .mockResolvedValueOnce({ data: { enabled: false, age_band: "15_or_over", activated_at: "2026-11-03T12:00:00.000Z", revoked_at: "2026-11-03T12:01:00.000Z", updated_at: "2026-11-03T12:01:00.000Z" }, error: null });

    const enabled = await PATCH(new Request("http://localhost/api/users/profile/territorial-legend-consent", { method: "PATCH", body: JSON.stringify({ enabled: true }) }));
    expect(enabled.status).toBe(200);
    expect(chain.rpc).toHaveBeenCalledWith("set_territorial_legend_consent", expect.objectContaining({ p_user_id: "user-1", p_enabled: true, p_age_band: "15_or_over" }));
    expect((await enabled.json()).activatedAt).toBeTruthy();

    const revoked = await PATCH(new Request("http://localhost/api/users/profile/territorial-legend-consent", { method: "PATCH", body: JSON.stringify({ enabled: false }) }));
    expect(revoked.status).toBe(200);
    expect(chain.rpc).toHaveBeenLastCalledWith("set_territorial_legend_consent", expect.objectContaining({ p_user_id: "user-1", p_enabled: false, p_age_band: "15_or_over" }));
    expect((await revoked.json()).enabled).toBe(false);
  });

  it("accepts the same current-user boundary for a Clerk mobile bearer request", async () => {
    const chain = setupChain();
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    const request = new Request("http://localhost/api/users/profile/territorial-legend-consent", {
      headers: { Authorization: "Bearer native-session-token" },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(requireActionRequestAccessMock).toHaveBeenCalledWith(request);
  });

  it("rejects an unauthorized cookie or bearer request before reading consent", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: false, status: 401 });
    const response = await GET(new Request("http://localhost/api/users/profile/territorial-legend-consent"));

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("rejects strict, malformed PATCH payloads before the eligibility or database boundary", async () => {
    const response = await PATCH(new Request("http://localhost/api/users/profile/territorial-legend-consent", {
      method: "PATCH",
      body: JSON.stringify({ enabled: "yes", extra: true }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(422);
    expect(getEligibilityMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("maps read and write persistence failures without exposing database details", async () => {
    const readChain = setupChain();
    readChain.maybeSingle.mockResolvedValue({ data: null, error: new Error("private database detail") });
    const readResponse = await GET(new Request("http://localhost/api/users/profile/territorial-legend-consent"));
    expect(readResponse.status).toBe(500);
    expect((await readResponse.json()).error).not.toContain("private database detail");

    const writeChain = setupChain();
    writeChain.rpc.mockResolvedValue({ data: null, error: new Error("private rpc detail") });
    const writeResponse = await PATCH(new Request("http://localhost/api/users/profile/territorial-legend-consent", {
      method: "PATCH",
      body: JSON.stringify({ enabled: true }),
      headers: { "Content-Type": "application/json" },
    }));
    expect(writeResponse.status).toBe(500);
    expect((await writeResponse.json()).error).not.toContain("private rpc detail");
  });
});
