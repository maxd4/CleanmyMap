import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(), requireSupabaseClerkRlsClient: vi.fn(), from: vi.fn(), eq: vi.fn(),
  select: vi.fn(), update: vi.fn(), updateSelect: vi.fn(), maybeSingle: vi.fn(), delete: vi.fn(), deleteSelect: vi.fn(),
  getSupabaseAdminClient: vi.fn(), rpc: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/clerk-rls", () => ({ requireSupabaseClerkRlsClient: mocks.requireSupabaseClerkRlsClient }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: mocks.getSupabaseAdminClient }));

import { DELETE, PATCH } from "./route";

const id = "10000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id }) };
const manualDeclaration = {
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
  mocks.requireSupabaseClerkRlsClient.mockResolvedValue({ from: mocks.from, rpc: mocks.rpc });
  mocks.getSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
  mocks.from.mockReturnValue({ select: mocks.select, update: mocks.update, delete: mocks.delete });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.delete.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, select: mocks.updateSelect, maybeSingle: mocks.maybeSingle });
  mocks.updateSelect.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.rpc.mockResolvedValue({ data: [{ id, status: "ACTIVE", declaration: manualDeclaration }], error: null });
});

describe("personal AI declaration item API", () => {
  it("hides a quick-scenario ID not owned by the caller behind 404", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { source_identity_hash: null }, error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    const response = await PATCH(new Request("https://example.test", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ declaration: {
        provider: "OPENAI", source: "MANUAL", sourceVersion: null, provenance: "USER_DECLARED", granularity: "UNKNOWN",
        periodStartUtc: "2026-01-01T00:00:00.000Z", periodEndUtc: "2026-02-01T00:00:00.000Z",
        modelRaw: null, modelCanonical: null, operator: null, execution: "CLOUD", inferenceRegion: null, access: "UNKNOWN", requestCount: null,
        tokens: { inputTotal: null, inputUncached: null, cacheRead: null, cacheWrite: null, outputVisible: null, outputReasoning: null, outputTotal: null, reasoningRelation: "UNKNOWN" },
        modality: { images: null, audioMinutes: null, videoSeconds: null },
        energy: { kwh: null, boundary: null, evidence: null, averageWatts: null, durationSeconds: null, idleWatts: null },
        quickScenario: { version: "personal-ai-chat-usage-v1", sourceKind: "SELF_REPORTED_CHAT_USAGE", chatbot: "CHATGPT", chatbotLabel: null, accessMode: "FREE", frequency: "UNKNOWN", exchanges: null, questionCharacters: null, answerCharacters: null, imageUse: null, audioUse: null },
      } }),
    }), context);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.rpc).toHaveBeenCalledWith("save_personal_ai_declaration_for_owner", expect.objectContaining({ p_id: id, p_owner_clerk_id: "clerk-owner-a" }));
  });

  it("refuses generic content updates for an owner-scoped imported row", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { source_identity_hash: "a".repeat(64) }, error: null });
    const response = await PATCH(new Request("https://example.test", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ declaration: {} }),
    }), context);
    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.select).toHaveBeenCalledWith("source_identity_hash");
    expect(mocks.eq).toHaveBeenCalledWith("owner_clerk_id", "clerk-owner-a");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps generic content updates available for an owner-scoped manual declaration", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { source_identity_hash: null }, error: null });
    const response = await PATCH(new Request("https://example.test", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ declaration: manualDeclaration }),
    }), context);
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("save_personal_ai_declaration_for_owner", expect.objectContaining({
      p_owner_clerk_id: "clerk-owner-a", p_id: id, p_declaration: expect.any(Object), p_snapshot: expect.any(Object),
    }));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("hides another owner's UUID behind 404 and applies the server owner predicate", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    const response = await PATCH(new Request("https://example.test", { method: "PATCH", body: JSON.stringify({ status: "EXCLUDED" }) }), context);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.rpc).toHaveBeenCalledWith("set_personal_ai_declaration_status_for_owner", {
      p_owner_clerk_id: "clerk-owner-a", p_id: id, p_status: "EXCLUDED",
    });
  });

  it("rejects malformed IDs before database access", async () => {
    const response = await DELETE(new Request("https://example.test", { method: "DELETE" }), { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(response.status).toBe(404);
    expect(mocks.requireSupabaseClerkRlsClient).not.toHaveBeenCalled();
  });

  it("returns 200 for an owner-scoped status update and hides empty payloads", async () => {
    const response = await PATCH(new Request("https://example.test", { method: "PATCH", body: JSON.stringify({ status: "EXCLUDED" }) }), context);
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("set_personal_ai_declaration_status_for_owner", {
      p_owner_clerk_id: "clerk-owner-a", p_id: id, p_status: "EXCLUDED",
    });
    const invalid = await PATCH(new Request("https://example.test", { method: "PATCH", body: "{}" }), context);
    expect(invalid.status).toBe(400);
  });

  it("applies a scenario edit and status transition in the same RPC", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { source_identity_hash: null }, error: null });
    const quick = {
      ...manualDeclaration,
      provider: "OPENAI", access: "UNKNOWN",
      quickScenario: {
        version: "personal-ai-chat-usage-v1", sourceKind: "SELF_REPORTED_CHAT_USAGE", chatbot: "CHATGPT", chatbotLabel: null,
        accessMode: "FREE", frequency: "WEEKLY", exchanges: 3, questionCharacters: 80, answerCharacters: 100,
        imageUse: false, audioUse: null,
      },
    };
    const response = await PATCH(new Request("https://example.test", {
      method: "PATCH", body: JSON.stringify({ declaration: quick, status: "EXCLUDED" }),
    }), context);
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("save_personal_ai_declaration_for_owner", expect.objectContaining({
      p_id: id, p_status: "EXCLUDED", p_quick_scenario: expect.objectContaining({ chatbot: "CHATGPT" }),
    }));
  });

  it("returns 200 only after a matching owner delete", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id }, error: null });
    const response = await DELETE(new Request("https://example.test", { method: "DELETE" }), context);
    expect(response.status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith("owner_clerk_id", "clerk-owner-a");
  });

  it("requires authentication before a private delete", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const response = await DELETE(new Request("https://example.test", { method: "DELETE" }), context);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireSupabaseClerkRlsClient).not.toHaveBeenCalled();
  });
});
