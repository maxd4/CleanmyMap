import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(), getSupabaseAdminClient: vi.fn(), rpc: vi.fn(),
}));
vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: mocks.getSupabaseAdminClient }));

import { POST } from "./route";
import { hashPersonalAiImportValue, personalAiImportIdentityHash } from "@/lib/environmental-impact-estimator/ai-personal-import-hash";
import { parsePersonalAiDeclaration, parsePersonalAiNormalizedDeclaration } from "@/lib/environmental-impact-estimator/personal-ai-declaration-http";

const declaration = parsePersonalAiDeclaration({
  provider: "GOOGLE", source: "PROVIDER_EXPORT", sourceVersion: "GenerateContentResponse.usageMetadata", provenance: "PROVIDER_REPORTED", granularity: "PER_REQUEST",
  periodStartUtc: null, periodEndUtc: null, modelRaw: "gemini-model-example", modelCanonical: null, operator: null,
  execution: "CLOUD", inferenceRegion: null, access: "UNKNOWN", requestCount: 1,
  tokens: { inputTotal: 231, inputUncached: 181, cacheRead: 50, cacheWrite: null, outputVisible: 242, outputReasoning: 524, outputTotal: 766, reasoningRelation: "ADDITIONAL" },
  modality: { images: null, audioMinutes: null, videoSeconds: null },
  energy: { kwh: null, boundary: null, evidence: null, averageWatts: null, durationSeconds: null, idleWatts: null },
});
const row = {
  declaration, sourceIdentityHash: "a".repeat(64), sourceScope: { response_id: "c".repeat(64) }, normalizedContentHash: "b".repeat(64),
  metadata: { provider: "GOOGLE", granularity: "PER_REQUEST", completeness: "COMPLETE", freshnessUtc: null },
  costAmount: null, costCurrency: null,
};

beforeEach(async () => {
  vi.clearAllMocks();
  row.normalizedContentHash = await hashPersonalAiImportValue({
    declaration, metadata: row.metadata, costAmount: row.costAmount, costCurrency: row.costCurrency,
  });
  row.sourceIdentityHash = await personalAiImportIdentityHash("GOOGLE", declaration.sourceVersion, declaration.periodStartUtc, declaration.periodEndUtc,
    declaration.modelCanonical ?? declaration.modelRaw, row.sourceScope);
  mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "owner-a" });
  mocks.getSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ data: [{ id: "saved", owner_clerk_id: "owner-a", declaration }], error: null });
});

describe("POST /api/personal-ai/imports", () => {
  it("requires Clerk auth and returns private no-store responses", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const response = await POST(new Request("https://example.test/api/personal-ai/imports", { method: "POST", body: JSON.stringify({ rows: [row] }) }));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rejects malformed hashes before calling the atomic owner RPC", async () => {
    const response = await POST(new Request("https://example.test/api/personal-ai/imports", { method: "POST", body: JSON.stringify({ rows: [{ ...row, sourceIdentityHash: "not-a-hash" }] }) }));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("bounds a chunked body even when the caller omits Content-Length", async () => {
    const response = await POST(new Request("https://example.test/api/personal-ai/imports", {
      method: "POST", body: "x".repeat(16_000_001),
    }));
    expect(response.status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects content changed while retaining the client normalized hash", async () => {
    const changedDeclaration = { ...declaration, requestCount: 2 };
    const response = await POST(new Request("https://example.test/api/personal-ai/imports", {
      method: "POST", body: JSON.stringify({ rows: [{ ...row, declaration: changedDeclaration }] }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects a source identity hash that does not match the hashed scope", async () => {
    const response = await POST(new Request("https://example.test/api/personal-ai/imports", {
      method: "POST", body: JSON.stringify({ rows: [{ ...row, sourceIdentityHash: "d".repeat(64) }] }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("recomputes snapshots on the server and sends no owner or raw file data", async () => {
    expect(await hashPersonalAiImportValue({
      declaration: parsePersonalAiNormalizedDeclaration(row.declaration), metadata: row.metadata, costAmount: row.costAmount, costCurrency: row.costCurrency,
    })).toBe(row.normalizedContentHash);
    const response = await POST(new Request("https://example.test/api/personal-ai/imports", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: [row] }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.rpc).toHaveBeenCalledWith("confirm_personal_ai_import_for_owner", {
      p_owner_clerk_id: "owner-a",
      p_rows: [expect.objectContaining({
      source_identity_hash: row.sourceIdentityHash, normalized_content_hash: row.normalizedContentHash,
      source_scope: row.sourceScope,
      snapshot: expect.objectContaining({ physicalTotals: expect.any(Object) }),
    })] });
    const body = mocks.rpc.mock.calls[0][1].p_rows[0];
    expect(body).not.toHaveProperty("owner_clerk_id");
    expect(body).not.toHaveProperty("file");
    expect(JSON.stringify(body)).not.toContain("prompt");
  });

  it("reports an atomic persistence failure without claiming any saved rows", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("database failure") });
    const response = await POST(new Request("https://example.test/api/personal-ai/imports", { method: "POST", body: JSON.stringify({ rows: [row] }) }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("aucune ligne") });
  });

  it("maps PostgreSQL overlap conflicts to an explicit HTTP conflict", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23P01" } });
    const response = await POST(new Request("https://example.test/api/personal-ai/imports", { method: "POST", body: JSON.stringify({ rows: [row] }) }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("recoupe");
  });
});
