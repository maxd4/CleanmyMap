import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import {
  createReportPdfShare,
  createReportPdfShareToken,
  findActiveReportPdfShareByTokenHash,
  hashReportPdfShareToken,
  isReportPdfShareExpiryValid,
  listReportPdfSharesForOwner,
  REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS,
  REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS,
  revokeReportPdfShare,
} from "./report-generation-pdf-share-store";

const row = {
  id: "33333333-3333-4333-8333-333333333333",
  generation_id: "11111111-1111-4111-8111-111111111111",
  artifact_id: "22222222-2222-4222-8222-222222222222",
  created_by_clerk_id: "owner-1",
  theme: "impact" as const,
  renderer_version: "chromium-official-report-pdf-v1",
  expires_at: "2026-10-19T00:00:00.000Z",
  revoked_at: null,
  created_at: "2026-10-18T00:00:00.000Z",
};

function configureQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    gt: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  for (const method of ["select", "insert", "update", "eq", "is", "gt"]) {
    query[method as keyof typeof query] = vi.fn().mockReturnValue(query) as never;
  }
  query.order.mockResolvedValue(result);
  query.single.mockResolvedValue(result);
  query.maybeSingle.mockResolvedValue(result);
  getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(query) });
  return query;
}

describe("report-generation-pdf-share-store token contract", () => {
  beforeEach(() => vi.clearAllMocks());
  it("creates an unpredictable base64url bearer and stores only its SHA-256-sized digest", () => {
    const token = createReportPdfShareToken();
    const secondToken = createReportPdfShareToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(secondToken).not.toBe(token);
    expect(hashReportPdfShareToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashReportPdfShareToken(token)).not.toContain(token);
  });

  it("bounds share expiry server-side", () => {
    expect(isReportPdfShareExpiryValid(REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS)).toBe(true);
    expect(isReportPdfShareExpiryValid(REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS)).toBe(true);
    expect(isReportPdfShareExpiryValid(REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS - 1)).toBe(false);
    expect(isReportPdfShareExpiryValid(REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS + 1)).toBe(false);
    expect(isReportPdfShareExpiryValid(3600.5)).toBe(false);
  });

  it("reads only active shares by hashed bearer, expiry and owner scope", async () => {
    const query = configureQuery({ data: row, error: null });

    const share = await findActiveReportPdfShareByTokenHash({ tokenHash: "hash", now: "2026-10-18T12:00:00.000Z" });

    expect(query.eq).toHaveBeenNthCalledWith(1, "token_hash", "hash");
    expect(query.is).toHaveBeenCalledWith("revoked_at", null);
    expect(query.gt).toHaveBeenCalledWith("expires_at", "2026-10-18T12:00:00.000Z");
    expect(share).toMatchObject({ id: row.id, generationId: row.generation_id, artifactId: row.artifact_id });
    expect(JSON.stringify(share)).not.toContain("token_hash");
  });

  it("persists only the token hash and exact renderer variant", async () => {
    const query = configureQuery({ data: row, error: null });
    const token = "a".repeat(43);

    await createReportPdfShare({
      generationId: row.generation_id,
      artifactId: row.artifact_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: row.theme,
      rendererVersion: row.renderer_version,
      expiresAt: row.expires_at,
      token,
    });

    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      generation_id: row.generation_id,
      artifact_id: row.artifact_id,
      theme: row.theme,
      renderer_version: row.renderer_version,
      token_hash: hashReportPdfShareToken(token),
      expires_at: row.expires_at,
    }));
    expect(query.insert.mock.calls[0][0]).not.toHaveProperty("token");
  });

  it("revoke is owner- and generation-scoped and cannot revive a revoked row", async () => {
    const query = configureQuery({ data: row, error: null });

    await revokeReportPdfShare({
      shareId: row.id,
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      revokedAt: "2026-10-18T12:00:00.000Z",
    });

    expect(query.update).toHaveBeenCalledWith({ revoked_at: "2026-10-18T12:00:00.000Z" });
    expect(query.eq).toHaveBeenCalledWith("id", row.id);
    expect(query.eq).toHaveBeenCalledWith("generation_id", row.generation_id);
    expect(query.eq).toHaveBeenCalledWith("created_by_clerk_id", row.created_by_clerk_id);
    expect(query.is).toHaveBeenCalledWith("revoked_at", null);
  });

  it("keeps owner listing scoped and propagates database errors", async () => {
    const query = configureQuery({ data: [row], error: null });
    const shares = await listReportPdfSharesForOwner({ generationId: row.generation_id, createdByClerkId: row.created_by_clerk_id });
    expect(query.eq).toHaveBeenCalledWith("generation_id", row.generation_id);
    expect(query.eq).toHaveBeenCalledWith("created_by_clerk_id", row.created_by_clerk_id);
    expect(shares).toHaveLength(1);

    configureQuery({ data: null, error: new Error("database unavailable") });
    await expect(listReportPdfSharesForOwner({ generationId: row.generation_id, createdByClerkId: row.created_by_clerk_id })).rejects.toThrow("database unavailable");
  });
});
