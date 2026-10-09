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
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
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

  it("uses a stable cursor after the twenty-item page", async () => {
    const orMock = vi.fn().mockResolvedValue({
      data: Array.from({ length: 20 }, (_, index) => ({
        id: `notification-${index}`,
        created_at: `2026-09-13T12:${String(19 - index).padStart(2, "0")}:00.000Z`,
      })),
      error: null,
    });
    const limitMock = vi.fn(() => ({ or: orMock }));
    const secondOrderMock = vi.fn(() => ({
      limit: limitMock,
    }));
    const fromMock = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ order: secondOrderMock })),
        })),
      })),
    }));
    const supabase = { from: fromMock };
    getSupabaseBrowserClientMock.mockReturnValue(supabase);
    getTokenMock.mockResolvedValue("clerk-supabase-token");

    const { loadNotificationsPageForCurrentUser } = await import("./client");
    const page = await loadNotificationsPageForCurrentUser("user_123", getTokenMock, {
      createdAt: "2026-09-13T12:20:00.000Z",
      id: "notification-20",
    });

    expect(secondOrderMock).toHaveBeenCalledWith("id", { ascending: false });
    expect(limitMock).toHaveBeenCalledWith(20);
    expect(orMock).toHaveBeenCalledWith(
      "created_at.lt.2026-09-13T12:20:00.000Z,and(created_at.eq.2026-09-13T12:20:00.000Z,id.lt.notification-20)",
    );
    expect(page.notifications).toHaveLength(20);
    expect(page.nextCursor).toEqual({
      createdAt: "2026-09-13T12:00:00.000Z",
      id: "notification-19",
    });
  });

  it("stops at the end of a short page", async () => {
    const limitMock = vi.fn().mockResolvedValue({
      data: [{ id: "notification-1", created_at: "2026-09-13T12:00:00.000Z" }],
      error: null,
    });
    getSupabaseBrowserClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({ limit: limitMock })),
            })),
          })),
        })),
      })),
    });
    getTokenMock.mockResolvedValue("clerk-supabase-token");

    const { loadNotificationsPageForCurrentUser } = await import("./client");
    const page = await loadNotificationsPageForCurrentUser("user_123", getTokenMock);

    expect(limitMock).toHaveBeenCalledWith(20);
    expect(page.nextCursor).toBeNull();
  });

  it("loads the unread count independently from the first page", async () => {
    const isMock = vi.fn().mockResolvedValue({ data: null, count: 21, error: null });
    const eqMock = vi.fn(() => ({ is: isMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    getSupabaseBrowserClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: selectMock })),
    });
    getTokenMock.mockResolvedValue("clerk-supabase-token");

    const { loadUnreadNotificationCountForCurrentUser } = await import("./client");
    await expect(loadUnreadNotificationCountForCurrentUser("user_123", getTokenMock)).resolves.toBe(21);
    expect(selectMock).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(isMock).toHaveBeenCalledWith("read_at", null);
  });

  it("loads pending decision notifications by business id instead of chronology", async () => {
    const limitMock = vi.fn().mockResolvedValue({
      data: [{
        id: "notification-100",
        type: "action_event",
        title: "Demande",
        content: "À examiner",
        read_at: null,
        created_at: "2026-10-01T10:00:00.000Z",
        payload: {
          eventType: "action_event",
          subtype: "registration_request",
          requestKind: "registration_request",
          registrationId: "registration-100",
        },
      }],
      error: null,
    });
    const secondOrderMock = vi.fn(() => ({ limit: limitMock }));
    const orderMock = vi.fn(() => ({ order: secondOrderMock }));
    const orMock = vi.fn(() => ({ order: orderMock }));
    const eqMock = vi.fn(() => ({ or: orMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    getSupabaseBrowserClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: selectMock })),
    });
    getTokenMock.mockResolvedValue("clerk-supabase-token");

    const { loadPendingDecisionNotificationsForCurrentUser } = await import("./client");
    await expect(loadPendingDecisionNotificationsForCurrentUser(
      "user_123",
      getTokenMock,
      ["registration-100"],
    )).resolves.toMatchObject({
      notifications: [{ id: "notification-100" }],
      missingRequestIds: [],
    });
    expect(eqMock).toHaveBeenCalledWith("user_id", "user_123");
    expect(orMock).toHaveBeenCalledWith(expect.stringContaining("registrationId.eq.registration-100"));
    expect(limitMock).toHaveBeenCalledWith(50);
  });

  it("reports a canonical pending id with no accessible notification event", async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const secondOrderMock = vi.fn(() => ({ limit: limitMock }));
    const orderMock = vi.fn(() => ({ order: secondOrderMock }));
    const orMock = vi.fn(() => ({ order: orderMock }));
    const eqMock = vi.fn(() => ({ or: orMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    getSupabaseBrowserClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: selectMock })),
    });
    getTokenMock.mockResolvedValue("clerk-supabase-token");

    const { loadPendingDecisionNotificationsForCurrentUser } = await import("./client");
    await expect(loadPendingDecisionNotificationsForCurrentUser(
      "user_123",
      getTokenMock,
      ["missing-registration"],
    )).resolves.toMatchObject({
      notifications: [],
      missingRequestIds: ["missing-registration"],
    });
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
