import { beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.hoisted(() => vi.fn());
const activeMock = vi.hoisted(() => vi.fn());
const artifactMock = vi.hoisted(() => vi.fn());
const downloadMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/reports/report-publication-store", () => ({ listPublicReportLibraryPage: listMock, getActiveReportPublicationById: activeMock }));
vi.mock("@/lib/reports/report-generation-pdf-artifact-store", () => ({ getReportPdfArtifactById: artifactMock, downloadReportPdfArtifact: downloadMock, REPORT_PDF_ARTIFACT_RENDERER_VERSION: "chromium-official-report-pdf-v1" }));

import { GET as list } from "./route";
import { GET as item } from "./[id]/route";
import { GET as pdf } from "./[id]/pdf/route";

const publication = { id: "pub-1", generationId: "gen-private", artifactId: "artifact-private", createdByClerkId: "owner-private", title: "Rapport public", periodId: "six_months", scopeLabel: "Toutes les actions", theme: "impact" as const, publishedAt: "2026-10-18T11:00:00.000Z", revokedAt: null, publicAuthorLabel: null };

describe("public report library", () => {
  beforeEach(() => { vi.clearAllMocks(); listMock.mockResolvedValue({ rows: [{ id: publication.id, title: publication.title, period: "Six mois", scope: publication.scopeLabel, theme: "impact", publishedAt: publication.publishedAt, authorLabel: null, viewUrl: "/api/reports/library/pub-1/pdf", downloadUrl: "/api/reports/library/pub-1/pdf?download=1" }], page: 1, pageSize: 12, total: 1, hasNextPage: false, hasPreviousPage: false }); activeMock.mockResolvedValue(publication); artifactMock.mockResolvedValue({ id: publication.artifactId, generationId: publication.generationId, theme: "impact", rendererVersion: "chromium-official-report-pdf-v1", status: "ready", storagePath: "private/object.pdf" }); downloadMock.mockResolvedValue({ data: new Blob(["%PDF-1.7"], { type: "application/pdf" }), error: null }); });
  it("lists only the safe public projection with server pagination", async () => { const response = await list(new Request("https://cleanmymap.test/api/reports/library?page=2&theme=impact")); expect(response.status).toBe(200); expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ page: 2, theme: "impact" })); const body = await response.json(); expect(JSON.stringify(body)).not.toContain("gen-private"); expect(JSON.stringify(body)).not.toContain("owner-private"); });
  it("does not cache public metadata that depends on revocation", async () => { const response = await list(new Request("https://cleanmymap.test/api/reports/library?page=2&theme=impact")); expect(response.headers.get("Cache-Control")).toBe("no-store"); const metadata = await item(new Request("https://cleanmymap.test/api/reports/library/pub-1"), { params: Promise.resolve({ id: publication.id }) }); expect(metadata.status).toBe(200); expect(metadata.headers.get("Cache-Control")).toBe("no-store"); });
  it("hides revoked items on direct metadata and PDF access", async () => { activeMock.mockResolvedValue(null); expect((await item(new Request("https://cleanmymap.test/api/reports/library/pub-1"), { params: Promise.resolve({ id: publication.id }) })).status).toBe(404); expect((await pdf(new Request("https://cleanmymap.test/api/reports/library/pub-1/pdf"), { params: Promise.resolve({ id: publication.id }) })).status).toBe(404); });
  it("streams the private artifact through the server route without shared caching", async () => { const response = await pdf(new Request("https://cleanmymap.test/api/reports/library/pub-1/pdf?download=1"), { params: Promise.resolve({ id: publication.id }) }); expect(response.status).toBe(200); expect(response.headers.get("Content-Type")).toBe("application/pdf"); expect(response.headers.get("Content-Disposition")).toContain("attachment"); expect(response.headers.get("Content-Disposition")).not.toContain("private/object.pdf"); expect(response.headers.get("Cache-Control")).toBe("no-store"); });
});
