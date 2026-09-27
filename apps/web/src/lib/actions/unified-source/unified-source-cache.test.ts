import { describe, expect, it } from "vitest";
import { buildUnifiedActionContractsCacheKey } from "./cache-key";

describe("unified source cache key", () => {
  it("encodes the query shape used by pilotage and reports views", () => {
    const key = buildUnifiedActionContractsCacheKey({
      limit: 2200,
      status: "approved",
      floorDate: "2025-06-01",
      requireCoordinates: false,
      types: ["action", "spot"],
    });

    expect(key).toContain("limit:2200");
    expect(key).toContain("status:approved");
    expect(key).toContain("floor:2025-06-01");
    expect(key).toContain("coords:0");
    expect(key).toContain("types:action,spot");
  });

  it("treats empty type filters as the same cache lane as all types", () => {
    const emptyKey = buildUnifiedActionContractsCacheKey({
      limit: 1000,
      status: null,
      floorDate: null,
      requireCoordinates: false,
      types: [],
    });
    const allKey = buildUnifiedActionContractsCacheKey({
      limit: 1000,
      status: null,
      floorDate: null,
      requireCoordinates: false,
      types: null,
    });

    expect(emptyKey).toBe(allKey);
    expect(emptyKey).toContain("types:all");
  });

  it("keeps distinct authorized action corpora in distinct cache lanes", () => {
    const organizerA = buildUnifiedActionContractsCacheKey({
      limit: 1000,
      status: "approved",
      floorDate: null,
      requireCoordinates: false,
      types: ["action"],
      actionIds: ["action-a"],
    });
    const organizerB = buildUnifiedActionContractsCacheKey({
      limit: 1000,
      status: "approved",
      floorDate: null,
      requireCoordinates: false,
      types: ["action"],
      actionIds: ["action-b"],
    });
    const emptyScope = buildUnifiedActionContractsCacheKey({
      limit: 1000,
      status: "approved",
      floorDate: null,
      requireCoordinates: false,
      types: ["action"],
      actionIds: [],
    });
    const global = buildUnifiedActionContractsCacheKey({
      limit: 1000,
      status: "approved",
      floorDate: null,
      requireCoordinates: false,
      types: ["action"],
      actionIds: null,
    });

    expect(organizerA).not.toBe(organizerB);
    expect(organizerA).not.toBe(global);
    expect(emptyScope).not.toBe(global);
    expect(emptyScope).toContain("actionIds:empty");
  });
});
