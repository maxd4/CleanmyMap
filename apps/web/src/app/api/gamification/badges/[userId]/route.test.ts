import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

describe("GET /api/gamification/badges/:userId", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ userId: "user-1" }),
    });
    expect(res.status).toBe(401);
  }, 10000);

  it("returns 403 when requesting another userId", async () => {
    authMock.mockResolvedValue({ userId: "user-1" });
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ userId: "user-2" }),
    });
    expect(res.status).toBe(403);
  }, 10000);

  it("returns totals and creates row when missing", async () => {
    authMock.mockResolvedValue({ userId: "user-1" });

    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { user_id: "user-1", waste_kg: 0, butts: 0 },
        error: null,
      });
    const insertSingle = vi.fn().mockResolvedValue({
      data: { user_id: "user-1", waste_kg: 0, butts: 0 },
      error: null,
    });
    const supabaseMock = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle,
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: insertSingle,
          })),
        })),
      })),
    };
    getSupabaseServerClientMock.mockReturnValue(supabaseMock);

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ userId: "user-1" }),
    });
    const body = (await res.json()) as {
      status?: string;
      totals?: { wasteKg: number; butts: number };
    };

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.totals).toEqual({ wasteKg: 0, butts: 0 });
  }, 10000);
});
