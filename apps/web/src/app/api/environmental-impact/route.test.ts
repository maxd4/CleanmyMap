import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const loadDashboardMock = vi.hoisted(() => vi.fn());
const captureDashboardMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/environmental-impact-estimator/dashboard-capture", () => ({
  loadEnvironmentalImpactDashboard: loadDashboardMock,
  captureEnvironmentalImpactDashboard: captureDashboardMock,
}));

const routeModulePromise = import("./route");

describe("GET /api/environmental-impact", () => {
  beforeEach(() => {
    authMock.mockReset();
    loadDashboardMock.mockReset();
    captureDashboardMock.mockReset();
  });

  it("rejects anonymous access", async () => {
    authMock.mockResolvedValue({ userId: null });

    const { GET } = await routeModulePromise;
    const response = await GET(new Request("http://localhost/api/environmental-impact"));

    expect(response.status).toBe(401);
    expect(captureDashboardMock).not.toHaveBeenCalled();
  });

  it("returns the latest snapshot by default", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    loadDashboardMock.mockResolvedValue({
      status: "ok",
      model: {
        infrastructure: { monthlyKgCo2eProxy: 1.2 },
      },
      signals: { generatedAt: "2026-05-20T12:00:00.000Z" },
      snapshots: [],
      version: "environmental-impact-estimator-2026.05-v1",
    });

    const { GET } = await routeModulePromise;
    const response = await GET(new Request("http://localhost/api/environmental-impact?historyLimit=6"));
    const body = (await response.json()) as {
      status: string;
      model: { infrastructure: { monthlyKgCo2eProxy: number | null } };
      snapshots: Array<{ snapshotDate: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.model.infrastructure.monthlyKgCo2eProxy).toBeGreaterThan(0);
    expect(loadDashboardMock).toHaveBeenCalledWith({
      userId: "user_1",
      generatedAt: expect.any(String),
      historyLimit: 6,
    });
    expect(captureDashboardMock).not.toHaveBeenCalled();
    expect(Array.isArray(body.snapshots)).toBe(true);
  });

  it("forces a live refresh when requested", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    captureDashboardMock.mockResolvedValue({
      status: "ok",
      model: {
        infrastructure: { monthlyKgCo2eProxy: 1.2 },
      },
      signals: { generatedAt: "2026-05-20T12:00:00.000Z" },
      snapshots: [],
      version: "environmental-impact-estimator-2026.05-v1",
    });

    const { GET } = await routeModulePromise;
    const response = await GET(
      new Request("http://localhost/api/environmental-impact?historyLimit=6&refresh=1"),
    );

    expect(response.status).toBe(200);
    expect(loadDashboardMock).not.toHaveBeenCalled();
    expect(captureDashboardMock).toHaveBeenCalledWith({
      userId: "user_1",
      generatedAt: expect.any(String),
      historyLimit: 6,
    });
  });
});
