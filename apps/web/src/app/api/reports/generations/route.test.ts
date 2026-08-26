import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const persistReportGenerationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/reports/report-generation-history-store", () => ({
  persistReportGeneration: persistReportGenerationMock,
}));

import { POST } from "./route";

const validPayload = {
  payload: {
    title: "Rapport d'impact - Paris - Par défaut",
    rubrique: "reporting",
    periode: "six_months",
    organizationType: "Global",
    data: { generatedAt: "2026-08-27T10:30:00.000Z", summary: ["Résumé"] },
  },
  scopeKind: "global",
  scopeValue: "",
  scopeLabel: "Paris",
  detailLevel: "default",
  modules: {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: false,
    detailedFiles: true,
  },
};

describe("POST /api/reports/generations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "user-admin" });
    persistReportGenerationMock.mockResolvedValue({
      id: "generation-1",
      report: validPayload.payload.title,
      period: "Six mois",
      perimeter: "Paris",
      detail: "Par défaut (12 à 16 pages)",
      generatedAt: "27/08/2026 12:30",
    });
  });

  it("denies anonymous and non-admin callers before persistence", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(401);
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
  });

  it("persists one validated snapshot with the Clerk actor", async () => {
    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(200);
    expect(persistReportGenerationMock).toHaveBeenCalledWith({
      createdByClerkId: "user-admin",
      input: validPayload,
    });
    await expect(response.json()).resolves.toMatchObject({
      item: { id: "generation-1" },
      filename: "rapport_reporting_six_months.pdf",
    });
  });

  it("rejects malformed snapshots without persistence", async () => {
    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify({ ...validPayload, detailLevel: "unknown" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
  });
});
