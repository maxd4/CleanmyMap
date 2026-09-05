import { describe, expect, it, vi } from "vitest";
import { getSwitchableProfiles } from "./profiles";

const authMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const syncClerkUserToSupabaseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const creatorEmail = ["creator", "example.test"].join("@");

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  clerkClient: clerkClientMock,
}));

vi.mock("./env", () => ({
  env: {
    CLERK_ADMIN_USER_IDS: "",
    CLERK_MAX_USER_IDS: "",
    CREATOR_INBOX_EMAIL: creatorEmail,
    CLERK_IMU_OWNER_USER_ID: "owner-only",
    CLERK_IMU_OWNER_EMAIL: "owner@example.test",
  },
}));

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
            emailAddress: "owner@example.test",
            verification: { status: "verified" },
          },
          publicMetadata: {},
          privateMetadata: {},
        }),
      },
    });
    syncClerkUserToSupabaseMock.mockResolvedValue(null);

    const { getCurrentUserIdentity, getCurrentUserRoleLabel } = await import(
      "./authz"
    );

    await expect(getCurrentUserRoleLabel()).resolves.toBe("max");
    const identity = await getCurrentUserIdentity();
    expect(identity?.role).toBe("max");
    expect(getSwitchableProfiles(identity?.role ?? "benevole")).toEqual([
      "benevole",
      "coordinateur",
      "scientifique",
      "entreprise",
      "elu",
      "admin",
      "max",
    ]);
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
