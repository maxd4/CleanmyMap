import { describe, expect, it } from "vitest";
import { computeReportModel } from "./compute-report-model";
import type { ActionListItem } from "@/lib/actions/types";

const item = (id: string, volunteers: number | null, collectors: number | null, waste: number | null) => ({
  id,
  created_at: "2026-11-01T00:00:00Z",
  actor_name: null,
  action_date: "2026-11-01",
  location_label: "Paris",
  latitude: null,
  longitude: null,
  waste_kg: waste,
  cigarette_butts: null,
  volunteers_count: volunteers,
  collectors_count: collectors,
  duration_minutes: 30,
  notes: null,
  status: "approved",
} as ActionListItem);

describe("report collector projections", () => {
  it("distinguishes present people, known collectors, and calculated collective averages", () => {
    const report = computeReportModel({
      allItems: [],
      approvedItems: [item("known", 20, 12, 100), item("unknown", 5, null, 10)],
      mapItems: [],
      events: [],
      now: new Date("2026-11-20T00:00:00Z"),
    });

    expect(report.totals.presentPeopleCount).toBe(25);
    expect(report.totals.volunteers).toBe(25);
    expect(report.totals.presentPeopleAvailability).toBe("complete");
    expect(report.totals.collectorsCount).toBe(12);
    expect(report.totals.collectorsCountKnownActions).toBe(1);
    expect(report.totals.collectorsCountAvailability).toBe("partial");
    expect(report.totals.calculatedWasteKgPerCollector).toBe(100 / 12);
    expect(report.monthRows12[0]).toMatchObject({ presentPeopleCount: 25, collectorsCount: 12, collectorsCountAvailability: "partial" });
  });

  it("keeps a known zero collector count distinct from unavailable data", () => {
    const report = computeReportModel({
      allItems: [],
      approvedItems: [item("zero", 20, 0, 0)],
      mapItems: [],
      events: [],
      now: new Date("2026-11-20T00:00:00Z"),
    });

    expect(report.totals.collectorsCount).toBe(0);
    expect(report.totals.collectorsCountAvailability).toBe("complete");
    expect(report.totals.calculatedWasteKgPerCollector).toBeNull();
  });
});
