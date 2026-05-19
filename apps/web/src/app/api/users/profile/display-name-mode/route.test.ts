import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  clerkClient: clerkClientMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));

vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: getSupabaseClerkRlsClientMock,
}));

describe("PATCH /api/users/profile/display-name-mode", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "user-1",
      displayName: "Ada Admin",
      displayNameMode: "full_name",
      handle: "ada_admin",
      username: "ada_admin",
      firstName: "Ada",
      email: "ada@example.com",
    });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          firstName: "Ada",
          lastName: "Admin",
          username: "ada_admin",
        }),
      },
    });

    const upsertMock = vi.fn(async () => ({ error: null }));
    const supabaseMock = {
      from: vi.fn(() => ({
        upsert: upsertMock,
      })),
    };
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock);
  });

  it("returns the current identity payload for the active user", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    const body = (await response.json()) as {
      userId?: string;
      displayName?: string;
      displayNameMode?: string;
      handle?: string;
    };

    expect(response.status).toBe(200);
    expect(body.userId).toBe("user-1");
    expect(body.displayName).toBe("Ada Admin");
    expect(body.displayNameMode).toBe("full_name");
    expect(body.handle).toBe("ada_admin");
  });

  it("updates the display name mode and derived display name", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/users/profile/display-name-mode", {
        method: "PATCH",
        body: JSON.stringify({ displayNameMode: "pseudo" }),
      }),
    );

    const body = (await response.json()) as {
      status?: string;
      displayNameMode?: string;
      displayName?: string;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("updated");
    expect(body.displayNameMode).toBe("pseudo");
    expect(body.displayName).toBe("ada_admin");
  });
});
