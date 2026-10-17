import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getSnapshotMock = vi.hoisted(() => vi.fn());
const persistDerivedMock = vi.hoisted(() => vi.fn());
const resolvePersistenceMock = vi.hoisted(() => vi.fn());
const reserveQuotaMock = vi.hoisted(() => vi.fn());
const releaseQuotaMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createRateLimitResponseMock = vi.hoisted(() => vi.fn());
const auditMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/reports/report-generation-history-store", () => ({
  getReportGenerationSnapshotById: getSnapshotMock,
  persistDerivedReportGeneration: persistDerivedMock,
  resolveDerivedReportGenerationPersistence: resolvePersistenceMock,
  InvalidReportGenerationIdError: class InvalidReportGenerationIdError extends Error {},
}));
vi.mock("@/lib/reports/report-export-quota", () => ({
  reserveReportExportSlot: reserveQuotaMock,
  releaseReportExportSlot: releaseQuotaMock,
}));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createRateLimitResponseMock,
}));
vi.mock("@/lib/admin/audit/operation-audit", () => ({ appendAdminOperationAudit: auditMock }));

import { POST } from "./route";
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "@/lib/reports/report-advanced-filters";

const sourceId = "11111111-1111-4111-8111-111111111111";
const source = {
  id: sourceId,
  filename: "rapport_reporting_six_months.pdf",
  generatedAt: "2026-10-17T12:00:00.000Z",
  scopeKind: "global" as const,
  scopeValue: "",
  scopeLabel: "Global",
  detailLevel: "default" as const,
  snapshot: {
    title: "Rapport historique",
    rubrique: "reporting" as const,
    periode: "six_months" as const,
    organizationType: "Global",
    snapshotSchemaVersion: 2 as const,
    snapshotMetadata: {
      snapshotSchemaVersion: 2 as const,
      templateVersion: "reports-template-v1",
      rendererVersion: "official-report-html-v1",
      generationId: sourceId,
      sourceGenerationId: null,
      filtersVersion: "reports-filters-v1",
      advancedFiltersVersion: "reports-advanced-filters-v1",
      filters: REPORT_ADVANCED_FILTER_DEFAULTS,
      generatedAt: "2026-10-17T12:00:00.000Z",
      period: { id: "six_months" as const, from: "2026-04-17", to: "2026-10-17", timeZone: "UTC" as const },
      scope: { kind: "global" as const, value: "", label: "Global" },
      detailLevel: "default" as const,
      modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: false, detailedFiles: true },
      provenance: { type: "multi_action" as const, source: "public.actions" as const, resolvedAt: "2026-10-17T12:00:00.000Z", actionCount: 1 },
      methodology: { proxyVersion: "impact-proxy-2026.04-v1", qualityRulesVersion: "quality-2026.04-v1" },
      dataAvailability: { truncated: false, availableSources: ["actions"], failedSources: [], communityEvents: "unavailable" as const },
    },
    data: { generatedAt: "2026-10-17T12:00:00.000Z", summary: ["Source"] },
  },
};

const item = {
  id: "22222222-2222-4222-8222-222222222222",
  report: source.snapshot.title,
  period: "Six mois",
  perimeter: "Global",
  detail: "Par défaut",
  generatedAt: "17/10/2026 14:05",
};

function request() {
  return new Request(`http://localhost/api/reports/generations/${sourceId}`, { method: "POST" });
}

describe("POST /api/reports/generations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getSnapshotMock.mockResolvedValue(source);
    reserveQuotaMock.mockResolvedValue({ allowed: true, quotaDay: "2026-10-17" });
    releaseQuotaMock.mockResolvedValue(undefined);
    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: 0 });
    createRateLimitResponseMock.mockReturnValue(null);
    persistDerivedMock.mockResolvedValue(item);
    resolvePersistenceMock.mockResolvedValue({ kind: "not_persisted" });
    auditMock.mockResolvedValue(undefined);
  });

  it("derives from the owner snapshot, consumes quota, and preserves lineage", async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: sourceId }) });

    expect(response.status).toBe(200);
    expect(getSnapshotMock).toHaveBeenCalledWith(sourceId, "user-1");
    expect(persistDerivedMock).toHaveBeenCalledWith(expect.objectContaining({
      createdByClerkId: "user-1",
      source,
      generationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      generatedAt: expect.any(String),
    }));
    expect(reserveQuotaMock).toHaveBeenCalledWith("user-1");
    await expect(response.json()).resolves.toMatchObject({ item, generation: { snapshot: {
      snapshotMetadata: { sourceGenerationId: sourceId },
    } } });
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "success",
      targetId: item.id,
      details: expect.objectContaining({ sourceGenerationId: sourceId }),
    }));
    expect(releaseQuotaMock).not.toHaveBeenCalled();
  });

  it("refuses a third-party or incompatible source before quota", async () => {
    getSnapshotMock.mockResolvedValueOnce(null);
    await expect(POST(request(), { params: Promise.resolve({ id: sourceId }) })).resolves.toMatchObject({ status: 404 });
    expect(reserveQuotaMock).not.toHaveBeenCalled();

    getSnapshotMock.mockResolvedValueOnce({
      ...source,
      snapshot: {
        ...source.snapshot,
        snapshotMetadata: { ...source.snapshot.snapshotMetadata, filtersVersion: "reports-filters-v0" },
      },
    });
    const incompatible = await POST(request(), { params: Promise.resolve({ id: sourceId }) });
    expect(incompatible.status).toBe(422);
    expect(reserveQuotaMock).not.toHaveBeenCalled();
  });

  it("returns quota exhaustion and releases quota after persistence failure", async () => {
    reserveQuotaMock.mockResolvedValueOnce({ allowed: false, quotaDay: "2026-10-17" });
    expect((await POST(request(), { params: Promise.resolve({ id: sourceId }) })).status).toBe(429);
    expect(persistDerivedMock).not.toHaveBeenCalled();

    reserveQuotaMock.mockResolvedValueOnce({ allowed: true, quotaDay: "2026-10-17" });
    persistDerivedMock.mockRejectedValueOnce(new Error("db failure"));
    expect((await POST(request(), { params: Promise.resolve({ id: sourceId }) })).status).toBe(503);
    expect(releaseQuotaMock).toHaveBeenCalledWith({ userId: "user-1", quotaDay: "2026-10-17" });
    expect(resolvePersistenceMock).toHaveBeenCalledWith(expect.objectContaining({
      generationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      sourceGenerationId: sourceId,
    }));
  });

  it("keeps the quota and reports persisted state when the success audit fails", async () => {
    auditMock
      .mockRejectedValueOnce(new Error("audit unavailable"))
      .mockResolvedValueOnce(undefined);

    const response = await POST(request(), { params: Promise.resolve({ id: sourceId }) });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "audit_failed_after_persistence",
      persisted: true,
      generationId: expect.any(String),
    });
    expect(persistDerivedMock).toHaveBeenCalledTimes(1);
    expect(resolvePersistenceMock).not.toHaveBeenCalled();
    expect(releaseQuotaMock).not.toHaveBeenCalled();
    expect(auditMock).toHaveBeenCalledTimes(2);
    expect(auditMock.mock.calls[1]?.[0]).toMatchObject({
      outcome: "error",
      targetId: item.id,
      details: expect.objectContaining({
        stage: "audit",
        code: "audit_failed_after_persistence",
      }),
    });
  });

  it("does not release quota when persistence cannot be resolved", async () => {
    persistDerivedMock.mockRejectedValueOnce(new Error("network timeout"));
    resolvePersistenceMock.mockResolvedValueOnce({ kind: "uncertain" });

    const response = await POST(request(), { params: Promise.resolve({ id: sourceId }) });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "persistence_uncertain",
      persisted: "unknown",
    });
    expect(releaseQuotaMock).not.toHaveBeenCalled();
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "error",
      targetId: expect.any(String),
      details: expect.objectContaining({ code: "persistence_uncertain" }),
    }));
  });
});
