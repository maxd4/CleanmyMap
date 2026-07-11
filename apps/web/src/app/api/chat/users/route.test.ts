import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());
const unstableCacheMock = vi.hoisted(() => vi.fn((fn: () => Promise<unknown>) => fn));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: getSupabaseClerkRlsClientMock,
}));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
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
        eq: vi.fn(() => query),
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
  }, 15000);

  it("returns an exact match when searching by user id", async () => {
    const patterns: Array<{ column: string; value: string }> = [];
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
        eq: vi.fn((column: string, value: string) => {
          patterns.push({ column, value });
          return Promise.resolve(result);
        }),
        ilike: vi.fn(() => Promise.resolve(result)),
      };
      return query;
    };

    getSupabaseClerkRlsClientMock.mockResolvedValue({
      from: vi.fn(() => makeQuery()),
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/chat/users?q=profile-1"));

    const body = (await response.json()) as {
      users?: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(1);
    expect(patterns).toContainEqual({ column: "id", value: "profile-1" });
  }, 15000);
});
