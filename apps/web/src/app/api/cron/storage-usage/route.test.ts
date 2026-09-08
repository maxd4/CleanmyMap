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

const cronAuthState = vi.hoisted(() => ({
  isConfigured: true,
  isAuthorized: true,
}));

vi.mock("@/lib/http/cron-auth", () => ({
  hasValidCronAuth: () => cronAuthState.isAuthorized,
  isCronSecretConfigured: () => cronAuthState.isConfigured,
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
  });
});
