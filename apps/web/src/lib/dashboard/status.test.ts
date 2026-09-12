import { describe, expect, it } from "vitest";
import {
  serviceLevelLabel,
  summarizeUptime,
  type UptimePayload,
} from "./status";

describe("dashboard status helpers", () => {
  it("summarizes healthy payload", () => {
    const payload: UptimePayload = {
      status: "ok",
      timestamp: "2026-04-02T00:00:00.000Z",
      criticalStatus: "ok",
      optionalStatus: "ok",
      criticalConfiguredCount: 3,
      criticalAlertCount: 0,
      optionalConfiguredCount: 1,
      optionalAlertCount: 0,
    };
    expect(summarizeUptime(payload)).toEqual({
      state: "healthy",
      criticalConfiguredCount: 3,
      criticalAlertCount: 0,
      optionalConfiguredCount: 1,
      optionalAlertCount: 0,
      criticalStatus: "ok",
      optionalStatus: "ok",
    });
  });

  it("summarizes degraded payload", () => {
    const payload: UptimePayload = {
      status: "degraded",
      criticalStatus: "degraded",
      optionalStatus: "warning",
      timestamp: "2026-04-02T00:00:00.000Z",
      criticalConfiguredCount: 2,
      criticalAlertCount: 1,
      optionalConfiguredCount: 0,
      optionalAlertCount: 1,
    };
    expect(summarizeUptime(payload)).toEqual({
      state: "degraded",
      criticalConfiguredCount: 2,
      criticalAlertCount: 1,
      optionalConfiguredCount: 0,
      optionalAlertCount: 1,
      criticalStatus: "degraded",
      optionalStatus: "warning",
    });
  });

  it("maps service labels", () => {
    expect(serviceLevelLabel("add")).toBe("ok");
    expect(serviceLevelLabel("add_external")).toBe("ok");
    expect(serviceLevelLabel("defer")).toBe("warning");
    expect(serviceLevelLabel("missing")).toBe("warning");
  });
});
