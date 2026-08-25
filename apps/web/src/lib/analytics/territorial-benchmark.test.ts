import { describe, expect, it } from "vitest";
import { buildTerritorialBenchmark } from "./territorial-benchmark";

describe("buildTerritorialBenchmark", () => {
  it("ignores approved spot and clean_place metrics", () => {
    const action = {
      type: "action" as const,
      status: "approved" as const,
      locationLabel: "Paris 10e",
      wasteKg: 10,
      volunteersCount: 3,
    };

    expect(
      buildTerritorialBenchmark([
        action,
        {
          type: "spot",
          status: "approved",
          locationLabel: "Paris 10e",
          wasteKg: 999,
          volunteersCount: 99,
        },
        {
          type: "clean_place",
          status: "approved",
          locationLabel: "Paris 10e",
          wasteKg: 888,
          volunteersCount: 88,
        },
      ]),
    ).toEqual(buildTerritorialBenchmark([action]));
  });

  it("ignores pending and rejected action metrics", () => {
    const approvedAction = {
      type: "action" as const,
      status: "approved" as const,
      locationLabel: "Paris 10e",
      wasteKg: 10,
      volunteersCount: 3,
    };

    expect(
      buildTerritorialBenchmark([
        approvedAction,
        {
          ...approvedAction,
          status: "pending",
          wasteKg: 999,
          volunteersCount: 99,
        },
        {
          ...approvedAction,
          status: "rejected",
          wasteKg: 888,
          volunteersCount: 88,
        },
      ]),
    ).toEqual(buildTerritorialBenchmark([approvedAction]));
  });
});
