import { describe, expect, it } from "vitest";
import { buildPublicImpactMetrics } from "@/lib/impact/public-impact-kpis";

describe("homepage public Impact metrics", () => {
  it("formats the canonical volunteers counter for the participants KPI", () => {
    const metrics = buildPublicImpactMetrics(
      {
        wasteKg: 1,
        butts: 2,
        volunteers: 999,
        co2: 3,
        water: 4,
        euro: 5,
      },
      true,
    );

    expect(metrics.find((metric) => metric.key === "volunteers")?.value).toBe("999");
  });
});
