import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("referral summary cache boundary", () => {
  it("does not persist one Vercel cache entry per user", () => {
    const source = readFileSync(new URL("./referrals-cache.ts", import.meta.url), "utf8");

    expect(source).not.toContain("unstable_cache");
    expect(source).not.toContain("REFERRAL_SUMMARY_CACHE_REVALIDATE_SECONDS");
  });
});
