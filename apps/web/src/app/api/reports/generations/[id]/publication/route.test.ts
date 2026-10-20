import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const snapshotMock = vi.hoisted(() => vi.fn());
const artifactMock = vi.hoisted(() => vi.fn());
const publicationMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const revokeMock = vi.hoisted(() => vi.fn());
const auditMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: authMock }));
vi.mock("@/lib/reports/report-generation-history-store", () => ({
  getReportGenerationSnapshotById: snapshotMock,
  InvalidReportGenerationIdError: class InvalidReportGenerationIdError extends Error {},
}));
vi.mock("@/lib/reports/report-generation-payload", () => ({ InvalidReportGenerationSnapshotError: class InvalidReportGenerationSnapshotError extends Error {} }));
vi.mock("@/lib/reports/report-generation-pdf-artifact-store", () => ({
  getReportPdfArtifactForOwner: artifactMock,
  REPORT_PDF_ARTIFACT_RENDERER_VERSION: "chromium-official-report-pdf-v1",
}));
vi.mock("@/lib/reports/report-publication-store", () => ({
  getReportPublicationForOwner: publicationMock,
  createReportPublication: createMock,
  revokeReportPublication: revokeMock,
}));
vi.mock("@/lib/admin/audit/operation-audit", () => ({ appendAdminOperationAudit: auditMock }));

import { DELETE, GET, POST } from "./route";

const generationId = "11111111-1111-4111-8111-111111111111";
const artifact = { id: "22222222-2222-4222-8222-222222222222", generationId, createdByClerkId: "owner-1", theme: "scientific" as const, rendererVersion: "chromium-official-report-pdf-v1", storagePath: "private/path.pdf", status: "ready" as const, byteSize: 12, updatedAt: "2026-10-18T10:00:00.000Z" };
const generation = { id: generationId, filename: "rapport.pdf", generatedAt: "2026-10-18T10:00:00.000Z", scopeKind: "global" as const, scopeValue: "", scopeLabel: "Toutes les actions", detailLevel: "default" as const, theme: "scientific" as const, snapshot: { title: "Rapport scientifique", rubrique: "reporting", periode: "six_months", organizationType: "Global", data: { generatedAt: "2026-10-18T10:00:00.000Z", summary: ["Résumé"] } } };

function request(method = "GET", body?: unknown) {
  return new Request(`https://cleanmymap.test/api/reports/generations/${generationId}/publication`, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
}

describe("report publication route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    snapshotMock.mockResolvedValue(generation);
    artifactMock.mockResolvedValue(artifact);
    publicationMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "publication-1", publishedAt: "2026-10-18T11:00:00.000Z", revokedAt: null });
    revokeMock.mockResolvedValue({ revokedAt: "2026-10-18T12:00:00.000Z" });
  });

  it("protects preview and mutation with server authentication", async () => {
    authMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    expect((await GET(request(), { params: Promise.resolve({ id: generationId }) })).status).toBe(401);
    expect(snapshotMock).not.toHaveBeenCalled();
  });

  it("returns a safe preview and publishes only the ready exact artifact", async () => {
    const preview = await GET(request(), { params: Promise.resolve({ id: generationId }) });
    expect(preview.status).toBe(200);
    expect((await preview.json()).preview).toMatchObject({ artifactReady: true, authorLabel: null });

    const response = await POST(request("POST", { theme: "scientific" }), { params: Promise.resolve({ id: generationId }) });
    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ generationId, artifactId: artifact.id, theme: "scientific", publicAuthorLabel: null }));
  });

  it("does not reveal an inaccessible generation to another account", async () => {
    authMock.mockResolvedValue({ ok: true, userId: "other-user" });
    snapshotMock.mockResolvedValue(null);
    const response = await POST(request("POST", { theme: "scientific" }), { params: Promise.resolve({ id: generationId }) });
    expect(response.status).toBe(404);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("refuses anonymous publication mutations before reading or persisting history", async () => {
    authMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });

    const publish = await POST(request("POST", { theme: "scientific" }), { params: Promise.resolve({ id: generationId }) });
    const revoke = await DELETE(request("DELETE"), { params: Promise.resolve({ id: generationId }) });

    expect(publish.status).toBe(401);
    expect(revoke.status).toBe(401);
    expect(snapshotMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it("does not let another account revoke the publication", async () => {
    authMock.mockResolvedValue({ ok: true, userId: "other-user" });
    revokeMock.mockResolvedValueOnce(null);

    const response = await DELETE(request("DELETE"), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(404);
    expect(revokeMock).toHaveBeenCalledWith({ generationId, createdByClerkId: "other-user" });
    expect(auditMock).not.toHaveBeenCalled();
  });

  it("rejects unsafe projection and does not publish it", async () => {
    snapshotMock.mockResolvedValue({ ...generation, snapshot: { ...generation.snapshot, data: { ...generation.snapshot.data, rows: [{ email: "private@example.com" }] } } });
    const response = await POST(request("POST", { theme: "scientific" }), { params: Promise.resolve({ id: generationId }) });
    expect(response.status).toBe(422);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("requires the exact ready PDF variant before publishing", async () => {
    artifactMock.mockResolvedValueOnce(null);

    const response = await POST(request("POST", { theme: "scientific" }), { params: Promise.resolve({ id: generationId }) });

    expect(response.status).toBe(409);
    expect(createMock).not.toHaveBeenCalled();
    expect(auditMock).not.toHaveBeenCalled();
  });

  it("revokes only the owner's publication", async () => {
    const response = await DELETE(request("DELETE"), { params: Promise.resolve({ id: generationId }) });
    expect(response.status).toBe(200);
    expect(revokeMock).toHaveBeenCalledWith({ generationId, createdByClerkId: "owner-1" });
  });
});
