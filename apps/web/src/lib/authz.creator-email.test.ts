import { describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const syncClerkUserToSupabaseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const creatorEmail = "creator-at-example";
const envMock = vi.hoisted(() => ({
  CLERK_ADMIN_USER_IDS: "",
  CLERK_MAX_USER_IDS: "",
  CREATOR_INBOX_EMAIL: "creator-at-example",
  CLERK_IMU_OWNER_USER_ID: "owner-only",
  CLERK_IMU_OWNER_EMAIL: "owner-at-example",
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

  it("requires the exact owner id and verified primary email for max", async () => {
    authMock.mockResolvedValue({ userId: "owner-only" });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "owner-only",
          primaryEmailAddress: {
            emailAddress: "owner-at-example",
            verification: { status: "verified" },
          },
          publicMetadata: { role: "max" },
          privateMetadata: {},
        }),
      },
    });

    const { getCurrentUserRoleLabel } = await import("./authz");

    await expect(getCurrentUserRoleLabel()).resolves.toBe("max");
  });

  it("does not grant max from CLERK_MAX_USER_IDS alone", async () => {
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

  it("does not grant admin from CLERK_ADMIN_USER_IDS alone", async () => {
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
          publicMetadata: {},
          privateMetadata: {},
        }),
      },
    });

    const { getCurrentUserRoleLabel } = await import("./authz");

    await expect(getCurrentUserRoleLabel()).resolves.toBe("benevole");
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
