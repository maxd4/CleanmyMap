import { describe, expect, it } from "vitest";
import { computeFunnelMetricsWithBaseline } from "./funnel-metrics";
import type { FunnelEvent } from "./funnel-store";

const NOW = new Date("2026-04-11T12:00:00.000Z");

function event(
  input: Partial<FunnelEvent> &
    Pick<FunnelEvent, "at" | "sessionId" | "step" | "mode">,
): FunnelEvent {
  return {
    at: input.at,
    sessionId: input.sessionId,
    step: input.step,
    mode: input.mode,
    userId: input.userId ?? null,
    meta: input.meta,
  };
}

describe("computeFunnelMetricsWithBaseline", () => {
  it("computes conversions, baseline deltas and quick completion median", () => {
    const records: FunnelEvent[] = [
      event({
        at: "2026-04-11T10:00:00.000Z",
        sessionId: "s1",
        step: "view_new",
        mode: "quick",
      }),
      event({
        at: "2026-04-11T10:00:08.000Z",
        sessionId: "s1",
        step: "start_form",
        mode: "quick",
      }),
      event({
        at: "2026-04-11T10:00:43.000Z",
        sessionId: "s1",
        step: "submit_success",
        mode: "quick",
      }),
      event({
        at: "2026-04-11T10:20:00.000Z",
        sessionId: "s2",
        step: "view_new",
        mode: "quick",
      }),
      event({
        at: "2026-04-11T10:20:10.000Z",
        sessionId: "s2",
        step: "start_form",
        mode: "quick",
      }),
      event({
        at: "2026-04-11T10:21:40.000Z",
        sessionId: "s2",
        step: "submit_success",
        mode: "quick",
      }),
      event({
        at: "2026-03-25T09:00:00.000Z",
        sessionId: "p1",
        step: "view_new",
        mode: "quick",
      }),
      event({
        at: "2026-03-25T09:00:12.000Z",
        sessionId: "p1",
        step: "start_form",
        mode: "quick",
      }),
    ];

    const result = computeFunnelMetricsWithBaseline({
      records,
      periodDays: 14,
      now: NOW,
    });

    expect(result.current.totals.submits).toBe(2);
    expect(result.previous.totals.submits).toBe(0);
    expect(result.baseline.comparison.submitsDeltaAbs).toBe(2);
    expect(result.baseline.comparison.submitsDeltaPct).toBe(100);

    const quick = result.current.byMode.find((item) => item.mode === "quick");
    expect(quick?.medianCompletionSeconds).toBe(62.5);
    expect(quick?.completionUnder60Rate).toBe(50);
  });
});
