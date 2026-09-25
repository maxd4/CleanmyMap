import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("ISR cache contract", () => {
  it("does not put personal, query-text, or precise-coordinate lanes in the Data Cache", () => {
    const highCardinalityRoutes = [
      "src/app/api/actions/prefill/route.ts",
      "src/app/api/geo/address-suggestions/route.ts",
      "src/app/api/geo/reverse-location/route.ts",
      "src/app/api/gamification/me/route.ts",
      "src/app/api/gamification/analytics/points/route.ts",
      "src/app/api/users/profile/display-name-mode/route.ts",
      "src/lib/chat/user-search.ts",
      "src/lib/gamification/referral-lineage.ts",
      "src/lib/gamification/referrals-cache.ts",
    ];

    for (const relativePath of highCardinalityRoutes) {
      expect(readSource(relativePath), relativePath).not.toContain("unstable_cache");
    }
  });

  it("keeps community event caches shared and invalidated by mutations", () => {
    const events = readSource("src/app/api/community/events/route.ts");
    const reportEvents = readSource("src/lib/community/report-events.ts");
    const routePressure = readSource("src/lib/route/route-event-pressure-loader.ts");

    expect(events).toContain("limit:${limit}");
    expect(events).not.toContain("user:${userId}");
    expect(events).toContain("COMMUNITY_EVENTS_CACHE_TAG");
    expect(reportEvents).toContain("REPORT_COMMUNITY_EVENTS_CACHE_TAG");
    expect(routePressure).toContain("ROUTE_EVENT_PRESSURE_CACHE_TAG");
  });

  it("uses a shared invalidation tag for the public action cache", () => {
    const cache = readSource("src/lib/actions/unified-source/unified-source-cache.ts");
    const invalidation = readSource("src/lib/public-surface-snapshots.ts");

    expect(cache).toContain("UNIFIED_ACTION_CONTRACTS_CACHE_TAG");
    expect(invalidation).toContain("revalidateUnifiedActionContractsCache");
  });
});
