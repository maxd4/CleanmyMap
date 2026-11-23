import { describe, expect, it } from "vitest";
import { isActionFinalizationEligible } from "./finalization-eligibility";

const now = new Date("2026-06-15T12:00:00.000Z");
const action = {
  action_date: "2026-06-15",
  action_phase: "pre_action" as const,
  status: "approved" as const,
  event_end_at: null,
  action_timezone: "Europe/Paris",
};

describe("isActionFinalizationEligible", () => {
  it("uses the persisted end instant when it exists", () => {
    expect(isActionFinalizationEligible({ ...action, event_end_at: "2026-06-15T11:59:59.000Z" }, now)).toBe(true);
    expect(isActionFinalizationEligible({ ...action, event_end_at: "2026-06-15T12:00:01.000Z" }, now)).toBe(false);
  });

  it("falls back to an expired local civil date in the action timezone", () => {
    expect(isActionFinalizationEligible({ ...action, action_date: "2026-06-15", action_timezone: "Pacific/Kiritimati" }, now)).toBe(true);
    expect(isActionFinalizationEligible({ ...action, action_date: "2026-06-15", action_timezone: "America/Los_Angeles" }, now)).toBe(false);
    expect(isActionFinalizationEligible({ ...action, action_date: "2026-06-14", action_timezone: "Pacific/Kiritimati" }, now)).toBe(true);
  });

  it.each([
    { status: "cancelled" as const },
    { status: "rejected" as const },
    { action_phase: "post_action_complete" as const },
    { action_date: "invalid" },
  ])("rejects terminal or invalid action state $status/$action_phase/$action_date", (override) => {
    expect(isActionFinalizationEligible({ ...action, ...override }, new Date("2026-06-16T12:00:00.000Z"))).toBe(false);
  });
});
