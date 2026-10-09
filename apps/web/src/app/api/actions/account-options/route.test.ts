import { beforeEach, describe, expect, it, vi } from "vitest";

const clerkClientMock = vi.hoisted(() => vi.fn());
const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkClientMock,
}));

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: unauthorizedJsonResponseMock,
}));

vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
}));

function clerkUser(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    firstName: "Prénom",
    lastName: id,
    username: `@${id}`,
    primaryEmailAddress: { emailAddress: `${id}@private.test` },
    lastActiveAt: Date.now(),
    ...overrides,
  };
}

describe("GET /api/actions/account-options", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-current" });
    unauthorizedJsonResponseMock.mockReturnValue(Response.json({ error: "Unauthorized" }, { status: 401 }));
    handleApiErrorMock.mockImplementation(() => Response.json({ error: "server" }, { status: 500 }));
  });

  it("asks Clerk for the globally active-sorted first batch and excludes the current account", async () => {
    const getUserListMock = vi.fn().mockResolvedValue({
      data: [
        clerkUser("user-current"),
        clerkUser("user-1", { firstName: "Alice", lastName: "Martin", username: "alice" }),
        clerkUser("user-2", { firstName: null, lastName: null, username: "bob" }),
      ],
      totalCount: 3,
    });
    clerkClientMock.mockResolvedValue({ users: { getUserList: getUserListMock } });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/account-options"));
    const body = (await response.json()) as {
      users?: Array<Record<string, unknown>>;
      nextOffset?: number | null;
      hasMore?: boolean;
    };

    expect(response.status).toBe(200);
    expect(getUserListMock).toHaveBeenCalledWith({
      orderBy: "-last_active_at",
      limit: 10,
      offset: 0,
    });
    expect(body.users).toEqual([
      { id: "user-1", display_name: "Alice Martin", handle: "alice" },
      { id: "user-2", display_name: "bob", handle: "bob" },
    ]);
    expect(body.users?.[0]).not.toHaveProperty("lastActiveAt");
    expect(body.users?.[0]).not.toHaveProperty("primaryEmailAddress");
    expect(body.nextOffset).toBeNull();
    expect(body.hasMore).toBe(false);
  });

  it("scans Clerk pages to return ten eligible accounts without replacing the global order", async () => {
    const firstPage = [
      clerkUser("user-current"),
      ...Array.from({ length: 9 }, (_, index) => clerkUser(`user-${index + 1}`)),
    ];
    const secondPage = [clerkUser("user-10")];
    const getUserListMock = vi.fn()
      .mockResolvedValueOnce({ data: firstPage, totalCount: 11 })
      .mockResolvedValueOnce({ data: secondPage, totalCount: 11 });
    clerkClientMock.mockResolvedValue({ users: { getUserList: getUserListMock } });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/account-options"));
    const body = (await response.json()) as {
      users?: Array<{ id: string }>;
      nextOffset?: number | null;
      hasMore?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.users?.map((user) => user.id)).toEqual([
      "user-1", "user-2", "user-3", "user-4", "user-5",
      "user-6", "user-7", "user-8", "user-9", "user-10",
    ]);
    expect(getUserListMock).toHaveBeenNthCalledWith(1, {
      orderBy: "-last_active_at",
      limit: 10,
      offset: 0,
    });
    expect(getUserListMock).toHaveBeenNthCalledWith(2, {
      orderBy: "-last_active_at",
      limit: 10,
      offset: 10,
    });
    expect(body.nextOffset).toBeNull();
    expect(body.hasMore).toBe(false);
  });

  it("deduplicates Clerk accounts by id before returning a page", async () => {
    const getUserListMock = vi.fn().mockResolvedValue({
      data: [
        clerkUser("user-1"),
        clerkUser("user-1", { firstName: "Doublon" }),
        clerkUser("user-2"),
      ],
      totalCount: 3,
    });
    clerkClientMock.mockResolvedValue({ users: { getUserList: getUserListMock } });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/account-options"));
    const body = await response.json() as { users?: Array<{ id: string }> };

    expect(body.users?.map((user) => user.id)).toEqual(["user-1", "user-2"]);
  });

  it("searches Clerk globally and preserves the pagination contract", async () => {
    const getUserListMock = vi.fn().mockResolvedValue({
      data: [clerkUser("user-search-result", { firstName: "Recherche" })],
      totalCount: 1,
    });
    clerkClientMock.mockResolvedValue({ users: { getUserList: getUserListMock } });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/account-options?q=Recherche&offset=0"),
    );

    expect(response.status).toBe(200);
    expect(getUserListMock).toHaveBeenCalledWith({
      query: "Recherche",
      orderBy: "-last_active_at",
      limit: 10,
      offset: 0,
    });
  });

  it("returns an empty terminal page when Clerk has no eligible account", async () => {
    const getUserListMock = vi.fn().mockResolvedValue({ data: [], totalCount: 0 });
    clerkClientMock.mockResolvedValue({ users: { getUserList: getUserListMock } });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/account-options"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ users: [], nextOffset: null, hasMore: false });
  });

  it("delegates Clerk failures to the API error boundary", async () => {
    const error = new Error("clerk unavailable");
    const getUserListMock = vi.fn().mockRejectedValue(error);
    clerkClientMock.mockResolvedValue({ users: { getUserList: getUserListMock } });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/account-options"));

    expect(response.status).toBe(500);
    expect(handleApiErrorMock).toHaveBeenCalledWith(error, "GET /api/actions/account-options");
  });

  it("refuses unauthenticated access", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false, status: 401 });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/account-options"));

    expect(response.status).toBe(401);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });
});
