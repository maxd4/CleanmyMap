import { describe, expect, it } from "vitest";
import { computeEventRelances } from "./reminders";
import { makeEvent } from "./test-fixtures";

describe("computeEventRelances (module)", () => {
  it("prioritizes imminent low-fill events as haute", () => {
    const reminders = computeEventRelances(
      [
        makeEvent({
          id: "ev-low",
          eventDate: "2026-04-12",
          capacityTarget: 30,
          rsvpCounts: { yes: 5, maybe: 6, no: 0, total: 11 },
        }),
      ],
      new Date("2026-04-11T08:00:00.000Z"),
    );

    expect(reminders.length).toBe(1);
    expect(reminders[0]?.priority).toBe("haute");
  });
});
