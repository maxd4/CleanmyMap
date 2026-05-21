import { describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
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

vi.mock("@/lib/environmental-impact-estimator/dashboard-capture", () => ({
  captureEnvironmentalImpactDashboard: captureDashboardMock,
}));

import { POST } from "./route";

describe("admin environmental impact route", () => {
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
      userId: null,
      historyLimit: 9,
    });
  });
});
