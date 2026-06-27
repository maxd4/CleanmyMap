import { describe, expect, it } from "vitest";
import { buildReferralSummaryCacheKey } from "./referrals-cache";

describe("referral summary cache key", () => {
  it("namespaces cache entries by user id", () => {
    expect(buildReferralSummaryCacheKey("user-1")).toBe("user:user-1");
  });
});
