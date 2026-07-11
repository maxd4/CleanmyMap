import { describe, expect, it } from "vitest";
import {
  buildServiceHealthSummary,
  buildServiceIncidentTimeline,
  enrichServiceStatuses,
} from "./health";
import { SERVICE_DEFINITIONS } from "./registry";

describe("service health helpers", () => {
  it("enriches definitions with severity and status message", () => {
    const services = enrichServiceStatuses(SERVICE_DEFINITIONS, (id) => {
      if (id === "supabase") return "missing";
      if (id === "vercel") return "external";
      return "ready";
    });

    expect(services["supabase"]?.severity).toBe("critical");
    expect(services["supabase"]?.statusMessage).toContain("n'est pas configure");
    expect(services["vercel"]?.severity).toBe("warning");
  });

  it("builds a degraded summary when a critical service is missing", () => {
    const summary = buildServiceHealthSummary(
      {
        supabase: {
          state: "missing",
          label: "Supabase",
          description: "DB",
          category: "critical",
          severity: "critical",
          statusMessage: "missing",
        },
        clerk: {
          state: "ready",
          label: "Clerk",
          description: "Auth",
          category: "critical",
          severity: "ok",
          statusMessage: "ready",
        },
        sentry: {
          state: "defer",
          label: "Sentry",
          description: "Obs",
          category: "optional",
          severity: "warning",
          statusMessage: "warning",
        },
      },
      "2026-05-13T10:00:00.000Z",
    );

    expect(summary).toEqual({
      globalState: "degraded",
      criticalReadyCount: 1,
      criticalAlertCount: 1,
      optionalAlertCount: 1,
      externalTrackedCount: 0,
      generatedAt: "2026-05-13T10:00:00.000Z",
    });
  });

  it("builds a short incident timeline ordered by severity", () => {
    const timeline = buildServiceIncidentTimeline(
      {
        supabase: {
          state: "missing",
          label: "Supabase",
          description: "DB",
          category: "critical",
          severity: "critical",
          statusMessage: "critical message",
        },
        sentry: {
          state: "defer",
          label: "Sentry",
          description: "Obs",
          category: "optional",
          severity: "warning",
          statusMessage: "warning message",
        },
      },
      "2026-05-13T10:00:00.000Z",
    );

    expect(timeline).toHaveLength(2);
    expect(timeline[0]?.service).toBe("Supabase");
    expect(timeline[0]?.severity).toBe("critical");
    expect(timeline[1]?.severity).toBe("warning");
  });
});
