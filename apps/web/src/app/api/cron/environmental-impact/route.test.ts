import { describe, expect, it, vi } from "vitest";

const captureDashboardMock = vi.hoisted(() =>
  vi.fn(async () => ({
    status: "ok",
    model: { infrastructure: { monthlyKgCo2eProxy: 1.2 } },
    signals: { generatedAt: "2026-05-20T12:00:00.000Z" },
    snapshots: [],
    version: "environmental-impact-estimator-2026.05-v1",
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
  captureEnvironmentalImpactDashboard: captureDashboardMock,
}));

import { GET } from "./route";

describe("cron environmental impact route", () => {
  it("rejects requests without a configured cron secret", async () => {
    cronAuthState.isConfigured = false;
    cronAuthState.isAuthorized = true;

    const response = await GET(new Request("http://localhost/api/cron/environmental-impact"));

    expect(response.status).toBe(401);
    expect(captureDashboardMock).not.toHaveBeenCalled();
  });

  it("returns the environmental impact capture when the cron secret is valid", async () => {
    cronAuthState.isConfigured = true;
    cronAuthState.isAuthorized = true;

    const response = await GET(
      new Request("http://localhost/api/cron/environmental-impact?historyLimit=9", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    const payload = (await response.json()) as {
      status: string;
      triggeredBy: string;
      model: { infrastructure: { monthlyKgCo2eProxy: number | null } };
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.triggeredBy).toBe("vercel-cron");
    expect(payload.model.infrastructure.monthlyKgCo2eProxy).toBeGreaterThan(0);
    expect(captureDashboardMock).toHaveBeenCalledWith({
      userId: null,
      historyLimit: 9,
    });
  });
});
