import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: getSupabaseClerkRlsClientMock,
}));

describe("GET /api/chat/users", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
  });

  it("escapes SQLi-like search input before applying ilike filters", async () => {
    const patterns: Array<{ column: string; pattern: string }> = [];
    const result = {
      data: [
        {
          id: "profile-1",
          handle: "alex",
          display_name: "Alex",
          avatar_url: null,
        },
      ],
      error: null,
    };

    const makeQuery = () => {
      const query: Record<string, unknown> = {
        select: vi.fn(() => query),
        neq: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        ilike: vi.fn((column: string, pattern: string) => {
          patterns.push({ column, pattern });
          return Promise.resolve(result);
        }),
      };
      return query;
    };

    getSupabaseClerkRlsClientMock.mockResolvedValue({
      from: vi.fn(() => makeQuery()),
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/chat/users?q=test@example.com' OR '1'='1",
      ),
    );

    const body = (await response.json()) as {
      users?: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(1);
    expect(patterns).toEqual([
      {
        column: "handle",
        pattern: "%test@example.com' OR '1'='1%",
      },
      {
        column: "display_name",
        pattern: "%test@example.com' OR '1'='1%",
      },
    ]);
  });
});
