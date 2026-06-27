import { beforeEach, describe, expect, it, vi } from "vitest";

const loadStorageUsageReportMock = vi.hoisted(() =>
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

const requireAdminAccessMock = vi.hoisted(() =>
  vi.fn(async () => ({ ok: true, userId: "admin-1" })),
);

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: () => new Response("forbidden", { status: 403 }),
}));

vi.mock("@/lib/supabase/storage-usage-service", () => ({
  captureStorageUsageReport: captureStorageUsageReportMock,
  loadStorageUsageReport: loadStorageUsageReportMock,
}));

import { GET, POST } from "./route";

describe("admin storage usage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current stored storage report for admins", async () => {
    const response = await GET();
    const payload = (await response.json()) as {
      status: string;
      current: { totalBytes: number; objectCount: number; usagePercent: number };
      snapshotPersisted: boolean;
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.current.totalBytes).toBe(5_000);
    expect(payload.snapshotPersisted).toBe(true);
    expect(loadStorageUsageReportMock).toHaveBeenCalledTimes(1);
    expect(captureStorageUsageReportMock).not.toHaveBeenCalled();
    expect(requireAdminAccessMock).toHaveBeenCalledTimes(1);
  });

  it("lets admins refresh the snapshot manually", async () => {
    const response = await POST();
    const payload = (await response.json()) as {
      status: string;
      current: { totalBytes: number; objectCount: number; usagePercent: number };
      snapshotPersisted: boolean;
      triggeredBy: string;
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.triggeredBy).toBe("manual-refresh");
    expect(payload.current.totalBytes).toBe(5_000);
    expect(payload.snapshotPersisted).toBe(true);
    expect(captureStorageUsageReportMock).toHaveBeenCalledTimes(1);
    expect(requireAdminAccessMock).toHaveBeenCalledTimes(1);
  });
});
