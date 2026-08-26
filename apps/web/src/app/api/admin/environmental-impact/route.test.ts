import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const EnvironmentalImpactCaptureErrorMock = vi.hoisted(
  () =>
    class extends Error {
      constructor(
        public readonly stage: "capture" | "persistence",
        public readonly targetId?: string,
      ) {
        super("capture failed");
      }
    },
);
const buildSnapshotMock = vi.hoisted(() =>
  vi.fn(() => ({
    id: "snapshot-2026-05-20T12:00:00.000Z",
    snapshotKey: "cleanmymap-project",
    snapshotDate: "2026-05-20",
    generatedAt: "2026-05-20T12:00:00.000Z",
    version: "environmental-impact-estimator-2026.05-v1",
  })),
);
const captureDashboardMock = vi.hoisted(() =>
  vi.fn(async () => ({
    status: "ok",
    model: {
      generatedAt: "2026-05-20T12:00:00.000Z",
      infrastructure: {
        monthlyKgCo2eProxy: 1.23,
        totalKgCo2eProxy: 14.76,
        annualKgCo2eProxy: 14.76,
        confidencePercent: 82,
        uncertaintyPercent: 18,
      },
    },
    signals: { generatedAt: "2026-05-20T12:00:00.000Z" },
    snapshots: [],
    version: "environmental-impact-estimator-2026.05-v1",
  })),
);

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: () => new Response("forbidden", { status: 403 }),
}));

vi.mock("@/lib/admin/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/environmental-impact-estimator/dashboard-capture", () => ({
  EnvironmentalImpactCaptureError: EnvironmentalImpactCaptureErrorMock,
  buildEnvironmentalImpactSnapshot: buildSnapshotMock,
  captureEnvironmentalImpactDashboard: captureDashboardMock,
}));

import { POST } from "./route";

describe("admin environmental impact route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captureDashboardMock.mockResolvedValue({
      status: "ok",
      model: {
        generatedAt: "2026-05-20T12:00:00.000Z",
        infrastructure: {
          monthlyKgCo2eProxy: 1.23,
          totalKgCo2eProxy: 14.76,
          annualKgCo2eProxy: 14.76,
          confidencePercent: 82,
          uncertaintyPercent: 18,
        },
      },
      signals: { generatedAt: "2026-05-20T12:00:00.000Z" },
      snapshots: [],
      version: "environmental-impact-estimator-2026.05-v1",
    });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
  });

  it("rejects non admin access", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: "Forbidden",
    });

    const response = await POST(
      new Request("http://localhost/api/admin/environmental-impact"),
    );

    expect(response.status).toBe(403);
    expect(captureDashboardMock).not.toHaveBeenCalled();
  });

  it("captures and returns a manual dashboard snapshot", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({
      ok: true,
      userId: "admin_1",
    });

    const response = await POST(
      new Request("http://localhost/api/admin/environmental-impact?historyLimit=9"),
    );
    const payload = (await response.json()) as {
      status: string;
      triggeredBy: string;
      model: { infrastructure: { monthlyKgCo2eProxy: number | null } };
      snapshots: unknown[];
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.triggeredBy).toBe("admin-manual");
    expect(payload.model.infrastructure.monthlyKgCo2eProxy).toBeGreaterThan(0);
    expect(captureDashboardMock).toHaveBeenCalledWith({
      userId: "admin_1",
      historyLimit: 9,
    });
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin_1",
        operationType: "admin_operation",
        outcome: "success",
        targetId: "snapshot-2026-05-20T12:00:00.000Z",
        details: {
          operation: "capture_environmental_impact_snapshot",
          newValue: {
            snapshotId: "snapshot-2026-05-20T12:00:00.000Z",
            snapshotKey: "cleanmymap-project",
            snapshotDate: "2026-05-20",
            generatedAt: "2026-05-20T12:00:00.000Z",
            version: "environmental-impact-estimator-2026.05-v1",
          },
        },
      }),
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "monthlyKgCo2eProxy",
    );
  });

  it("audits a capture failure without copying the error", async () => {
    captureDashboardMock.mockRejectedValueOnce(new Error("third-party detail"));
    requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "admin_1" });

    const response = await POST(
      new Request("http://localhost/api/admin/environmental-impact"),
    );

    expect(response.status).toBe(503);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin_1",
        outcome: "error",
        details: {
          operation: "capture_environmental_impact_snapshot",
          stage: "capture",
        },
      }),
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "third-party detail",
    );
  });

  it("keeps the canonical snapshot target on a persistence failure", async () => {
    captureDashboardMock.mockRejectedValueOnce(
      new EnvironmentalImpactCaptureErrorMock(
        "persistence",
        "snapshot-2026-05-20T12:00:00.000Z",
      ),
    );
    requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "admin_1" });

    const response = await POST(
      new Request("http://localhost/api/admin/environmental-impact"),
    );

    expect(response.status).toBe(503);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: "snapshot-2026-05-20T12:00:00.000Z",
        details: {
          operation: "capture_environmental_impact_snapshot",
          stage: "persistence",
        },
      }),
    );
  });
});
