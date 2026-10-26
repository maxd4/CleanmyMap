import { beforeEach, describe, expect, it, vi } from "vitest";
import { validPayload, validSnapshotPayload } from "./route.test.fixtures";
import {
  reportGenerationMocks,
  setupPostReportGenerationDefaults,
} from "./route.test.helpers";
import { POST } from "./route";

const {
  persistReportGenerationMock,
  resolveDirectReportGenerationPersistenceMock,
  appendAdminOperationAuditMock,
  releaseReportExportSlotMock,
  reserveReportExportSlotMock,
  getReportExportAvailabilityMock,
  buildMultiActionReportGenerationInputMock,
} = reportGenerationMocks;

describe("POST /api/reports/generations persistence recovery", () => {
  beforeEach(() => {
    setupPostReportGenerationDefaults();
  });

  it("preserves an uncertain result even when the uncertainty audit fails", async () => {
    persistReportGenerationMock.mockRejectedValueOnce(new Error("response lost"));
    resolveDirectReportGenerationPersistenceMock.mockResolvedValueOnce({ kind: "uncertain" });
    appendAdminOperationAuditMock.mockRejectedValueOnce(new Error("audit unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "persistence_uncertain",
      persisted: "unknown",
      generationId: expect.any(String),
    });
    expect(releaseReportExportSlotMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("reconciles an apparent persistence failure after direct insertion without reinserting or releasing quota", async () => {
    const reconciledItem = {
      id: "generation-reconciled",
      report: validSnapshotPayload.title,
      period: "Six mois",
      perimeter: "Paris",
      detail: "Par défaut (12 à 16 pages)",
      generatedAt: "27/08/2026 12:30",
    };
    persistReportGenerationMock.mockRejectedValueOnce(new Error("lost insert response"));
    resolveDirectReportGenerationPersistenceMock.mockResolvedValueOnce({
      kind: "persisted",
      item: reconciledItem,
    });

    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(200);
    expect(persistReportGenerationMock).toHaveBeenCalledTimes(1);
    expect(resolveDirectReportGenerationPersistenceMock).toHaveBeenCalledWith({
      createdByClerkId: "user-1",
      generationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(releaseReportExportSlotMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "success",
      targetId: reconciledItem.id,
      details: expect.objectContaining({ persistenceReconciled: true }),
    }));
  });

  it("keeps quota and exposes an unknown persistence result when the owner-scoped reread is uncertain", async () => {
    persistReportGenerationMock.mockRejectedValueOnce(new Error("persistence response unavailable"));
    resolveDirectReportGenerationPersistenceMock.mockResolvedValueOnce({ kind: "uncertain" });

    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "persistence_uncertain",
      persisted: "unknown",
      generationId: expect.any(String),
    });
    expect(persistReportGenerationMock).toHaveBeenCalledTimes(1);
    expect(releaseReportExportSlotMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "error",
      details: expect.objectContaining({ code: "persistence_uncertain" }),
    }));
  });

  it("keeps quota and reports persisted state when the post-insertion audit fails", async () => {
    appendAdminOperationAuditMock
      .mockRejectedValueOnce(new Error("audit unavailable"))
      .mockResolvedValueOnce(undefined);

    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "audit_failed_after_persistence",
      persisted: true,
      generationId: "generation-1",
    });
    expect(persistReportGenerationMock).toHaveBeenCalledTimes(1);
    expect(resolveDirectReportGenerationPersistenceMock).not.toHaveBeenCalled();
    expect(releaseReportExportSlotMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(2);
    expect(appendAdminOperationAuditMock.mock.calls[1]?.[0]).toMatchObject({
      outcome: "error",
      targetId: "generation-1",
      details: {
        operation: "persist_report_generation",
        stage: "audit",
        code: "audit_failed_after_persistence",
      },
    });
  });

  it("does not hide a post-insertion audit failure when its replacement audit also fails", async () => {
    appendAdminOperationAuditMock
      .mockRejectedValueOnce(new Error("audit unavailable"))
      .mockRejectedValueOnce(new Error("replacement audit unavailable"));

    const response = await POST(
      new Request("http://localhost/api/reports/generations", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "audit_failed_after_persistence",
      persisted: true,
    });
    expect(persistReportGenerationMock).toHaveBeenCalledTimes(1);
    expect(releaseReportExportSlotMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(2);
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
    expect(getReportExportAvailabilityMock).toHaveBeenCalledWith("user-1");
    expect(buildMultiActionReportGenerationInputMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ quotaDay: "2026-08-27" });
  });
});
