import { beforeEach, describe, expect, it, vi } from "vitest";

const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const findShareMock = vi.hoisted(() => vi.fn());
const hashTokenMock = vi.hoisted(() => vi.fn((token: string) => `hash:${token}`));
const artifactMock = vi.hoisted(() => vi.fn());
const downloadMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimit: enforceRateLimitMock }));
vi.mock("@/lib/reports/report-generation-pdf-share-store", () => ({
  findActiveReportPdfShareByTokenHash: findShareMock,
  hashReportPdfShareToken: hashTokenMock,
}));
vi.mock("@/lib/reports/report-generation-pdf-artifact-store", () => ({
  getReportPdfArtifactById: artifactMock,
  downloadReportPdfArtifact: downloadMock,
  isConfirmedReportPdfArtifactStorageAbsence: (error: { status?: unknown; statusCode?: unknown; code?: unknown } | null) => error?.status === 404 || error?.statusCode === 404 || error?.code === "not_found",
}));

import { GET } from "./route";

const token = "a".repeat(43);
const share = {
  id: "33333333-3333-4333-8333-333333333333",
  generationId: "11111111-1111-4111-8111-111111111111",
  artifactId: "22222222-2222-4222-8222-222222222222",
  createdByClerkId: "owner-1",
  theme: "impact" as const,
  rendererVersion: "chromium-official-report-pdf-v1",
  expiresAt: "2026-10-19T00:00:00.000Z",
  revokedAt: null,
  createdAt: "2026-10-18T00:00:00.000Z",
};
const artifact = {
  id: share.artifactId,
  generationId: share.generationId,
  createdByClerkId: share.createdByClerkId,
  theme: share.theme,
  rendererVersion: share.rendererVersion,
  storagePath: "report-generations/immutable/impact.pdf",
  status: "ready" as const,
  byteSize: 8,
  updatedAt: "2026-10-18T00:00:00.000Z",
};

function request(value = token): Request {
  return new Request(`https://cleanmymap.test/api/reports/shared/${value}`);
}

describe("GET /api/reports/shared/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimitMock.mockResolvedValue(null);
    findShareMock.mockResolvedValue(share);
    artifactMock.mockResolvedValue(artifact);
    downloadMock.mockResolvedValue({ data: new Blob(["%PDF-1.7"], { type: "application/pdf" }), error: null });
  });

  it("serves only the exact active shared PDF and never accepts a report id from the caller", async () => {
    const response = await GET(request(), { params: Promise.resolve({ token }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(await response.text()).toBe("%PDF-1.7");
    expect(hashTokenMock).toHaveBeenCalledWith(token);
    expect(findShareMock).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: `hash:${token}` }));
    expect(artifactMock).toHaveBeenCalledWith({
      artifactId: share.artifactId,
      generationId: share.generationId,
      theme: share.theme,
      rendererVersion: share.rendererVersion,
    });
  });

  it.each([
    ["invalid", "x"],
    ["expired", token],
    ["revoked", token],
  ])("refuses a %s bearer without reading Storage", async (_label, value) => {
    if (value === token) findShareMock.mockResolvedValueOnce(null);
    const response = await GET(request(value), { params: Promise.resolve({ token: value }) });

    expect(response.status).toBe(404);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it("refuses a share whose stored variant no longer matches the artifact", async () => {
    artifactMock.mockResolvedValueOnce({ ...artifact, theme: "scientific" });

    const response = await GET(request(), { params: Promise.resolve({ token }) });

    expect(response.status).toBe(404);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it("does not turn a temporary Storage outage into a valid empty response", async () => {
    downloadMock.mockResolvedValueOnce({ data: null, error: { status: 503, code: "service_unavailable" } });

    const response = await GET(request(), { params: Promise.resolve({ token }) });

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
  });

  it("keeps confirmed Storage absence distinct from a temporary outage", async () => {
    downloadMock.mockResolvedValueOnce({ data: null, error: { statusCode: 404, code: "not_found" } });
    const response = await GET(request(), { params: Promise.resolve({ token }) });
    expect(response.status).toBe(404);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
  });

  it("returns an unavailable response when the share lookup fails", async () => {
    findShareMock.mockRejectedValueOnce(new Error("database unavailable"));
    const response = await GET(request(), { params: Promise.resolve({ token }) });
    expect(response.status).toBe(503);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it("applies anonymous rate limiting before looking up the bearer", async () => {
    const limitedResponse = new Response("Too many requests", { status: 429 });
    enforceRateLimitMock.mockResolvedValueOnce(limitedResponse);

    const response = await GET(request(), { params: Promise.resolve({ token }) });

    expect(response).toBe(limitedResponse);
    expect(hashTokenMock).not.toHaveBeenCalled();
    expect(findShareMock).not.toHaveBeenCalled();
    expect(artifactMock).not.toHaveBeenCalled();
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it.each([
    ["empty", ""],
    ["short", "a"],
    ["punctuation", `${"a".repeat(42)}!`],
    ["space", `${"a".repeat(42)} `],
  ] as const)("refuses an %s token before hashing or Storage", async (_label, value) => {
    const response = await GET(request(value), { params: Promise.resolve({ token: value }) });

    expect(response.status).toBe(404);
    expect(hashTokenMock).not.toHaveBeenCalled();
    expect(findShareMock).not.toHaveBeenCalled();
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it.each([
    ["not ready", { ...artifact, status: "pending" as const }],
    ["different owner", { ...artifact, createdByClerkId: "other-owner" }],
    ["different generation", { ...artifact, generationId: "44444444-4444-4444-8444-444444444444" }],
    ["different renderer", { ...artifact, rendererVersion: "forged-renderer" }],
  ] as const)("refuses an artifact with a %s mismatch", async (_label, mismatchedArtifact) => {
    artifactMock.mockResolvedValueOnce(mismatchedArtifact);

    const response = await GET(request(), { params: Promise.resolve({ token }) });

    expect(response.status).toBe(404);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it("does not turn a download exception into an empty PDF", async () => {
    downloadMock.mockRejectedValueOnce(new Error("storage timeout"));

    const response = await GET(request(), { params: Promise.resolve({ token }) });

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("storage timeout");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("publishes only download-safe headers for a valid scientific share", async () => {
    const scientificShare = { ...share, theme: "scientific" as const, rendererVersion: "scientific-pdf-v1" };
    const scientificArtifact = { ...artifact, theme: "scientific" as const, rendererVersion: "scientific-pdf-v1" };
    findShareMock.mockResolvedValueOnce(scientificShare);
    artifactMock.mockResolvedValueOnce(scientificArtifact);

    const response = await GET(request(), { params: Promise.resolve({ token }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="rapport_cleanmymap_scientific.pdf"');
    expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'none'");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Report-Pdf-Renderer-Version")).toBe("scientific-pdf-v1");
  });
});
