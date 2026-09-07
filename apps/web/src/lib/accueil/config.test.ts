import { describe, expect, it } from "vitest";
import { buildHomeMetrics } from "./config";

describe("buildHomeMetrics", () => {
  it("uses canonical participantsTotal for the main participants KPI", () => {
    const metrics = buildHomeMetrics(
      {
        wasteKg: 1,
        butts: 2,
        volunteers: 999,
        co2AvoidedKg: 3,
        waterSavedLiters: 4,
        euroSaved: 5,
      },
      true,
      12,
    );

    expect(metrics.find((metric) => metric.key === "volunteers")?.value).toBe(
      "12",
    );
  });
});
