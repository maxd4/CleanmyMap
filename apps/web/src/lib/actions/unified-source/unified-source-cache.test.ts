import { describe, expect, it } from "vitest";
import { buildUnifiedActionContractsCacheKey } from "./unified-source-cache";

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
});
