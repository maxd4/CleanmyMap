import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());
const unstableCacheMock = vi.hoisted(() => vi.fn((fn: () => Promise<unknown>) => fn));
const getVerifiedNonE2EClerkUserIdsMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: getSupabaseClerkRlsClientMock,
}));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

vi.mock("@/lib/auth/e2e-account-server", () => ({
  getVerifiedNonE2EClerkUserIds: getVerifiedNonE2EClerkUserIdsMock,
}));

describe("GET /api/chat/users", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getVerifiedNonE2EClerkUserIdsMock.mockImplementation(async (ids: string[]) => new Set(ids));
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
        range: vi.fn(() => query),
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
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(body.users).toHaveLength(1);
    expect(getVerifiedNonE2EClerkUserIdsMock).toHaveBeenCalledWith(["profile-1"]);
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
        range: vi.fn(() => query),
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

  it("returns distinct CleanMyMap accounts when a search matches several identity fields", async () => {
    const rows = [
      { id: "profile-1", handle: "maxence", display_name: "Maxence", avatar_url: null },
      { id: "profile-1", handle: "maxence_deroome", display_name: "Maxence", avatar_url: null },
      { id: "profile-2", handle: "maxime", display_name: "Maxime", avatar_url: null },
    ];
    const makeQuery = () => {
      const query: Record<string, unknown> = {
        select: vi.fn(() => query),
        neq: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn(() => query),
        eq: vi.fn(() => Promise.resolve({ data: rows.slice(0, 1), error: null })),
        ilike: vi.fn(() => Promise.resolve({ data: rows, error: null })),
      };
      return query;
    };

    getSupabaseClerkRlsClientMock.mockResolvedValue({
      from: vi.fn(() => makeQuery()),
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/chat/users?q=max"));
    const body = (await response.json()) as { users?: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.users?.map((user) => user.id)).toEqual(["profile-1", "profile-2"]);
  }, 15000);

  it("filters unverified and E2E-marked profile IDs without reordering real members", async () => {
    const rows = [
      { id: "e2e-profile", handle: "e2e", display_name: "E2E", avatar_url: null },
      { id: "real-profile", handle: "real", display_name: "Real", avatar_url: null },
    ];
    const makeQuery = () => {
      const query: Record<string, unknown> = {
        select: vi.fn(() => query),
        neq: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn(() => Promise.resolve({ data: rows, error: null })),
      };
      return query;
    };
    getSupabaseClerkRlsClientMock.mockResolvedValue({ from: vi.fn(() => makeQuery()) });
    getVerifiedNonE2EClerkUserIdsMock.mockResolvedValue(new Set(["real-profile"]));

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/chat/users"));
    const body = await response.json() as { users?: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.users?.map((user) => user.id)).toEqual(["real-profile"]);
    expect(getVerifiedNonE2EClerkUserIdsMock).toHaveBeenCalledWith(["e2e-profile", "real-profile"]);
  });

  it("fails closed when Clerk cannot verify profile identities", async () => {
    const makeQuery = () => {
      const query: Record<string, unknown> = {
        select: vi.fn(() => query),
        neq: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn(() => Promise.resolve({ data: [{ id: "unverified-profile", handle: "unknown", display_name: "Unknown", avatar_url: null }], error: null })),
      };
      return query;
    };
    getSupabaseClerkRlsClientMock.mockResolvedValue({ from: vi.fn(() => makeQuery()) });
    getVerifiedNonE2EClerkUserIdsMock.mockRejectedValue(new Error("Clerk unavailable"));

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/chat/users"));

    expect(response.status).toBe(500);
    expect((await response.json()).users).toBeUndefined();
  });
});
