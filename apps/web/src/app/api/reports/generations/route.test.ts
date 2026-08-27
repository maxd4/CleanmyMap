import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const persistReportGenerationMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/reports/report-generation-history-store", () => ({
  persistReportGeneration: persistReportGenerationMock,
}));

vi.mock("@/lib/admin/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
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
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
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
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
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
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      actorUserId: "user-admin",
      operationType: "admin_operation",
      outcome: "success",
      targetId: "generation-1",
      details: {
        operation: "persist_report_generation",
        stage: "persistence",
        scopeKind: "global",
        detailLevel: "default",
      },
    });
    expect(
      Object.keys(appendAdminOperationAuditMock.mock.calls[0]?.[0].details ?? {}),
    ).toEqual(["operation", "stage", "scopeKind", "detailLevel"]);
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "Rapport d'impact",
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "Paris",
    );
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
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "validation",
        code: "invalid_payload",
      },
    });
  });

  it("audits invalid JSON without mutating", async () => {
    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "validation",
        code: "invalid_json",
      },
    });
  });

  it("audits oversized snapshots without mutating", async () => {
    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify({
          ...validPayload,
          payload: {
            ...validPayload.payload,
            data: {
              ...validPayload.payload.data,
              summary: ["x".repeat(2_000_001)],
            },
          },
        }),
      }),
    );

    expect(response.status).toBe(413);
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "validation",
        code: "snapshot_too_large",
      },
    });
  });

  it("audits persistence failures without exposing the report", async () => {
    persistReportGenerationMock.mockRejectedValueOnce(
      new Error("raw-persistence-error"),
    );

    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(503);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
    expect(audit).toMatchObject({
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "persistence",
        code: "persistence_failed",
      },
    });
    expect(JSON.stringify(audit)).not.toContain("raw-persistence-error");
    expect(JSON.stringify(audit)).not.toContain("Rapport d'impact");
  });
});
