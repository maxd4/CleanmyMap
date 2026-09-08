import { describe, expect, it, vi } from "vitest";
import { GOVERNANCE_MONTHLY_JOB_VERSION, runGovernanceMonthlyJob } from "./governance-monthly-job";

function report(version = GOVERNANCE_MONTHLY_JOB_VERSION) {
  return {
    id: "governance-2026-09-01",
    reportKey: "cleanmymap-governance",
    reportMonth: "2026-09-01",
    generatedAt: "2026-09-01T03:00:00.000Z",
    version,
    title: "Rapport mensuel de gouvernance",
    payload: {} as never,
  };
}

describe("runGovernanceMonthlyJob", () => {
  it("consomme le snapshot PLATFORM_USAGE sans relancer ses captures", async () => {
    const captureReport = vi.fn(async () => report());
    const platformSnapshot = {
      id: "platform-usage-weekly:2026-09-07",
      snapshotKey: "platform-usage-weekly",
      snapshotDate: "2026-09-07",
      generatedAt: "2026-09-07T03:00:00.000Z",
      version: "platform-usage-2026.09-v1",
      title: "Usage plateforme hebdomadaire",
      payload: {
        capturedAt: "2026-09-07T03:00:00.000Z",
        weekStart: "2026-09-07",
        storageUsage: { source: "storage" } as never,
        environmentalImpact: { source: "impact" } as never,
      },
      meta: {},
    };

    const result = await runGovernanceMonthlyJob({
      now: new Date("2026-09-08T10:00:00.000Z"),
      readReport: async () => null,
      readPlatformUsageSnapshot: async () => platformSnapshot,
      captureReport,
    });

    expect(result.status).toBe("captured");
    expect(captureReport).toHaveBeenCalledWith({
      environmentalImpact: { source: "impact" },
      storageUsage: { source: "storage" },
      generatedAt: "2026-09-08T10:00:00.000Z",
    });
  });

  it("réutilise le rapport du mois et échoue explicitement sans snapshot source", async () => {
    const reused = await runGovernanceMonthlyJob({
      now: new Date("2026-09-08T10:00:00.000Z"),
      readReport: async (month) => {
        expect(month).toBe("2026-09-01");
        return report();
      },
    });
    expect(reused).toEqual({ status: "reused", report: report() });

    await expect(
      runGovernanceMonthlyJob({
        now: new Date("2026-09-08T10:00:00.000Z"),
        readReport: async () => null,
        readPlatformUsageSnapshot: async () => null,
      }),
    ).rejects.toThrow("aucun snapshot PLATFORM_USAGE");
  });
});
