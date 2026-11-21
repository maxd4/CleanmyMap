import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  requireSupabaseClerkRlsClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  insert: vi.fn(),
  insertSelect: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  updateSelect: vi.fn(),
  maybeSingle: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/clerk-rls", () => ({ requireSupabaseClerkRlsClient: mocks.requireSupabaseClerkRlsClient }));

import { GET, POST } from "./route";

const validDeclaration = {
  provider: "MANUAL", source: "MANUAL", sourceVersion: null, provenance: "USER_DECLARED", granularity: "UNKNOWN",
  periodStartUtc: "2026-01-01T00:00:00.000Z", periodEndUtc: "2026-02-01T00:00:00.000Z",
  modelRaw: null, modelCanonical: null, operator: null, execution: "CLOUD", inferenceRegion: null, access: "API", requestCount: null,
  tokens: { inputTotal: null, inputUncached: null, cacheRead: null, cacheWrite: null, outputVisible: null, outputReasoning: null, outputTotal: null, reasoningRelation: "UNKNOWN" },
  modality: { images: null, audioMinutes: null, videoSeconds: null },
  energy: { kwh: null, boundary: null, evidence: null, averageWatts: null, durationSeconds: null, idleWatts: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "clerk-owner-a" });
  mocks.requireSupabaseClerkRlsClient.mockResolvedValue({ from: mocks.from });
  mocks.from.mockReturnValue({
    select: mocks.select.mockReturnThis(), eq: mocks.eq.mockReturnThis(), order: mocks.order.mockReturnThis(), range: mocks.range,
    insert: mocks.insert, update: mocks.update, delete: mocks.delete,
  });
  mocks.insert.mockReturnValue({ select: mocks.insertSelect });
  mocks.insertSelect.mockReturnValue({ single: mocks.single });
  mocks.update.mockReturnValue({ eq: mocks.eq.mockReturnThis() });
  mocks.eq.mockReturnValue({ eq: mocks.eq.mockReturnThis(), select: mocks.updateSelect, order: mocks.order.mockReturnThis() });
  mocks.updateSelect.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.delete.mockReturnValue({ eq: mocks.eq.mockReturnThis() });
  mocks.range.mockResolvedValue({ data: [], error: null });
  mocks.single.mockResolvedValue({ data: { id: "new-id", owner_clerk_id: "clerk-owner-a", declaration: validDeclaration }, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
});

describe("personal AI declarations collection API", () => {
  it("returns private no-store 401 without creating a Supabase client", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const response = await GET(new Request("https://example.test/api/personal-ai/declarations"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireSupabaseClerkRlsClient).not.toHaveBeenCalled();
  });

  it("bounds pagination and scopes a list query to the Clerk owner", async () => {
    const response = await GET(new Request("https://example.test/api/personal-ai/declarations?limit=4&offset=8"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.eq).toHaveBeenCalledWith("owner_clerk_id", "clerk-owner-a");
    expect(mocks.order).toHaveBeenNthCalledWith(1, "created_at", { ascending: false });
    expect(mocks.order).toHaveBeenNthCalledWith(2, "id", { ascending: true });
    expect(mocks.range).toHaveBeenCalledWith(8, 12);
    const invalid = await GET(new Request("https://example.test/api/personal-ai/declarations?limit=51"));
    expect(invalid.status).toBe(400);
  });

  it("persists only a normalized declaration under the server authenticated owner", async () => {
    const response = await POST(new Request("https://example.test/api/personal-ai/declarations", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validDeclaration),
    }));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      owner_clerk_id: "clerk-owner-a", methodology_version: expect.any(String), factor_version: expect.any(String),
    }));
    expect(mocks.insert).toHaveBeenCalledWith(expect.not.objectContaining({ prompt: expect.anything(), conversation: expect.anything() }));
  });

  it("rejects unknown fields and oversized bodies before persistence", async () => {
    const withPrompt = { ...validDeclaration, prompt: "never persist this" };
    const invalid = await POST(new Request("https://example.test/api/personal-ai/declarations", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(withPrompt),
    }));
    expect(invalid.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
    const oversized = await POST(new Request("https://example.test/api/personal-ai/declarations", {
      method: "POST", body: `"${"x".repeat(33_000)}"`,
    }));
    expect(oversized.status).toBe(413);
  });
});
