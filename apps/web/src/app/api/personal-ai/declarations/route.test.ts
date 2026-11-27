import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  requireSupabaseClerkRlsClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
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
  rpc: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/clerk-rls", () => ({ requireSupabaseClerkRlsClient: mocks.requireSupabaseClerkRlsClient }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: mocks.getSupabaseAdminClient }));

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
  mocks.requireSupabaseClerkRlsClient.mockResolvedValue({ from: mocks.from, rpc: mocks.rpc });
  mocks.getSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
  mocks.from.mockReturnValue({
    select: mocks.select.mockReturnThis(), eq: mocks.eq.mockReturnThis(), order: mocks.order.mockReturnThis(), range: mocks.range,
    insert: mocks.insert, update: mocks.update, delete: mocks.delete,
  });
  mocks.update.mockReturnValue({ eq: mocks.eq.mockReturnThis() });
  mocks.eq.mockReturnValue({ eq: mocks.eq.mockReturnThis(), select: mocks.updateSelect, order: mocks.order.mockReturnThis() });
  mocks.updateSelect.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.delete.mockReturnValue({ eq: mocks.eq.mockReturnThis() });
  mocks.range.mockResolvedValue({ data: [], error: null });
  mocks.rpc.mockResolvedValue({ data: [{ id: "quick-id", declaration: validDeclaration, quick_scenario: { sourceKind: "SELF_REPORTED_CHAT_USAGE" } }], error: null });
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

  it("persists a server-calculated declaration through the owner-explicit server RPC", async () => {
    const response = await POST(new Request("https://example.test/api/personal-ai/declarations", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validDeclaration),
    }));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.rpc).toHaveBeenCalledWith("save_personal_ai_declaration_for_owner", expect.objectContaining({
      p_owner_clerk_id: "clerk-owner-a", p_id: null, p_quick_scenario: null,
      p_methodology_version: expect.any(String), p_factor_version: expect.any(String),
    }));
    const persisted = mocks.rpc.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(persisted.p_methodology_version).toBe((persisted.p_snapshot as { version: string }).version);
    expect(JSON.parse(persisted.p_factor_version as string)).toHaveProperty("applied");
    expect(JSON.stringify(persisted)).not.toMatch(/prompt|conversation/i);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("saves a quick chatbot scenario through the private owner RPC without tokenizing the activity", async () => {
    const quickDeclaration = {
      ...validDeclaration,
      provider: "OPENAI",
      access: "UNKNOWN",
      quickScenario: {
        version: "personal-ai-chat-usage-v1", sourceKind: "SELF_REPORTED_CHAT_USAGE", chatbot: "CHATGPT", chatbotLabel: null,
        accessMode: "SUBSCRIPTION", frequency: "DAILY", exchanges: 3, questionCharacters: 80, answerCharacters: 250,
        imageUse: false, audioUse: null,
      },
    };
    const response = await POST(new Request("https://example.test/api/personal-ai/declarations", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(quickDeclaration),
    }));
    expect(response.status).toBe(201);
    const [rpcName, rpcArgs] = mocks.rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(rpcName).toBe("save_personal_ai_declaration_for_owner");
    expect(rpcArgs.p_owner_clerk_id).toBe("clerk-owner-a");
    expect(rpcArgs.p_id).toBeNull();
    expect(rpcArgs.p_declaration).not.toHaveProperty("quickScenario");
    expect(rpcArgs.p_quick_scenario).toMatchObject({ sourceKind: "SELF_REPORTED_CHAT_USAGE", accessMode: "SUBSCRIPTION", exchanges: 3 });
    expect(JSON.stringify(rpcArgs)).not.toMatch(/prompt|conversation|transcript/i);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("returns an explicit conflict when a quick scenario overlaps an active source", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23P01" } });
    const response = await POST(new Request("https://example.test/api/personal-ai/declarations", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        ...validDeclaration, provider: "OPENAI", access: "UNKNOWN",
        quickScenario: {
          version: "personal-ai-chat-usage-v1", sourceKind: "SELF_REPORTED_CHAT_USAGE", chatbot: "CHATGPT", chatbotLabel: null,
          accessMode: "FREE", frequency: "UNKNOWN", exchanges: null, questionCharacters: null, answerCharacters: null,
          imageUse: null, audioUse: null,
        },
      }),
    }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("réconciliez une source");
  });

  it("rejects unknown fields and oversized bodies before persistence", async () => {
    const withPrompt = { ...validDeclaration, prompt: "never persist this" };
    const invalid = await POST(new Request("https://example.test/api/personal-ai/declarations", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(withPrompt),
    }));
    expect(invalid.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    const oversized = await POST(new Request("https://example.test/api/personal-ai/declarations", {
      method: "POST", body: `"${"x".repeat(33_000)}"`,
    }));
    expect(oversized.status).toBe(413);
  });
});
