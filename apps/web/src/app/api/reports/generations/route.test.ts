import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimitModule, mockAllowedRateLimit, mockRejectedRateLimit } from "@/app/api/test-helpers";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const persistReportGenerationMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const reserveReportExportSlotMock = vi.hoisted(() => vi.fn());
const releaseReportExportSlotMock = vi.hoisted(() => vi.fn());
const resolveSingleActionReportContractMock = vi.hoisted(() => vi.fn());
const buildSingleActionReportGenerationInputMock = vi.hoisted(() => vi.fn());
const buildMultiActionReportGenerationInputMock = vi.hoisted(() => vi.fn());
const SingleActionReportTargetUnavailableErrorMock = vi.hoisted(() =>
  class SingleActionReportTargetUnavailableError extends Error {},
);
const MultiActionReportPeriodInvalidErrorMock = vi.hoisted(() =>
  class MultiActionReportPeriodInvalidError extends Error {},
);
const MultiActionReportScopeUnavailableErrorMock = vi.hoisted(() =>
  class MultiActionReportScopeUnavailableError extends Error {},
);
const MultiActionReportEmptyErrorMock = vi.hoisted(() =>
  class MultiActionReportEmptyError extends Error {},
);
const MultiActionReportSourceUnavailableErrorMock = vi.hoisted(() =>
  class MultiActionReportSourceUnavailableError extends Error {},
);

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));

vi.mock("@/lib/reports/report-generation-history-store", () => ({
  persistReportGeneration: persistReportGenerationMock,
}));

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/reports/report-export-quota", () => ({
  reserveReportExportSlot: reserveReportExportSlotMock,
  releaseReportExportSlot: releaseReportExportSlotMock,
}));

vi.mock("@/lib/reports/single-action-report", () => ({
  resolveSingleActionReportContract: resolveSingleActionReportContractMock,
  buildSingleActionReportGenerationInput: buildSingleActionReportGenerationInputMock,
  SingleActionReportTargetUnavailableError: SingleActionReportTargetUnavailableErrorMock,
}));

vi.mock("@/lib/reports/multi-action-report", () => ({
  buildMultiActionReportGenerationInput: buildMultiActionReportGenerationInputMock,
  MultiActionReportPeriodInvalidError: MultiActionReportPeriodInvalidErrorMock,
  MultiActionReportScopeUnavailableError: MultiActionReportScopeUnavailableErrorMock,
  MultiActionReportEmptyError: MultiActionReportEmptyErrorMock,
  MultiActionReportSourceUnavailableError: MultiActionReportSourceUnavailableErrorMock,
}));

vi.mock("@/lib/rate-limit/server", () => createRateLimitModule());

import { POST } from "./route";

const validSnapshotPayload = {
    title: "Rapport d'impact - Paris - Par défaut",
    rubrique: "reporting",
    periode: "six_months",
    organizationType: "Global",
    data: { generatedAt: "2026-08-27T10:30:00.000Z", summary: ["Résumé"] },
};
const multiInput = {
  payload: validSnapshotPayload,
  scopeKind: "global" as const,
  scopeValue: "",
  scopeLabel: "Global",
  detailLevel: "default",
  modules: {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: false,
    detailedFiles: true,
  },
};
const validPayload = {
  input: {
    type: "multi_action" as const,
    period: { id: "six_months" as const },
    scope: { kind: "global" as const, value: null },
  },
  detailLevel: "default" as const,
  modules: multiInput.modules,
};

describe("POST /api/reports/generations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    persistReportGenerationMock.mockResolvedValue({
      id: "generation-1",
      report: validSnapshotPayload.title,
      period: "Six mois",
      perimeter: "Paris",
      detail: "Par défaut (12 à 16 pages)",
      generatedAt: "27/08/2026 12:30",
    });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    reserveReportExportSlotMock.mockResolvedValue({ allowed: true, quotaDay: "2026-08-27" });
    releaseReportExportSlotMock.mockResolvedValue(undefined);
    buildMultiActionReportGenerationInputMock.mockResolvedValue(multiInput);
    mockAllowedRateLimit(5);
  });

  it("denies anonymous callers before persistence", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
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
      createdByClerkId: "user-1",
      input: multiInput,
    });
    expect(reserveReportExportSlotMock).toHaveBeenCalledWith("user-1");
    await expect(response.json()).resolves.toMatchObject({
      item: { id: "generation-1" },
      filename: "rapport_reporting_six_months.pdf",
    });
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      actorUserId: "user-1",
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
    expect(buildMultiActionReportGenerationInputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: validPayload.input,
        detailLevel: validPayload.detailLevel,
        modules: validPayload.modules,
      }),
    );
  });

  it("rejects forged browser KPI or snapshot data on the multi-action contract", async () => {
    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify({
          ...validPayload,
          payload: {
            title: "KPI forgé",
            rubrique: "reporting",
            periode: "six_months",
            organizationType: "Global",
            data: { generatedAt: "2026-08-27T10:30:00.000Z", stats: [{ label: "Actions", value: 999999 }] },
          },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(buildMultiActionReportGenerationInputMock).not.toHaveBeenCalled();
    expect(reserveReportExportSlotMock).not.toHaveBeenCalled();
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
  });

  it.each([
    ["period", MultiActionReportPeriodInvalidErrorMock, 400],
    ["scope", MultiActionReportScopeUnavailableErrorMock, 422],
    ["empty", MultiActionReportEmptyErrorMock, 422],
    ["source", MultiActionReportSourceUnavailableErrorMock, 503],
  ] as const)("maps a multi-action %s failure before quota", async (_label, ErrorType, status) => {
    buildMultiActionReportGenerationInputMock.mockRejectedValueOnce(new ErrorType());

    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(status);
    expect(reserveReportExportSlotMock).not.toHaveBeenCalled();
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
  });

  it("returns 429 before reading a costly snapshot when rate limited", async () => {
    mockRejectedRateLimit(5);

    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(429);
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    expect(reserveReportExportSlotMock).not.toHaveBeenCalled();
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
  });

  it("rejects malformed typed inputs without persistence", async () => {
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
        code: "invalid_typed_input",
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

  it("rejects an oversized snapshot before reserving or persisting quota", async () => {
    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify({
          ...validPayload,
          payload: {
            ...validSnapshotPayload,
            data: {
              ...validSnapshotPayload.data,
              summary: ["x".repeat(2_200_000)],
            },
          },
        }),
      }),
    );

    expect(response.status).toBe(413);
    expect(reserveReportExportSlotMock).not.toHaveBeenCalled();
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        details: expect.objectContaining({
          stage: "validation",
          code: "payload_too_large",
        }),
      }),
    );
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
    expect(releaseReportExportSlotMock).toHaveBeenCalledWith({
      userId: "user-1",
      quotaDay: "2026-08-27",
    });
  });

  it("rejects a second export for the same civil day before persistence", async () => {
    reserveReportExportSlotMock.mockResolvedValueOnce({
      allowed: false,
      quotaDay: "2026-08-27",
    });

    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(429);
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ quotaDay: "2026-08-27" });
  });

  it("resolves and persists only the typed single-action scope", async () => {
    const singleInput = {
      payload: {
        ...validSnapshotPayload,
        title: "Rapport d'impact - Action canonique - Par défaut",
        organizationType: "single_action",
        provenance: {
          type: "single_action",
          actionId: "11111111-1111-4111-8111-111111111111",
          source: "public.actions",
          resolvedAt: "2026-08-27T10:30:00.000Z",
        },
      },
      scopeKind: "single_action",
      scopeValue: "11111111-1111-4111-8111-111111111111",
      scopeLabel: "Action canonique",
      detailLevel: "default",
      modules: validPayload.modules,
    };
    resolveSingleActionReportContractMock.mockResolvedValueOnce({ id: "action-1" });
    buildSingleActionReportGenerationInputMock.mockReturnValueOnce(singleInput);
    persistReportGenerationMock.mockResolvedValueOnce({
      ...validSnapshotPayload,
      id: "generation-single",
      report: singleInput.payload.title,
      period: "Historique complet",
      perimeter: singleInput.scopeLabel,
      detail: "Par défaut",
      generatedAt: "27/08/2026 12:30",
    });

    const response = await POST(new Request("http://localhost/api/reports/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { type: "single_action", actionId: singleInput.scopeValue },
        detailLevel: "default",
        modules: validPayload.modules,
      }),
    }));

    expect(response.status).toBe(200);
    expect(resolveSingleActionReportContractMock).toHaveBeenCalledWith(singleInput.scopeValue);
    expect(buildSingleActionReportGenerationInputMock).toHaveBeenCalledWith(expect.objectContaining({
      request: { type: "single_action", actionId: singleInput.scopeValue },
      detailLevel: "default",
    }));
    expect(persistReportGenerationMock).toHaveBeenCalledWith({
      createdByClerkId: "user-1",
      input: singleInput,
    });
  });

  it("rejects an invalid action id and never resolves or consumes quota", async () => {
    const response = await POST(new Request("http://localhost/api/reports/generations", {
      method: "POST",
      body: JSON.stringify({
        input: { type: "single_action", actionId: "not-an-uuid" },
        detailLevel: "default",
        modules: validPayload.modules,
      }),
    }));

    expect(response.status).toBe(400);
    expect(resolveSingleActionReportContractMock).not.toHaveBeenCalled();
    expect(reserveReportExportSlotMock).not.toHaveBeenCalled();
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an absent or ineligible action without consuming quota", async () => {
    resolveSingleActionReportContractMock.mockRejectedValueOnce(
      new SingleActionReportTargetUnavailableErrorMock(),
    );

    const response = await POST(new Request("http://localhost/api/reports/generations", {
      method: "POST",
      body: JSON.stringify({
        input: { type: "single_action", actionId: "11111111-1111-4111-8111-111111111111" },
        detailLevel: "default",
        modules: validPayload.modules,
      }),
    }));

    expect(response.status).toBe(404);
    expect(reserveReportExportSlotMock).not.toHaveBeenCalled();
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
  });

  it("rejects browser-supplied payload data for the single-action contract", async () => {
    const response = await POST(new Request("http://localhost/api/reports/generations", {
      method: "POST",
      body: JSON.stringify({
        input: { type: "single_action", actionId: "11111111-1111-4111-8111-111111111111" },
        payload: { ...validSnapshotPayload, title: "Valeur injectée" },
        detailLevel: "default",
        modules: validPayload.modules,
      }),
    }));

    expect(response.status).toBe(400);
    expect(resolveSingleActionReportContractMock).not.toHaveBeenCalled();
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
  });

  it("does not fall back to the legacy payload contract when a single-action selector is malformed", async () => {
    const response = await POST(new Request("http://localhost/api/reports/generations", {
      method: "POST",
      body: JSON.stringify({
        ...validPayload,
        input: {
          type: "single_action",
          actionId: "11111111-1111-4111-8111-111111111111",
          injected: "must not be ignored",
        },
        payload: { ...validSnapshotPayload, title: "Valeur injectée" },
      }),
    }));

    expect(response.status).toBe(400);
    expect(resolveSingleActionReportContractMock).not.toHaveBeenCalled();
    expect(reserveReportExportSlotMock).not.toHaveBeenCalled();
    expect(persistReportGenerationMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "error",
      details: expect.objectContaining({
        stage: "validation",
        code: "invalid_typed_input",
      }),
    }));
  });
});
