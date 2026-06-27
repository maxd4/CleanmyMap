import { describe, expect, it, vi } from "vitest";

const loadEnvironmentalImpactDashboardSnapshotOnlyMock = vi.hoisted(() =>
  vi.fn(async () => ({
    status: "ok",
    model: {
      generatedAt: "2026-05-20T12:00:00.000Z",
      infrastructure: {
        services: [],
      },
    },
    signals: { generatedAt: "2026-05-20T12:00:00.000Z" },
    snapshots: [],
    version: "environmental-impact-estimator-2026.05-v1",
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

vi.mock("@/lib/environmental-impact-estimator/dashboard-capture", () => ({
  loadEnvironmentalImpactDashboardSnapshotOnly: loadEnvironmentalImpactDashboardSnapshotOnlyMock,
}));

import { GET } from "./route";

describe("admin free plan services route", () => {
  it("returns the dashboard data for admins without capturing a new snapshot", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/free-plan-services?historyLimit=6"),
    );
    const payload = (await response.json()) as {
      status: string;
      focus: string;
      snapshots: unknown[];
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.focus).toBe("free-tier-services");
    expect(payload.snapshots).toHaveLength(0);
    expect(loadEnvironmentalImpactDashboardSnapshotOnlyMock).toHaveBeenCalledWith({ historyLimit: 6 });
    expect(requireAdminAccessMock).toHaveBeenCalledTimes(1);
  });
});
