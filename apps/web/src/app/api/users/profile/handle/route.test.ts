import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const rlsClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/supabase/clerk-rls", () => ({ getSupabaseClerkRlsClient: rlsClientMock }));

import { PATCH } from "./route";

function makeChain(result: { count?: number | null; error?: Error | null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "neq", "update"]) chain[method] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return chain;
}

describe("PATCH /api/users/profile/handle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
  });

  it("rejects anonymous requests before obtaining the RLS client", async () => {
    authMock.mockResolvedValueOnce({ userId: null });
    const response = await PATCH(new Request("https://cleanmymap.test/api/users/profile/handle", { method: "PATCH", body: "{}" }));
    expect(response.status).toBe(401);
    expect(rlsClientMock).not.toHaveBeenCalled();
  });

  it.each([
    "not-json",
    JSON.stringify({}),
    JSON.stringify({ handle: "UPPER" }),
    JSON.stringify({ handle: "ab" }),
    JSON.stringify({ handle: "valid-handle" }),
  ])("rejects malformed or invalid handle payloads: %s", async (body) => {
    const response = await PATCH(new Request("https://cleanmymap.test/api/users/profile/handle", { method: "PATCH", body }));
    expect(response.status).toBe(body === "not-json" ? 400 : 422);
    expect(rlsClientMock).not.toHaveBeenCalled();
  });

  it("fails closed when the Clerk/RLS connection is unavailable", async () => {
    rlsClientMock.mockResolvedValueOnce(null);
    const response = await PATCH(new Request("https://cleanmymap.test/api/users/profile/handle", { method: "PATCH", body: JSON.stringify({ handle: "safe_user" }) }));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("user-1");
  });

  it("rejects a handle owned by another profile without updating", async () => {
    const chain = makeChain({ count: 1, error: null });
    rlsClientMock.mockResolvedValueOnce({ from: vi.fn(() => chain) });
    const response = await PATCH(new Request("https://cleanmymap.test/api/users/profile/handle", { method: "PATCH", body: JSON.stringify({ handle: "taken_name" }) }));
    expect(response.status).toBe(409);
    expect(chain.update).not.toHaveBeenCalled();
  });

  it("updates only the authenticated profile and returns the public contract", async () => {
    const chain = makeChain({ count: 0, error: null });
    rlsClientMock.mockResolvedValueOnce({ from: vi.fn(() => chain) });
    const response = await PATCH(new Request("https://cleanmymap.test/api/users/profile/handle", { method: "PATCH", body: JSON.stringify({ handle: "safe_user" }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "updated", handle: "safe_user" });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ handle: "safe_user" }));
    expect(chain.eq).toHaveBeenLastCalledWith("id", "user-1");
  });

  it("does not report success when the uniqueness check or update fails", async () => {
    const checkError = makeChain({ count: null, error: new Error("database detail") });
    rlsClientMock.mockResolvedValueOnce({ from: vi.fn(() => checkError) });
    expect((await PATCH(new Request("https://cleanmymap.test/api/users/profile/handle", { method: "PATCH", body: JSON.stringify({ handle: "safe_user" }) }))).status).toBe(500);

    const updateError = makeChain({ count: 0, error: null });
    updateError.then = vi.fn((resolve: (value: unknown) => unknown) => Promise.resolve({ error: new Error("write detail") }).then(resolve));
    rlsClientMock.mockResolvedValueOnce({ from: vi.fn(() => updateError) });
    const response = await PATCH(new Request("https://cleanmymap.test/api/users/profile/handle", { method: "PATCH", body: JSON.stringify({ handle: "safe_user" }) }));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("write detail");
  });
});
