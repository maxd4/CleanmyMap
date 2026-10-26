import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: supabaseMock,
}));

import { GET } from "./route";

function queryResult(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue(result);
  return query;
}

beforeEach(() => {
  authMock.mockReset();
  supabaseMock.mockReset();
  authMock.mockResolvedValue({ userId: "user-1" });
});

describe("GET /api/gamification/xp_audit/me", () => {
  it("returns only the authenticated user's audit rows", async () => {
    const query = queryResult({ data: [{ id: "audit-1", user_id: "user-1", xp_change: 2 }], error: null });
    supabaseMock.mockReturnValue({ from: vi.fn(() => query) });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", items: [{ id: "audit-1", user_id: "user-1", xp_change: 2 }] });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.limit).toHaveBeenCalledWith(100);
  });

  it("refuses anonymous access and reports database failures", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await GET()).status).toBe(401);
    expect(supabaseMock).not.toHaveBeenCalled();

    authMock.mockResolvedValue({ userId: "user-1" });
    const query = queryResult({ data: null, error: { message: "db down" } });
    supabaseMock.mockReturnValue({ from: vi.fn(() => query) });
    expect((await GET()).status).toBeGreaterThanOrEqual(400);
  });
});
