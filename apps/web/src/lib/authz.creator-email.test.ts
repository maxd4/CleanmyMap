import { describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const syncClerkUserToSupabaseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const creatorEmail = "creator-at-example";
const envMock = vi.hoisted(() => ({
  CLERK_ADMIN_USER_IDS: "",
  CLERK_MAX_USER_IDS: "",
  CLERK_IMU_OWNER_USER_ID: "",
  CREATOR_INBOX_EMAIL: "creator-at-example",
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  clerkClient: clerkClientMock,
}));

vi.mock("./env", () => ({ env: envMock }));

vi.mock("@/lib/auth/sync", () => ({
  syncClerkUserToSupabase: syncClerkUserToSupabaseMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

describe("authz creator email isolation", () => {
  it("does not resolve the creator inbox email as max", async () => {
    authMock.mockResolvedValue({ userId: "user_creator" });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "user_creator",
          firstName: "Maxence",
          lastName: "Deroome",
          username: "maxence",
          primaryEmailAddress: {
            emailAddress: creatorEmail,
          },
          primaryPhoneNumber: null,
          publicMetadata: {},
          privateMetadata: {},
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          imageUrl: "",
        }),
      },
    });
    getSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { current_level: 4 },
              error: null,
            }),
          }),
        }),
      }),
    });
    syncClerkUserToSupabaseMock.mockResolvedValue(null);

    const { getCurrentUserIdentity, getCurrentUserRoleLabel } = await import(
      "./authz"
    );

    await expect(getCurrentUserRoleLabel()).resolves.toBe("benevole");
    await expect(getCurrentUserIdentity()).resolves.toMatchObject({
      role: "benevole",
      email: creatorEmail,
      currentLevel: 4,
    });
  });

  it("rejects max from CLERK_MAX_USER_IDS without canonical Clerk role", async () => {
    envMock.CLERK_MAX_USER_IDS = "user_max";
    authMock.mockResolvedValue({ userId: "user_max" });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "user_max",
          primaryEmailAddress: {
            emailAddress: "user-at-example",
            verification: { status: "verified" },
          },
          publicMetadata: {},
          privateMetadata: {},
        }),
      },
    });

    const { getCurrentUserRoleLabel } = await import("./authz");

    await expect(getCurrentUserRoleLabel()).resolves.toBe("benevole");
  });

  it("grants max only for canonical role and exact configured owner id", async () => {
    envMock.CLERK_IMU_OWNER_USER_ID = "user_max";
    authMock.mockResolvedValue({ userId: "user_max" });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "user_max",
          publicMetadata: { role: "max" },
          privateMetadata: { role: "admin" },
        }),
      },
    });

    const { getCurrentUserRoleLabel } = await import("./authz");

    await expect(getCurrentUserRoleLabel()).resolves.toBe("max");
  });

  it("grants admin only from canonical public metadata", async () => {
    envMock.CLERK_ADMIN_USER_IDS = "user_admin";
    authMock.mockResolvedValue({ userId: "user_admin" });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "user_admin",
          primaryEmailAddress: {
            emailAddress: "user-at-example",
            verification: { status: "verified" },
          },
          publicMetadata: { role: "admin" },
          privateMetadata: { role: "benevole" },
        }),
      },
    });

    const { getCurrentUserRoleLabel } = await import("./authz");

    await expect(getCurrentUserRoleLabel()).resolves.toBe("admin");
  });

  it("fails closed when Clerk cannot resolve the user", async () => {
    authMock.mockResolvedValue({ userId: "owner-only" });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockRejectedValue(new Error("Clerk unavailable")),
      },
    });

    const { getCurrentUserRoleLabel } = await import("./authz");

    await expect(getCurrentUserRoleLabel()).resolves.toBe("benevole");
  });
});
