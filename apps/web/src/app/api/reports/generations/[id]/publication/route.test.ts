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

import {
  InvalidReportGenerationIdError,
} from "@/lib/reports/report-generation-history-store";
import { InvalidReportGenerationSnapshotError } from "@/lib/reports/report-generation-payload";
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
    expect(preview.headers.get("cache-control")).toBe("private, no-store");
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
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(revokeMock).toHaveBeenCalledWith({ generationId, createdByClerkId: "owner-1" });
  });

  it.each([
    [new InvalidReportGenerationIdError(), 400, "Identifiant de rapport invalide."],
    [new InvalidReportGenerationSnapshotError(), 422, "Le snapshot historique est invalide ou incompatible."],
    [new Error("private database failure"), 503, "Impossible de charger le rapport historique."],
  ])("maps generation load errors to the contracted safe response", async (error, status, message) => {
    snapshotMock.mockRejectedValueOnce(error);
    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: message });
    expect(artifactMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing owner-scoped generation without consulting publication storage", async () => {
    snapshotMock.mockResolvedValueOnce(null);
    const response = await GET(request(), { params: Promise.resolve({ id: generationId }) });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Rapport historique introuvable." });
    expect(publicationMock).not.toHaveBeenCalled();
    expect(artifactMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid preview theme before reading publication or PDF state", async () => {
    const response = await GET(new Request(`${request().url}?theme=private`), { params: Promise.resolve({ id: generationId }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Thème PDF invalide." });
    expect(publicationMock).not.toHaveBeenCalled();
    expect(artifactMock).not.toHaveBeenCalled();
  });

  it("distinguishes private, published and revoked preview states without exposing stored identity", async () => {
    publicationMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ publishedAt: "2026-10-18T11:00:00.000Z", revokedAt: null, createdByClerkId: "owner-1" }).mockResolvedValueOnce({ publishedAt: "2026-10-18T11:00:00.000Z", revokedAt: "2026-10-18T12:00:00.000Z", createdByClerkId: "owner-1" });
    const first = await GET(request(), { params: Promise.resolve({ id: generationId }) });
    const second = await GET(request(), { params: Promise.resolve({ id: generationId }) });
    const third = await GET(request(), { params: Promise.resolve({ id: generationId }) });
    const thirdBody = await third.json();
    expect((await first.json()).publication).toEqual({ status: "private", publishedAt: null });
    expect((await second.json()).publication).toEqual({ status: "published", publishedAt: "2026-10-18T11:00:00.000Z" });
    expect(thirdBody.publication).toEqual({ status: "revoked", publishedAt: "2026-10-18T11:00:00.000Z" });
    expect(JSON.stringify(thirdBody)).not.toContain("createdByClerkId");
    expect(publicationMock).toHaveBeenCalledWith({ generationId, createdByClerkId: "owner-1" });
  });

  it("maps preview eligibility and persistence failures without disclosing storage errors", async () => {
    snapshotMock.mockResolvedValueOnce({ ...generation, scopeKind: "single_action" });
    const forbidden = await GET(request(), { params: Promise.resolve({ id: generationId }) });
    expect(forbidden.status).toBe(422);
    expect(await forbidden.json()).toMatchObject({ code: "publication_not_allowed" });

    publicationMock.mockRejectedValueOnce(new Error("private publication table detail"));
    const failed = await GET(request(), { params: Promise.resolve({ id: generationId }) });
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("private publication table detail");
  });

  it("validates publish theme and eligibility before loading or creating an artifact publication", async () => {
    const invalidTheme = await POST(request("POST", { theme: "raw" }), { params: Promise.resolve({ id: generationId }) });
    expect(invalidTheme.status).toBe(400);
    expect(artifactMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();

    snapshotMock.mockResolvedValueOnce({ ...generation, scopeKind: "single_action" });
    const ineligible = await POST(request("POST", { theme: "scientific" }), { params: Promise.resolve({ id: generationId }) });
    expect(ineligible.status).toBe(422);
    expect(artifactMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("requires a ready artifact and leaves publication and audit untouched after artifact failures", async () => {
    artifactMock.mockResolvedValueOnce({ ...artifact, status: "pending" });
    const pending = await POST(request("POST", { theme: "scientific" }), { params: Promise.resolve({ id: generationId }) });
    expect(pending.status).toBe(409);
    expect(await pending.json()).toMatchObject({ code: "pdf_artifact_required" });
    expect(createMock).not.toHaveBeenCalled();
    expect(auditMock).not.toHaveBeenCalled();

    artifactMock.mockRejectedValueOnce(new Error("artifact backend failure"));
    const failed = await POST(request("POST", { theme: "scientific" }), { params: Promise.resolve({ id: generationId }) });
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("artifact backend failure");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("keeps a successful publication response when the best-effort audit fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    auditMock.mockRejectedValueOnce(new Error("audit unavailable"));
    const response = await POST(request("POST", { theme: "scientific" }), { params: Promise.resolve({ id: generationId }) });
    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "owner-1",
      targetId: generationId,
      details: { operation: "publish_report" },
      outcome: "success",
    }));
    error.mockRestore();
  });

  it("maps publication write errors to 503 without emitting a success audit", async () => {
    createMock.mockRejectedValueOnce(new Error("publication insert failed"));
    const response = await POST(request("POST", { theme: "scientific" }), { params: Promise.resolve({ id: generationId }) });
    expect(response.status).toBe(503);
    expect(auditMock).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("publication insert failed");
  });

  it("maps revocation persistence errors without auditing a successful state change", async () => {
    revokeMock.mockRejectedValueOnce(new Error("revoke backend failure"));
    const response = await DELETE(request("DELETE"), { params: Promise.resolve({ id: generationId }) });
    expect(response.status).toBe(503);
    expect(auditMock).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("revoke backend failure");
  });
});
