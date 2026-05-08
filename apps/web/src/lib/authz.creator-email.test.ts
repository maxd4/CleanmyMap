import { describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const syncClerkUserToSupabaseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const creatorEmail = ["maxence.deroome", "gmail.com"].join("@");

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  clerkClient: clerkClientMock,
}));

vi.mock("./env", () => ({
  env: {
    CLERK_ADMIN_USER_IDS: "",
    CLERK_MAX_USER_IDS: "",
    CREATOR_INBOX_EMAIL: creatorEmail,
  },
}));

vi.mock("@/lib/auth/sync", () => ({
  syncClerkUserToSupabase: syncClerkUserToSupabaseMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

describe("authz creator email fallback", () => {
  it("resolves the creator inbox email as max even without Clerk ids", async () => {
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

    await expect(getCurrentUserRoleLabel()).resolves.toBe("max");
    await expect(getCurrentUserIdentity()).resolves.toMatchObject({
      role: "max",
      email: creatorEmail,
      currentLevel: 4,
    });
  });
});
