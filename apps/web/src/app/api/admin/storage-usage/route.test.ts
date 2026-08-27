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
    warnings: [] as string[],
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
    warnings: [] as string[],
    timestamp: "2026-05-20T12:00:00.000Z",
    snapshotMonth: "2026-05-01",
    snapshotPersisted: true,
  })),
);
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const StorageUsageCaptureErrorMock = vi.hoisted(
  () =>
    class StorageUsageCaptureErrorMock extends Error {
      readonly stage: "capture" | "post_write";
      readonly partialMutation: boolean;

      constructor(params: {
        stage: "capture" | "post_write";
        partialMutation: boolean;
      }) {
        super("raw storage error");
        this.stage = params.stage;
        this.partialMutation = params.partialMutation;
      }
    },
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

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/supabase/storage-usage-service", () => ({
  captureStorageUsageReport: captureStorageUsageReportMock,
  loadStorageUsageReport: loadStorageUsageReportMock,
  StorageUsageCaptureError: StorageUsageCaptureErrorMock,
}));

import { GET, POST } from "./route";

describe("admin storage usage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captureStorageUsageReportMock.mockResolvedValue({
      current: {
        totalBytes: 5_000,
        objectCount: 2,
        usagePercent: 50,
      },
      history: [{ snapshotMonth: "2026-05-01" }],
      comparison: { previousSnapshotMonth: null },
      warnings: [] as string[],
      timestamp: "2026-05-20T12:00:00.000Z",
      snapshotMonth: "2026-05-01",
      snapshotPersisted: true,
    });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
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
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
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
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      actorUserId: "admin-1",
      operationType: "admin_operation",
      outcome: "success",
      details: {
        operation: "capture_storage_usage_snapshot",
        stage: "post_write",
        snapshotMonth: "2026-05-01",
        snapshotPersisted: true,
      },
    });
    expect(Object.keys(appendAdminOperationAuditMock.mock.calls[0]?.[0].details ?? {})).toEqual([
      "operation",
      "stage",
      "snapshotMonth",
      "snapshotPersisted",
    ]);
  });

  it("preserves the response when the snapshot is not persisted and audits the error", async () => {
    captureStorageUsageReportMock.mockResolvedValueOnce({
      current: { totalBytes: 5_000, objectCount: 2, usagePercent: 50 },
      history: [],
      comparison: { previousSnapshotMonth: null },
      warnings: ["Impossible d'enregistrer l'historique mensuel du stockage."] as string[],
      timestamp: "2026-05-20T12:00:00.000Z",
      snapshotMonth: "2026-05-01",
      snapshotPersisted: false,
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      outcome: "error",
      details: {
        operation: "capture_storage_usage_snapshot",
        stage: "post_write",
        partialMutation: false,
        code: "snapshot_not_persisted",
      },
    });
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "Impossible d'enregistrer",
    );
  });

  it("audits a known post-write failure as a partial mutation", async () => {
    captureStorageUsageReportMock.mockRejectedValueOnce(
      new StorageUsageCaptureErrorMock({ stage: "post_write", partialMutation: true }),
    );

    const response = await POST();

    expect(response.status).toBe(503);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
    expect(audit).toMatchObject({
      outcome: "error",
      details: {
        operation: "capture_storage_usage_snapshot",
        stage: "post_write",
        partialMutation: true,
        code: "capture_failed",
      },
    });
    expect(JSON.stringify(audit)).not.toContain("raw storage error");
  });

  it("audits capture failures without exposing raw errors", async () => {
    captureStorageUsageReportMock.mockRejectedValueOnce(
      new Error("raw storage provider error"),
    );

    const response = await POST();

    expect(response.status).toBe(503);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
    expect(audit).toMatchObject({
      outcome: "error",
      details: {
        operation: "capture_storage_usage_snapshot",
        stage: "capture",
        partialMutation: false,
        code: "capture_failed",
      },
    });
    expect(JSON.stringify(audit)).not.toContain("raw storage provider error");
  });
});
