import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());
const snapshotMock = vi.hoisted(() => vi.fn());
const artifactMock = vi.hoisted(() => vi.fn());
const downloadMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
const tokenMock = vi.hoisted(() => vi.fn(() => "a".repeat(43)));
const createMock = vi.hoisted(() => vi.fn());
const auditMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: authMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: rateLimitMock }));
vi.mock("@/lib/reports/report-generation-history-store", () => ({
  getReportGenerationSnapshotById: snapshotMock,
  InvalidReportGenerationIdError: class InvalidReportGenerationIdError extends Error {},
}));
vi.mock("@/lib/reports/report-generation-payload", () => ({
  InvalidReportGenerationSnapshotError: class InvalidReportGenerationSnapshotError extends Error {},
}));
vi.mock("@/lib/reports/report-generation-pdf-artifact-store", () => ({
  downloadReportPdfArtifact: downloadMock,
  getReportPdfArtifactForOwner: artifactMock,
  REPORT_PDF_ARTIFACT_BUCKET: "reports",
  REPORT_PDF_ARTIFACT_RENDERER_VERSION: "chromium-official-report-pdf-v1",
}));
vi.mock("@/lib/reports/report-generation-pdf-share-store", () => ({
  createReportPdfShare: createMock,
  createReportPdfShareToken: tokenMock,
  isReportPdfShareExpiryValid: (value: number) => Number.isInteger(value) && value >= 3600 && value <= 30 * 24 * 3600,
  listReportPdfSharesForOwner: listMock,
  REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS: 30 * 24 * 3600,
  REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS: 3600,
}));
vi.mock("@/lib/admin/audit/operation-audit", () => ({ appendAdminOperationAudit: auditMock }));
vi.mock("@/lib/app-url.mjs", () => ({ resolvePublicAppUrl: () => "https://cleanmymap.test" }));

import { GET, POST } from "./route";

const generationId = "11111111-1111-4111-8111-111111111111";
const artifact = {
  id: "22222222-2222-4222-8222-222222222222",
  generationId,
  createdByClerkId: "owner-1",
  theme: "impact" as const,
  rendererVersion: "chromium-official-report-pdf-v1",
  storagePath: "report-generations/immutable/impact.pdf",
  status: "ready" as const,
  byteSize: 8,
  updatedAt: "2026-10-18T00:00:00.000Z",
};
const share = {
  id: "33333333-3333-4333-8333-333333333333",
  generationId,
  artifactId: artifact.id,
  createdByClerkId: "owner-1",
  theme: "impact" as const,
  rendererVersion: artifact.rendererVersion,
  expiresAt: "2026-10-19T00:00:00.000Z",
  revokedAt: null,
  createdAt: "2026-10-18T00:00:00.000Z",
};
const generation = {
  id: generationId,
  filename: "rapport_historique.pdf",
  generatedAt: "2026-10-18T00:00:00.000Z",
  scopeKind: "global" as const,
  scopeValue: "",
  scopeLabel: "Toutes les actions",
  detailLevel: "default" as const,
  snapshot: {
    title: "Rapport historique",
    rubrique: "reporting",
    periode: "full_history",
    organizationType: "Global",
    data: { generatedAt: "2026-10-18T00:00:00.000Z", summary: ["État"] },
  },
};

function request(body?: unknown): Request {
  return new Request(`https://cleanmymap.test/api/reports/generations/${generationId}/share`, {
    method: body ? "POST" : "GET",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
}

describe("historical report PDF sharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    rateLimitMock.mockResolvedValue(null);
    snapshotMock.mockResolvedValue(generation);
    artifactMock.mockResolvedValue(artifact);
    downloadMock.mockResolvedValue({ data: new Blob(["%PDF-1.7"], { type: "application/pdf" }), error: null });
    listMock.mockResolvedValue([share]);
    tokenMock.mockReturnValue("a".repeat(43));
    createMock.mockResolvedValue(share);
    auditMock.mockResolvedValue(undefined);
  });

  it("requires the owner before any preview or storage access", async () => {
    authMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });

    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(401);
    expect(snapshotMock).not.toHaveBeenCalled();
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it("returns a preview without exposing a token and lists only share metadata", async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preview).toMatchObject({ generationId, artifactReady: true, communicatedContent: expect.stringContaining("PDF") });
    expect(body.shares).toEqual([expect.objectContaining({ id: share.id, theme: "impact" })]);
    expect(JSON.stringify(body)).not.toContain("a".repeat(43));
  });

  it("creates one expiring link for the ready exact variant without quota work", async () => {
    const response = await POST(request({ theme: "impact", expiresInSeconds: 24 * 60 * 60 }), { params: Promise.resolve({ id: generationId }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.shareUrl).toBe(`https://cleanmymap.test/api/reports/shared/${"a".repeat(43)}`);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ generationId, artifactId: artifact.id, theme: "impact", token: "a".repeat(43) }));
    expect(auditMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the persisted link usable when its success audit fails", async () => {
    auditMock.mockRejectedValueOnce(new Error("audit unavailable"));

    const response = await POST(request({ theme: "impact", expiresInSeconds: 3600 }), { params: Promise.resolve({ id: generationId }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.auditWarning).toBe(true);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("refuses to create a link before the PDF artifact exists", async () => {
    artifactMock.mockResolvedValueOnce(null);

    const response = await POST(request({ theme: "scientific", expiresInSeconds: 3600 }), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(409);
    expect(createMock).not.toHaveBeenCalled();
    expect(downloadMock).not.toHaveBeenCalled();
  });
});
