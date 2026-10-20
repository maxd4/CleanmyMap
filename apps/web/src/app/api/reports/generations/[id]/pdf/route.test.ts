import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const snapshotMock = vi.hoisted(() => vi.fn());
const claimMock = vi.hoisted(() => vi.fn());
const waitMock = vi.hoisted(() => vi.fn());
const readyMock = vi.hoisted(() => vi.fn());
const failedMock = vi.hoisted(() => vi.fn());
const reclaimMock = vi.hoisted(() => vi.fn());
const renderMock = vi.hoisted(() => vi.fn());
const auditMock = vi.hoisted(() => vi.fn());
const downloadMock = vi.hoisted(() => vi.fn());
const uploadMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: authMock }));
vi.mock("@/lib/reports/report-generation-history-store", () => ({
  getReportGenerationSnapshotById: snapshotMock,
  InvalidReportGenerationIdError: class InvalidReportGenerationIdError extends Error {},
}));
vi.mock("@/lib/reports/report-generation-payload", () => ({
  InvalidReportGenerationSnapshotError: class InvalidReportGenerationSnapshotError extends Error {},
}));
vi.mock("@/lib/reports/report-generation-pdf-artifact-store", () => ({
  REPORT_PDF_ARTIFACT_BUCKET: "reports",
  REPORT_PDF_ARTIFACT_RENDERER_VERSION: "chromium-official-report-pdf-v1",
  claimReportPdfArtifact: claimMock,
  downloadReportPdfArtifact: downloadMock,
  isConfirmedReportPdfArtifactStorageAbsence: (error: { status?: unknown; statusCode?: unknown; code?: unknown } | null) => error?.status === 404 || error?.statusCode === 404 || error?.code === "not_found",
  waitForReportPdfArtifact: waitMock,
  markReportPdfArtifactReady: readyMock,
  markReportPdfArtifactFailed: failedMock,
  reclaimMissingReportPdfArtifact: reclaimMock,
}));
vi.mock("@/lib/reports/report-pdf-renderer", () => ({ renderOfficialReportPdf: renderMock }));
vi.mock("@/lib/admin/audit/operation-audit", () => ({ appendAdminOperationAudit: auditMock }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => ({
    storage: {
      from: () => ({ download: downloadMock, upload: uploadMock }),
    },
  }),
}));

import { GET } from "./route";

const generationId = "11111111-1111-4111-8111-111111111111";
const generation = {
  id: generationId,
  filename: "rapport_reporting_annee_2026.pdf",
  generatedAt: "2026-10-18T08:00:00.000Z",
  scopeKind: "global" as const,
  scopeValue: "",
  scopeLabel: "Global",
  detailLevel: "default" as const,
  snapshot: {
    title: "Rapport historique",
    rubrique: "reporting",
    periode: "full_history",
    organizationType: "Global",
    data: { generatedAt: "2026-10-18T08:00:00.000Z", summary: ["État"] },
  },
};
const artifact = {
  id: "22222222-2222-4222-8222-222222222222",
  generationId,
  createdByClerkId: "user-1",
  theme: "impact" as const,
  rendererVersion: "chromium-official-report-pdf-v1",
  storagePath: `report-generations/${generationId}/chromium-official-report-pdf-v1/impact.pdf`,
  status: "rendering" as const,
  byteSize: null,
  updatedAt: "2026-10-18T08:00:00.000Z",
};

function request(theme = "impact") {
  return new Request(`http://localhost/api/reports/generations/${generationId}/pdf?theme=${theme}`);
}

describe("GET /api/reports/generations/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, userId: "user-1" });
    snapshotMock.mockResolvedValue(generation);
    claimMock.mockResolvedValue({ kind: "owner", artifact });
    waitMock.mockResolvedValue({ ...artifact, status: "ready", byteSize: 3 });
    readyMock.mockResolvedValue({ ...artifact, status: "ready", byteSize: 3 });
    failedMock.mockResolvedValue(undefined);
    reclaimMock.mockResolvedValue({ kind: "owner", artifact });
    renderMock.mockResolvedValue(Buffer.from("%PDF-1.7"));
    auditMock.mockResolvedValue(undefined);
    uploadMock.mockResolvedValue({ error: null });
    downloadMock.mockResolvedValue({ data: new Blob(["%PDF-1.7"], { type: "application/pdf" }), error: null });
  });

  it("requires owner authentication before reading the snapshot", async () => {
    authMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });

    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(401);
    expect(snapshotMock).not.toHaveBeenCalled();
  });

  it("renders a cache miss from the immutable snapshot and returns a real PDF", async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(await response.text()).toBe("%PDF-1.7");
    expect(renderMock).toHaveBeenCalledWith({ payload: generation.snapshot, theme: "impact" });
    expect(uploadMock).toHaveBeenCalledWith(
      artifact.storagePath,
      expect.any(Blob),
      expect.objectContaining({ contentType: "application/pdf", upsert: false }),
    );
    expect(readyMock).toHaveBeenCalledWith({ artifactId: artifact.id, byteSize: 8 });
  });

  it.each([
    ["legacy", { title: "Legacy", rubrique: "reporting", periode: "six_months", organizationType: "Global", data: { generatedAt: "2026-10-18T08:00:00.000Z" } }],
    ["v1", { ...generation.snapshot, snapshotSchemaVersion: 1 as const }],
    ["v2", { ...generation.snapshot, snapshotSchemaVersion: 2 as const, snapshotMetadata: { templateVersion: "reports-template-v1", rendererVersion: "official-report-html-v1" } }],
  ] as const)("renders %s snapshots through the compatible renderer without a new generation", async (_label, snapshot) => {
    snapshotMock.mockResolvedValueOnce({ ...generation, snapshot });

    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(200);
    expect(renderMock).toHaveBeenCalledWith({ payload: snapshot, theme: "impact" });
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("returns the conserved artifact bytes identically and does not render a replacement", async () => {
    const originalBytes = "%PDF-conserved-original-bytes%";
    claimMock.mockResolvedValueOnce({ kind: "ready", artifact: { ...artifact, status: "ready", byteSize: originalBytes.length } });
    downloadMock.mockResolvedValueOnce({ data: new Blob([originalBytes], { type: "application/pdf" }), error: null });

    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(originalBytes);
    expect(renderMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("reuses a ready artifact without rendering or quota work", async () => {
    claimMock.mockResolvedValueOnce({ kind: "ready", artifact: { ...artifact, status: "ready", byteSize: 8 } });

    const response = await GET(request("scientific"), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(200);
    expect(renderMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(claimMock).toHaveBeenCalledWith(expect.objectContaining({ theme: "scientific" }));
  });

  it("does not render a second copy while another request owns the artifact", async () => {
    claimMock.mockResolvedValueOnce({ kind: "rendering", artifact });

    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(200);
    expect(renderMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(waitMock).toHaveBeenCalled();
  });

  it("still delivers the ready PDF when its success audit is unavailable", async () => {
    auditMock.mockRejectedValueOnce(new Error("audit unavailable")).mockResolvedValueOnce(undefined);

    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(auditMock).toHaveBeenCalledTimes(2);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it("fails explicitly when Storage cannot confirm the uploaded artifact", async () => {
    uploadMock.mockResolvedValueOnce({ error: new Error("storage upload failed") });
    downloadMock.mockResolvedValueOnce({ data: null, error: new Error("storage verification failed") });

    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(503);
    expect(failedMock).toHaveBeenCalledWith({ artifactId: artifact.id, errorCode: "pdf_render_failed" });
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it("repairs a ready artifact after Storage confirms that its object is absent", async () => {
    claimMock.mockResolvedValueOnce({ kind: "ready", artifact: { ...artifact, status: "ready", byteSize: 8 } });
    downloadMock
      .mockResolvedValueOnce({ data: null, error: { statusCode: 404, code: "not_found" } })
      .mockResolvedValueOnce({ data: new Blob(["%PDF-repaired"], { type: "application/pdf" }), error: null });
    reclaimMock.mockResolvedValueOnce({ kind: "owner", artifact });

    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(200);
    expect(reclaimMock).toHaveBeenCalledWith(expect.objectContaining({
      artifactId: artifact.id,
      generationId,
      createdByClerkId: "user-1",
    }));
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledWith(
      artifact.storagePath,
      expect.any(Blob),
      expect.objectContaining({ upsert: false }),
    );
  });

  it("does not invalidate a ready artifact when Storage is temporarily unavailable", async () => {
    claimMock.mockResolvedValueOnce({ kind: "ready", artifact: { ...artifact, status: "ready", byteSize: 8 } });
    downloadMock.mockResolvedValueOnce({ data: null, error: { status: 503, code: "service_unavailable" } });

    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(503);
    expect(reclaimMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
    expect(failedMock).not.toHaveBeenCalled();
  });

  it("reconciles an already uploaded object without overwriting it", async () => {
    uploadMock.mockResolvedValueOnce({ error: { status: 409, code: "already_exists" } });
    downloadMock.mockResolvedValueOnce({
      data: new Blob(["%PDF-existing"], { type: "application/pdf" }),
      error: null,
    });

    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(200);
    expect(uploadMock).toHaveBeenCalledWith(
      artifact.storagePath,
      expect.any(Blob),
      expect.objectContaining({ upsert: false }),
    );
    expect(downloadMock).toHaveBeenCalledTimes(2);
    expect(readyMock).toHaveBeenCalledWith({ artifactId: artifact.id, byteSize: 13 });
    expect(failedMock).not.toHaveBeenCalled();
  });

  it("keeps an uncertain ready confirmation recoverable without downgrading or rerendering", async () => {
    readyMock.mockRejectedValueOnce(new Error("confirmation response lost"));

    const firstResponse = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(firstResponse.status).toBe(503);
    expect(failedMock).not.toHaveBeenCalled();
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledTimes(1);

    claimMock.mockResolvedValueOnce({ kind: "ready", artifact: { ...artifact, status: "ready", byteSize: 8 } });
    const secondResponse = await GET(request(), { params: Promise.resolve({ id: generationId }) });

    expect(secondResponse.status).toBe(200);
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it("refuses a source that is not owned or a renderer that is no longer available", async () => {
    snapshotMock.mockResolvedValueOnce(null);
    expect((await GET(request(), { params: Promise.resolve({ id: generationId }) })).status).toBe(404);

    snapshotMock.mockResolvedValueOnce({
      ...generation,
      snapshot: {
        ...generation.snapshot,
        snapshotMetadata: { templateVersion: "reports-template-v0", rendererVersion: "old" },
      },
    });
    expect((await GET(request(), { params: Promise.resolve({ id: generationId }) })).status).toBe(422);
    expect(claimMock).not.toHaveBeenCalled();
  });
});
