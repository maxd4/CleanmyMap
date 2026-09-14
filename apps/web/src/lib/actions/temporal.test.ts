import { describe, expect, it } from "vitest";
import { isActionStartInFuture, isPublishedFuturePreAction } from "./temporal";

describe("action temporal contract", () => {
  const now = new Date("2026-09-14T09:00:00.000Z"); // 11:00 in Europe/Paris

  it("uses the local action date and start time at the exact boundary", () => {
    expect(isActionStartInFuture({ action_date: "2026-09-14", event_start_time: "11:00" }, now)).toBe(false);
    expect(isActionStartInFuture({ action_date: "2026-09-14", event_start_time: "11:01" }, now)).toBe(true);
    expect(isActionStartInFuture({ action_date: "2026-09-15", event_start_time: null }, now)).toBe(true);
  });

  it("requires explicit publication and pre-action phase", () => {
    const base = {
      action_date: "2026-09-15",
      event_start_time: "09:00",
      action_phase: "pre_action" as const,
      status: "pending" as const,
      moderation_visibility: "visible" as const,
    };
    expect(isPublishedFuturePreAction({ ...base, published_at: "2026-09-14T08:00:00Z" }, now)).toBe(true);
    expect(isPublishedFuturePreAction({ ...base, published_at: null }, now)).toBe(false);
    expect(isPublishedFuturePreAction({ ...base, action_phase: "post_action_complete", published_at: "2026-09-14T08:00:00Z" }, now)).toBe(false);
  });
});
