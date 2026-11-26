import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "../actions/data-contract";
import { aggregateMonthlyAnalytics } from "./analytics-data-utils";

function makeContract(
  id: string,
  type: "action" | "spot" | "clean_place",
  wasteKg: number | null,
  volunteersCount: number | null,
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

  it("keeps monthly waste coverage separate from measured mass", () => {
    const points = aggregateMonthlyAnalytics([
      makeContract("known", "action", 10, 3),
      makeContract("unknown", "action", null, 2),
    ]);

    expect(points[0]).toMatchObject({
      kg: 10,
      actionCount: 2,
      wasteKnownActions: 1,
      wasteCoverageRate: 50,
      volunteersKnownActions: 2,
    });
  });

  it("preserves explicitly declared zero and distinguishes missing participation", () => {
    const [point] = aggregateMonthlyAnalytics([makeContract("zero", "action", 0, 0), makeContract("missing", "action", null, null)]);
    expect(point).toMatchObject({ kg: 0, volunteers: 0, actionCount: 2, wasteKnownActions: 1, volunteersKnownActions: 1 });
  });

  it("emits explicit empty-month gaps between populated months and returns [] for empty corpus", () => {
    expect(aggregateMonthlyAnalytics([])).toEqual([]);

    const jan = buildActionDataContract({
      id: "jan",
      type: "action",
      status: "approved",
      source: "test",
      observedAt: "2026-01-15",
      createdAt: "2026-01-15T10:00:00.000Z",
      locationLabel: "Paris 10e",
      latitude: 48.87,
      longitude: 2.35,
      wasteKg: 12,
      volunteersCount: 4,
    });
    const apr = makeContract("apr", "action", 8, 2);

    const points = aggregateMonthlyAnalytics([jan, apr]);
    expect(points.map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(points[1]).toMatchObject({ month: "2026-02", actionCount: 0, wasteKnownActions: 0, volunteersKnownActions: 0 });
    expect(points[2]).toMatchObject({ month: "2026-03", actionCount: 0, wasteKnownActions: 0, volunteersKnownActions: 0 });
  });
});
