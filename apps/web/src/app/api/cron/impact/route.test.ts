import { beforeEach, describe, expect, it, vi } from "vitest";

const generateSnapshotMock = vi.hoisted(() => vi.fn());
const cronAuthState = vi.hoisted(() => ({
  isConfigured: true,
  isAuthorized: true,
}));

vi.mock("@/lib/http/cron-auth", () => ({
  hasValidCronAuth: () => cronAuthState.isAuthorized,
  isCronSecretConfigured: () => cronAuthState.isConfigured,
}));

vi.mock("@/lib/impact/public-impact-snapshot", () => ({
  generateAndPersistPublicImpactSnapshot: generateSnapshotMock,
}));

import { GET } from "./route";

const generatedResult = {
  snapshot: {
    snapshotKey: "cleanmymap-impact-terrain-2026",
    snapshotDate: "2026-09-01",
    generatedAt: "2026-09-08T03:00:00.000Z",
    version: "impact-terrain-public-2026.09-v1",
    payload: {
      period: {
        fromDate: "2025-09-08",
        toDate: "2026-09-08",
        timezone: "UTC",
      },
      methodologyVersion: "impact-proxy-2026.04-v1",
    },
  },
  persisted: true,
  reused: false,
  forced: false,
};

describe("cron public monthly impact route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cronAuthState.isConfigured = true;
    cronAuthState.isAuthorized = true;
    generateSnapshotMock.mockResolvedValue(generatedResult);
  });

  it("rejects an invalid cron authentication before calculation", async () => {
    cronAuthState.isAuthorized = false;

    const response = await GET(new Request("http://localhost/api/cron/impact"));

    expect(response.status).toBe(401);
    expect(generateSnapshotMock).not.toHaveBeenCalled();
  });

  it("generates the monthly snapshot with the explicit force flag", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/impact?force=true", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ok",
      persisted: true,
      reused: false,
      forced: false,
      triggeredBy: "vercel-cron",
      snapshot: {
        key: "cleanmymap-impact-terrain-2026",
        date: "2026-09-01",
        methodologyVersion: "impact-proxy-2026.04-v1",
      },
    });
    expect(generateSnapshotMock).toHaveBeenCalledWith({ force: true });
  });

  it("returns a safe 503 and keeps persistence untouched on calculation failure", async () => {
    generateSnapshotMock.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(
      new Request("http://localhost/api/cron/impact", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "error",
      error: "Impossible de générer le snapshot mensuel Impact terrain.",
      details: "Unavailable",
    });
  });
});
