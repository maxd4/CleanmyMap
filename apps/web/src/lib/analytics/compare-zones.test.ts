import { describe, expect, it } from "vitest";
import { computeZoneCompare } from "./compare-zones";

describe("computeZoneCompare", () => {
  it("computes raw and normalized metrics", () => {
    const result = computeZoneCompare({
      periodDays: 30,
      now: new Date("2026-04-10T00:00:00.000Z"),
      records: [
        {
          observedAt: "2026-04-08",
          locationLabel: "Paris 10e",
          wasteKg: 12,
          butts: 200,
          volunteersCount: 4,
        },
        {
          observedAt: "2026-04-07",
          locationLabel: "Paris 10e",
          wasteKg: 8,
          butts: 80,
          volunteersCount: 3,
        },
        {
          observedAt: "2026-03-01",
          locationLabel: "Paris 10e",
          wasteKg: 3,
          butts: 20,
          volunteersCount: 2,
        },
        {
          observedAt: "2026-04-08",
          locationLabel: "Paris 11e",
          wasteKg: 6,
          butts: 40,
          volunteersCount: 2,
        },
      ],
    });

    expect(result.rows.length).toBeGreaterThan(0);
    const row10 = result.rows.find((row) => row.area === "10e");
    expect(row10).toBeTruthy();
    expect(row10?.kgPerAction).toBeGreaterThan(0);
    expect(row10?.densityActions).toBeGreaterThan(0);
    expect(row10?.recurrenceScore).toBeGreaterThanOrEqual(0);
    expect(result.priorityZones.length).toBeGreaterThan(0);
  });
});
