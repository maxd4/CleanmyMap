import { beforeEach, describe, expect, it, vi } from "vitest";

const clerkClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: clerkClientMock,
}));

describe("server-side optional consent eligibility", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("reads only the private age-band and parental-verification flags", async () => {
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          privateMetadata: {
            cleanmymap_age_band: "under_15",
            cleanmymap_parental_consent_verified: false,
            email: "private@example.org",
          },
        }),
      },
    });
    const { getUserOptionalConsentEligibility, isOptionalConsentTreatmentAllowedForUser } = await import("./minor-consent-server");

    const eligibility = await getUserOptionalConsentEligibility("user-1");

    expect(eligibility).toEqual({ ageBand: "under_15", parentalConsentVerified: false });
    expect(await isOptionalConsentTreatmentAllowedForUser("user-1")).toBe(false);
  });

  it("fails closed when Clerk cannot resolve the account", async () => {
    clerkClientMock.mockRejectedValue(new Error("Clerk unavailable"));
    const { getUserOptionalConsentEligibility } = await import("./minor-consent-server");

    await expect(getUserOptionalConsentEligibility("user-1")).resolves.toEqual({
      ageBand: "unknown",
      parentalConsentVerified: false,
    });
  });
});
