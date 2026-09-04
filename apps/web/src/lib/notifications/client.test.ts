import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseBrowserClientMock = vi.hoisted(() => vi.fn());
const getTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: getSupabaseBrowserClientMock,
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE: "clerk-supabase",
  },
}));

describe("notification client", () => {
  beforeEach(() => {
    getSupabaseBrowserClientMock.mockReset();
    getTokenMock.mockReset();
    vi.resetModules();
  });

  it("uses a Clerk token before reading notifications", async () => {
    const fromMock = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    }));
    const supabase = { from: fromMock };
    getSupabaseBrowserClientMock.mockImplementation((accessToken) => {
      expect(accessToken).toEqual(expect.any(Function));
      return supabase;
    });
    getTokenMock.mockResolvedValue("clerk-supabase-token");

    const { loadNotificationsForCurrentUser } = await import("./client");
    await expect(
      loadNotificationsForCurrentUser("user_123", getTokenMock),
    ).resolves.toEqual([]);

    expect(getTokenMock).toHaveBeenCalledWith({ template: "clerk-supabase" });
    expect(getSupabaseBrowserClientMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("app_notifications");
  });

  it("does not create an anon client when the Clerk token is unavailable", async () => {
    getTokenMock.mockResolvedValue(null);

    const { loadNotificationsForCurrentUser } = await import("./client");
    await expect(
      loadNotificationsForCurrentUser("user_123", getTokenMock),
    ).rejects.toThrow(
      "Clerk/Supabase JWT accessToken unavailable for a required browser RLS flow.",
    );

    expect(getSupabaseBrowserClientMock).not.toHaveBeenCalled();
  });
});
