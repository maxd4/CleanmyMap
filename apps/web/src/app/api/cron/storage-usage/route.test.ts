import { describe, expect, it, vi } from "vitest";

const captureStorageUsageReportMock = vi.hoisted(() =>
  vi.fn(async () => ({
    current: {
      totalBytes: 5_000,
      objectCount: 2,
      usagePercent: 50,
    },
    history: [{ snapshotMonth: "2026-05-01" }],
    comparison: { previousSnapshotMonth: null },
    warnings: [],
    timestamp: "2026-05-20T12:00:00.000Z",
    snapshotMonth: "2026-05-01",
    snapshotPersisted: true,
  })),
);

const captureEnvironmentalImpactDashboardMock = vi.hoisted(() =>
  vi.fn(async () => ({
    status: "ok",
    model: {
      infrastructure: {
        monthlyKgCo2eProxy: 2.5,
        services: [
          { key: "supabase", label: "Supabase", monthlyKgCo2eProxy: 2.5 },
        ],
      },
    },
    signals: { generatedAt: "2026-05-20T12:00:00.000Z" },
    snapshots: [],
    version: "environmental-impact-estimator-2026.05-v1",
  })),
);

const captureGovernanceMonthlyReportMock = vi.hoisted(() =>
  vi.fn(async () => ({
    id: "governance-2026-05-01",
    reportKey: "cleanmymap-governance",
    reportMonth: "2026-05-01",
    generatedAt: "2026-05-20T12:00:00.000Z",
    version: "governance-monthly-report-2026.05-v1",
    title: "Rapport mensuel de gouvernance",
    payload: {
      generatedAt: "2026-05-20T12:00:00.000Z",
      reportMonth: "2026-05-01",
      reportMonthLabel: "mai 2026",
      summary: [],
      impact: {
        monthlyKgCo2eProxy: 2.5,
        confidencePercent: 90,
        snapshotCount: 1,
        latestSnapshotDate: "2026-05-20",
        topServiceLabel: "Supabase",
        topServiceMonthlyKgCo2eProxy: 2.5,
        topServiceDeltaKgCo2eProxy: 0,
        growthHighlights: [],
      },
      storage: {
        totalBytes: 5_000,
        totalLabel: "5 KB",
        remainingBytes: 5_000,
        remainingLabel: "5 KB",
        usagePercent: 50,
        objectCount: 2,
        snapshotCount: 1,
        latestSnapshotMonth: "2026-05-01",
        deltaBytes: 0,
        deltaPercent: null,
        topBucketLabel: null,
        topBucketBytes: 0,
        topExtensionLabel: null,
        topExtensionBytes: 0,
        growthHighlights: [],
      },
      notes: [],
    },
  })),
);

const cronAuthState = vi.hoisted(() => ({
  isConfigured: true,
  isAuthorized: true,
}));

vi.mock("@/lib/http/cron-auth", () => ({
  hasValidCronAuth: () => cronAuthState.isAuthorized,
  isCronSecretConfigured: () => cronAuthState.isConfigured,
}));

vi.mock("@/lib/environmental-impact-estimator/dashboard-capture", () => ({
  captureEnvironmentalImpactDashboard: captureEnvironmentalImpactDashboardMock,
}));

vi.mock("@/lib/governance/governance-monthly-report", () => ({
  captureGovernanceMonthlyReport: captureGovernanceMonthlyReportMock,
}));

vi.mock("@/lib/supabase/storage-usage-service", () => ({
  captureStorageUsageReport: captureStorageUsageReportMock,
}));

import { GET } from "./route";

describe("cron storage usage route", () => {
  it("rejects requests without a configured cron secret", async () => {
    cronAuthState.isConfigured = false;
    cronAuthState.isAuthorized = true;

    const response = await GET(new Request("http://localhost/api/cron/storage-usage"));

    expect(response.status).toBe(401);
    expect(captureStorageUsageReportMock).not.toHaveBeenCalled();
  });

  it("returns the storage capture when the cron secret is valid", async () => {
    cronAuthState.isConfigured = true;
    cronAuthState.isAuthorized = true;

    const response = await GET(
      new Request("http://localhost/api/cron/storage-usage", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    const payload = (await response.json()) as {
      status: string;
      triggeredBy: string;
      current: { totalBytes: number; objectCount: number; usagePercent: number };
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.triggeredBy).toBe("vercel-cron");
    expect(payload.current.totalBytes).toBe(5_000);
    expect(captureStorageUsageReportMock).toHaveBeenCalled();
    expect(captureEnvironmentalImpactDashboardMock).toHaveBeenCalledWith({
      userId: null,
      historyLimit: 12,
    });
    expect(captureGovernanceMonthlyReportMock).toHaveBeenCalled();
  });
});
