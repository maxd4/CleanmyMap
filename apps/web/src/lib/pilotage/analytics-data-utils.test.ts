import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "../actions/data-contract";
import { aggregateMonthlyAnalytics } from "./analytics-data-utils";

function makeContract(
  id: string,
  type: "action" | "spot" | "clean_place",
  wasteKg: number,
  volunteersCount: number,
) {
  return buildActionDataContract({
    id,
    type,
    status: "approved",
    source: "test",
    observedAt: "2026-04-09",
    createdAt: "2026-04-08T10:00:00.000Z",
    locationLabel: "Paris 10e",
    latitude: 48.87,
    longitude: 2.35,
    wasteKg,
    volunteersCount,
  });
}

describe("aggregateMonthlyAnalytics", () => {
  it("aggregates only approved actions when non-action contracts have metrics", () => {
    const action = makeContract("action", "action", 10, 3);
    const spot = makeContract("spot", "spot", 999, 99);
    const cleanPlace = makeContract("clean-place", "clean_place", 888, 88);

    expect(aggregateMonthlyAnalytics([action, spot, cleanPlace])).toEqual(
      aggregateMonthlyAnalytics([action]),
    );
  });
});
