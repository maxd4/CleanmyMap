import { describe, expect, it } from "vitest";
import {
  getActionParisDate,
  isActionStartInFuture,
  isJoinableFuturePreAction,
  isPublishedFuturePreAction,
} from "./temporal";

describe("action temporal contract", () => {
  const now = new Date("2026-09-14T09:00:00.000Z"); // 11:00 in Europe/Paris

  it("uses the local action date and start time at the exact boundary", () => {
    expect(isActionStartInFuture({ action_date: "2026-09-14", event_start_time: "11:00" }, now)).toBe(false);
    expect(isActionStartInFuture({ action_date: "2026-09-14", event_start_time: "11:01" }, now)).toBe(true);
    expect(isActionStartInFuture({ action_date: "2026-09-15", event_start_time: null }, now)).toBe(true);
    expect(isActionStartInFuture({ action_date: "2026-09-14", event_start_time: "10:59" }, now)).toBe(false);
  });

  it("uses the Europe/Paris calendar date around UTC midnight", () => {
    const afterParisMidnight = new Date("2026-09-13T22:30:00.000Z");
    expect(getActionParisDate(afterParisMidnight)).toBe("2026-09-14");
    expect(
      isActionStartInFuture(
        { action_date: "2026-09-14", event_start_time: "00:15" },
        afterParisMidnight,
      ),
    ).toBe(false);
  });

  it("keeps the boundary deterministic in summer and winter time", () => {
    expect(
      isActionStartInFuture(
        { action_date: "2026-07-02", event_start_time: "00:00" },
        new Date("2026-07-01T20:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isActionStartInFuture(
        { action_date: "2026-01-02", event_start_time: "00:00" },
        new Date("2026-01-01T23:00:00.000Z"),
      ),
    ).toBe(false);
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
    expect(isPublishedFuturePreAction({ ...base, moderation_visibility: "hidden", published_at: "2026-09-14T08:00:00Z" }, now)).toBe(false);
    expect(isPublishedFuturePreAction({ ...base, moderation_visibility: undefined, published_at: "2026-09-14T08:00:00Z" }, now)).toBe(false);
    expect(isPublishedFuturePreAction({ ...base, status: "rejected", published_at: "2026-09-14T08:00:00Z" }, now)).toBe(false);
  });

  it("distinguishes a public future pre-action from a joinable one", () => {
    const action = {
      action_date: "2026-09-15",
      event_start_time: "09:00",
      action_phase: "pre_action" as const,
      status: "approved" as const,
      moderation_visibility: "visible" as const,
      published_at: "2026-09-14T08:00:00Z",
    };
    expect(isPublishedFuturePreAction(action, now)).toBe(true);
    expect(isJoinableFuturePreAction(action, { groupJoinEnabled: true }, now)).toBe(true);
    expect(isJoinableFuturePreAction(action, { groupJoinEnabled: false }, now)).toBe(false);
  });
});
