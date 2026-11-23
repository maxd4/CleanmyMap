import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getUserOptionalConsentEligibilityMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());
const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/minor-consent-server", () => ({ getUserOptionalConsentEligibility: getUserOptionalConsentEligibilityMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

const actionId = "11111111-1111-4111-8111-111111111111";

describe("/api/actions/[actionId]/participant-visibility", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "holder-1" });
    getUserOptionalConsentEligibilityMock.mockResolvedValue({
      status: "verified", ageBand: "15_or_over", parentalConsentVerified: false,
    });
    maybeSingleMock.mockResolvedValue({ data: { consented_at: "2026-11-01", revoked_at: null, age_eligible: true }, error: null });
    rpcMock.mockResolvedValue({ data: true, error: null });
    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleMock,
      })),
      rpc: rpcMock,
    });
  });

  it("returns only the current holder's consent with private no-store headers", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.test"), { params: Promise.resolve({ actionId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ enabled: true });
    expect(maybeSingleMock).toHaveBeenCalled();
  });

  it("requires authentication and never calls the privileged store for anonymous access", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false, status: 401 });
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.test"), { params: Promise.resolve({ actionId }) });

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("lets only the authenticated account change its opt-in and fails closed for minors", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("https://example.test", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    }), { params: Promise.resolve({ actionId }) });

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("set_action_participant_visibility_consent", {
      p_action_id: actionId, p_user_id: "holder-1", p_enabled: true, p_age_eligible: true,
    });

    getUserOptionalConsentEligibilityMock.mockResolvedValue({
      status: "verified", ageBand: "under_15", parentalConsentVerified: false,
    });
    const ineligible = await PATCH(new Request("https://example.test", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    }), { params: Promise.resolve({ actionId }) });
    expect(ineligible.status).toBe(403);
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("revokes through the same holder-scoped RPC", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("https://example.test", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    }), { params: Promise.resolve({ actionId }) });

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("set_action_participant_visibility_consent", {
      p_action_id: actionId, p_user_id: "holder-1", p_enabled: false, p_age_eligible: false,
    });
  });
});
