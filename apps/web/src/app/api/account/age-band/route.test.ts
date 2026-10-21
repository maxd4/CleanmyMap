import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const getUserOptionalConsentEligibilityMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const updateUserMetadataMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({
  requireActionRequestAccess: requireActionRequestAccessMock,
}));
vi.mock("@/lib/minor-consent-server", () => ({
  getUserOptionalConsentEligibility: getUserOptionalConsentEligibilityMock,
}));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

function request(body: unknown) {
  return new Request("http://localhost/api/account/age-band", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/account/age-band", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getUserOptionalConsentEligibilityMock.mockResolvedValue({
      ageBand: "unknown",
      parentalConsentVerified: false,
    });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({ privateMetadata: {} }),
        updateUserMetadata: updateUserMetadataMock.mockImplementation(async (_userId, update) => ({
          privateMetadata: update.privateMetadata,
        })),
      },
    });
  });

  it("returns unknown for an authenticated account without collecting exact birth data", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/account/age-band"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ageBand: "unknown", parentalConsentVerified: false });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects anonymous access and does not mutate Clerk", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: false, status: 401 });
    const { PATCH } = await import("./route");

    expect((await PATCH(request({ ageBand: "15_or_over" }))).status).toBe(401);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it("stores only the under-15 age band and revokes the optional leaderboard treatment", async () => {
    const update = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn(() => ({ update })) });
    const { PATCH } = await import("./route");

    const response = await PATCH(request({ ageBand: "under_15" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ageBand: "under_15", parentalConsentVerified: false });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ leaderboard_public_opt_in: false }));
    expect(updateUserMetadataMock).toHaveBeenCalledWith("user-1", {
      privateMetadata: { cleanmymap_age_band: "under_15" },
    });
  });

  it("does not allow the client to write parental verification or arbitrary age data", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(request({ ageBand: "15_or_over", parentalConsentVerified: true }));

    expect(response.status).toBe(422);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it("does not revoke the optional treatment for an eligible 15-plus declaration", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(request({ ageBand: "15_or_over" }));

    expect(response.status).toBe(200);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
