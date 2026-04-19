import { describe, expect, it } from "vitest";
import { computeEventConversions } from "./conversions";
import { makeAction, makeEvent } from "./test-fixtures";

describe("computeEventConversions (module)", () => {
  it("links actions to events using EVENT_REF and computes funnel rates", () => {
    const events = [
      makeEvent({
        id: "event-001",
        rsvpCounts: { yes: 10, maybe: 2, no: 1, total: 13 },
        attendanceCount: 8,
      }),
    ];
    const actions = [
      makeAction({ id: "a-1", notes: "Cleanup [EVENT_REF]event-001" }),
      makeAction({ id: "a-2", notes: "[EVENT_REF]event-001" }),
    ];

    const result = computeEventConversions(events, actions);
    expect(result.rows[0]?.linkedActions).toBe(2);
    expect(result.rows[0]?.rsvpToAttendanceRate).toBe(80);
    expect(result.summary.rsvpToActionRate).toBe(20);
  });
});
