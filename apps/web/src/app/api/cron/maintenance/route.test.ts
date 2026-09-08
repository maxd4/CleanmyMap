import { beforeEach, describe, expect, it, vi } from "vitest";

const runMaintenanceJobsMock = vi.hoisted(() => vi.fn());
const cronAuthState = vi.hoisted(() => ({
  isConfigured: true,
  isAuthorized: true,
}));

vi.mock("@/lib/http/cron-auth", () => ({
  hasValidCronAuth: () => cronAuthState.isAuthorized,
  isCronSecretConfigured: () => cronAuthState.isConfigured,
}));

vi.mock("@/lib/periodic/maintenance-job-registry", () => ({
  runMaintenanceJobs: runMaintenanceJobsMock,
}));

import { GET } from "./route";

describe("cron maintenance route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cronAuthState.isConfigured = true;
    cronAuthState.isAuthorized = true;
    runMaintenanceJobsMock.mockResolvedValue({
      status: "ok",
      generatedAt: "2026-09-07T03:20:00.000Z",
      jobs: [
        {
          job: "platform-usage",
          cadence: "weekly",
          period: "2026-09-07",
          status: "executed",
        },
        {
          job: "impact-terrain",
          cadence: "monthly",
          period: "2026-09-01",
          status: "skipped",
          reason: "reused",
        },
      ],
    });
  });

  it("retourne 401 sans authentification cron valide", async () => {
    cronAuthState.isAuthorized = false;

    const response = await GET(new Request("http://localhost/api/cron/maintenance"));

    expect(response.status).toBe(401);
    expect(runMaintenanceJobsMock).not.toHaveBeenCalled();
  });

  it("retourne les résultats structurés de chaque job", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/maintenance", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ok",
      triggeredBy: "vercel-cron",
      scheduler: {
        path: "/api/cron/maintenance",
        schedule: "20 3 * * *",
        timezone: "UTC",
      },
      jobs: [
        { job: "platform-usage", status: "executed", period: "2026-09-07" },
        { job: "impact-terrain", status: "skipped", period: "2026-09-01" },
      ],
    });
    expect(runMaintenanceJobsMock).toHaveBeenCalledOnce();
  });

  it("retourne 200 avec un statut dégradé quand un job isolé échoue", async () => {
    runMaintenanceJobsMock.mockResolvedValue({
      status: "degraded",
      generatedAt: "2026-09-08T03:20:00.000Z",
      jobs: [
        {
          job: "platform-usage",
          cadence: "weekly",
          period: "2026-09-07",
          status: "failed",
          error: "Échec du job.",
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/cron/maintenance", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "degraded",
      jobs: [{ job: "platform-usage", status: "failed" }],
    });
  });
});
