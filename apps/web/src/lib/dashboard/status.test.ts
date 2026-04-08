import { describe, expect, it } from "vitest";
import { serviceLevelLabel, summarizeUptime, type UptimePayload } from "./status";

describe("dashboard status helpers", () => {
  it("summarizes healthy payload", () => {
    const payload: UptimePayload = {
      status: "ok",
      timestamp: "2026-04-02T00:00:00.000Z",
      checks: {
        app: "ok",
        supabase: "configured",
        clerk: "configured",
        sentry: "configured",
      },
      categories: {
        critical: {
          app: "ok",
          supabase: "configured",
          clerk: "configured",
        },
        optional: {
          sentry: "configured",
        },
      },
    };
    expect(summarizeUptime(payload)).toEqual({
      state: "healthy",
      configuredCount: 4,
      missingCount: 0,
      warningCount: 0,
      criticalConfiguredCount: 3,
      criticalMissingCount: 0,
      optionalConfiguredCount: 1,
      optionalWarningCount: 0,
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
      checks: {
        app: "ok",
        supabase: "missing",
        clerk: "configured",
        sentry: "missing",
      },
      categories: {
        critical: {
          app: "ok",
          supabase: "missing",
          clerk: "configured",
        },
        optional: {
          sentry: "missing",
        },
      },
    };
    expect(summarizeUptime(payload)).toEqual({
      state: "degraded",
      configuredCount: 2,
      missingCount: 2,
      warningCount: 0,
      criticalConfiguredCount: 2,
      criticalMissingCount: 1,
      optionalConfiguredCount: 0,
      optionalWarningCount: 1,
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
