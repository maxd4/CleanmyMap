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
      },
    };
    expect(summarizeUptime(payload)).toEqual({
      state: "healthy",
      configuredCount: 3,
      missingCount: 0,
    });
  });

  it("summarizes degraded payload", () => {
    const payload: UptimePayload = {
      status: "degraded",
      timestamp: "2026-04-02T00:00:00.000Z",
      checks: {
        app: "ok",
        supabase: "missing",
        clerk: "configured",
      },
    };
    expect(summarizeUptime(payload)).toEqual({
      state: "degraded",
      configuredCount: 2,
      missingCount: 1,
    });
  });

  it("maps service labels", () => {
    expect(serviceLevelLabel("add")).toBe("ok");
    expect(serviceLevelLabel("add_external")).toBe("ok");
    expect(serviceLevelLabel("defer")).toBe("warning");
    expect(serviceLevelLabel("missing")).toBe("warning");
  });
});
