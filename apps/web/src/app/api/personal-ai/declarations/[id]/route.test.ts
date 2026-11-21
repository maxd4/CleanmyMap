import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(), requireSupabaseClerkRlsClient: vi.fn(), from: vi.fn(), eq: vi.fn(),
  update: vi.fn(), updateSelect: vi.fn(), maybeSingle: vi.fn(), delete: vi.fn(), deleteSelect: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/clerk-rls", () => ({ requireSupabaseClerkRlsClient: mocks.requireSupabaseClerkRlsClient }));

import { DELETE, PATCH } from "./route";

const id = "10000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "clerk-owner-a" });
  mocks.requireSupabaseClerkRlsClient.mockResolvedValue({ from: mocks.from });
  mocks.from.mockReturnValue({ update: mocks.update, delete: mocks.delete });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.delete.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, select: mocks.updateSelect });
  mocks.updateSelect.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
});

describe("personal AI declaration item API", () => {
  it("hides another owner's UUID behind 404 and applies the server owner predicate", async () => {
    const response = await PATCH(new Request("https://example.test", { method: "PATCH", body: JSON.stringify({ status: "EXCLUDED" }) }), context);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.eq).toHaveBeenCalledWith("id", id);
    expect(mocks.eq).toHaveBeenCalledWith("owner_clerk_id", "clerk-owner-a");
  });

  it("rejects malformed IDs before database access", async () => {
    const response = await DELETE(new Request("https://example.test", { method: "DELETE" }), { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(response.status).toBe(404);
    expect(mocks.requireSupabaseClerkRlsClient).not.toHaveBeenCalled();
  });

  it("returns 200 for an owner-scoped status update and hides empty payloads", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id, status: "EXCLUDED" }, error: null });
    const response = await PATCH(new Request("https://example.test", { method: "PATCH", body: JSON.stringify({ status: "EXCLUDED" }) }), context);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ status: "EXCLUDED" });
    const invalid = await PATCH(new Request("https://example.test", { method: "PATCH", body: "{}" }), context);
    expect(invalid.status).toBe(400);
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
