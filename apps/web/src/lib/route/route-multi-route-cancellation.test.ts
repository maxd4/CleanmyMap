import { describe, expect, it, vi } from "vitest";
import { partitionRouteCandidates } from "./route-group-partition";
import { routePartitionedGroups } from "./route-multi-route";
import { ROUTE_TERRITORIAL_GUIDED_VERSION } from "./route-planning-mode";

vi.mock("./fossgis-foot-routing", () => ({
  routePolylineThroughFossgisFoot: vi.fn(),
  FOSSGIS_QUOTA_INTERVAL_MS: 1000,
}));

const origin = { latitude: 48.8566, longitude: 2.3522, source: "browser" as const };

describe("multi-route cancellation", () => {
  it("stops before routing the next group when the quota wait is aborted", async () => {
    const partition = partitionRouteCandidates({
      origin,
      candidates: [],
      volunteers: 10,
      groupCount: 2,
      travelBudgetMinutes: 60,
      maxStops: 6,
      priorityVsTravel: 65,
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: { totalMinutes: 90, organizationMarginMinutes: 15, minimumCollectionMinutes: 45, travelMaxMinutes: 30 },
        groups: [
          { sector: { center: { ...origin }, radiusKm: 1 }, waypoints: [] },
          { sector: { center: { ...origin }, radiusKm: 1 }, waypoints: [] },
        ],
      },
    });
    const controller = new AbortController();
    const waitForQuotaInterval = vi.fn(async () => controller.abort());

    await expect(routePartitionedGroups({
      origin,
      candidates: [],
      partition,
      travelBudgetMinutes: 60,
      waitForQuotaInterval,
      signal: controller.signal,
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(waitForQuotaInterval).toHaveBeenCalledTimes(1);
  });
});
