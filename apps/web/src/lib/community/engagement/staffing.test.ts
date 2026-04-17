import { describe, expect, it } from "vitest";
import { computeEventStaffingPlan } from "./staffing";
import { makeEvent } from "./test-fixtures";

describe("computeEventStaffingPlan (module)", () => {
  it("flags red risk when event is close and staffing is insufficient", () => {
    const plan = computeEventStaffingPlan(
      [
        makeEvent({
          id: "ev-gap",
          eventDate: "2026-04-13",
          capacityTarget: 40,
          rsvpCounts: { yes: 6, maybe: 10, no: 0, total: 16 },
        }),
      ],
      new Date("2026-04-11T08:00:00.000Z"),
    );

    expect(plan.rows.length).toBe(1);
    expect(plan.rows[0]?.riskLevel).toBe("rouge");
    expect(plan.rows[0]?.staffingGap).toBeGreaterThan(0);
    expect(plan.summary.atRiskCount).toBe(1);
  });
});
