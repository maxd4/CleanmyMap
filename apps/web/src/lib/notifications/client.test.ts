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
  function setupPendingQuery(
    resolvePage: (from: number, to: number) => Promise<{ data: unknown[]; error: null }>,
  ) {
    const rangeMock = vi.fn((from: number, to: number) => resolvePage(from, to));
    const secondOrderMock = vi.fn(() => ({ range: rangeMock }));
    const orderMock = vi.fn(() => ({ order: secondOrderMock }));
    const orMock = vi.fn(() => ({ order: orderMock }));
    const eqMock = vi.fn(() => ({ or: orMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    getSupabaseBrowserClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: selectMock })),
    });
    getTokenMock.mockResolvedValue("clerk-supabase-token");
    return { eqMock, orMock, rangeMock };
  }

  const actionEvent = (overrides: Record<string, unknown>) => {
    const { id = "notification-default", ...payload } = overrides;
    return {
    id,
    type: "action_event",
    title: "Décision",
    content: "À traiter",
    read_at: null,
    created_at: "2026-10-01T10:00:00.000Z",
    payload: {
      eventType: "action_event",
      ...payload,
    },
    };
  };

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

  it("loads pending decision notifications by business family instead of chronology", async () => {
    const { eqMock, orMock, rangeMock } = setupPendingQuery(async () => ({
      data: [actionEvent({
        subtype: "registration_request",
        requestKind: "registration_request",
        registrationId: "registration-100",
      })],
      error: null,
    }));

    const { loadPendingDecisionNotificationsForCurrentUser } = await import("./client");
    await expect(loadPendingDecisionNotificationsForCurrentUser(
      "user_123",
      getTokenMock,
      [{ kind: "action_registration_request", requestId: "registration-100" }],
    )).resolves.toMatchObject({
      notifications: [{ id: "notification-default" }],
      missingRequestIds: [],
      unresolvedRequestIds: [],
    });
    expect(eqMock).toHaveBeenCalledWith("user_id", "user_123");
    expect(orMock).toHaveBeenCalledWith(expect.stringContaining("subtype.eq.registration_request"));
    expect(rangeMock).toHaveBeenCalledWith(0, 49);
  });

  it("pages past more than fifty recent events to resolve an older open decision", async () => {
    const recentEvents = Array.from({ length: 50 }, (_, index) => actionEvent({
      id: `recent-${index}`,
      subtype: "action_result",
      actionId: "action-recent",
    }));
    const oldDecision = actionEvent({
      id: "old-decision",
      subtype: "action_result",
      actionId: "action-old",
    });
    const { rangeMock } = setupPendingQuery(async (from) => ({
      data: from === 0 ? recentEvents : [oldDecision],
      error: null,
    }));

    const { loadPendingDecisionNotificationsForCurrentUser } = await import("./client");
    const result = await loadPendingDecisionNotificationsForCurrentUser(
      "user_123",
      getTokenMock,
      [
        { kind: "action_result", requestId: "action-recent" },
        { kind: "action_result", requestId: "action-old" },
      ],
    );
    expect(result.notifications.some((notification) => notification.id === "old-decision")).toBe(true);
    expect(result.missingRequestIds).toEqual([]);
    expect(result.unresolvedRequestIds).toEqual([]);
    expect(rangeMock).toHaveBeenNthCalledWith(1, 0, 49);
    expect(rangeMock).toHaveBeenNthCalledWith(2, 50, 99);
  });

  it("resolves several registration decisions independently on the same action", async () => {
    const { rangeMock } = setupPendingQuery(async () => ({
      data: [
        actionEvent({
          id: "registration-request-1",
          subtype: "registration_request",
          requestKind: "registration_request",
          actionId: "action-shared",
          registrationId: "registration-1",
        }),
        actionEvent({
          id: "registration-request-2",
          subtype: "registration_request",
          requestKind: "registration_request",
          actionId: "action-shared",
          registrationId: "registration-2",
        }),
      ],
      error: null,
    }));

    const { loadPendingDecisionNotificationsForCurrentUser } = await import("./client");
    const result = await loadPendingDecisionNotificationsForCurrentUser(
      "user_123",
      getTokenMock,
      [
        { kind: "action_registration_request", requestId: "registration-1" },
        { kind: "action_registration_request", requestId: "registration-2" },
      ],
    );
    expect(result.missingRequestIds).toEqual([]);
    expect(result.unresolvedRequestIds).toEqual([]);
    expect(result.notifications.map((notification) => notification.id)).toEqual([
      "registration-request-1",
      "registration-request-2",
    ]);
    expect(rangeMock).toHaveBeenCalledTimes(1);
  });

  it("does not let an informative action event satisfy an action result decision", async () => {
    const { orMock } = setupPendingQuery(async () => ({
      data: [
        actionEvent({ subtype: "action_update", actionId: "action-1" }),
        actionEvent({ subtype: "action_result", actionId: "action-1" }),
      ],
      error: null,
    }));

    const { loadPendingDecisionNotificationsForCurrentUser } = await import("./client");
    await expect(loadPendingDecisionNotificationsForCurrentUser(
      "user_123",
      getTokenMock,
      [{ kind: "action_result", requestId: "action-1" }],
    )).resolves.toMatchObject({ missingRequestIds: [], unresolvedRequestIds: [] });
    expect(orMock).toHaveBeenCalledWith(expect.stringContaining("subtype.eq.action_result"));
  });

  it("does not reuse a withdrawn invitation event when the current version is absent", async () => {
    const { rangeMock } = setupPendingQuery(async () => ({
      data: [actionEvent({
        subtype: "invitation",
        registrationId: "registration-1",
        invitationVersion: 1,
        decisionState: "unavailable",
      })],
      error: null,
    }));

    const { loadPendingDecisionNotificationsForCurrentUser } = await import("./client");
    await expect(loadPendingDecisionNotificationsForCurrentUser(
      "user_123",
      getTokenMock,
      [{ kind: "action_invitation", requestId: "registration-1" }],
    )).resolves.toMatchObject({ missingRequestIds: ["registration-1"], unresolvedRequestIds: [] });
    expect(rangeMock).toHaveBeenCalledTimes(1);
  });

  it("prefers a newer open invitation version over the treated historical version", async () => {
    const { rangeMock } = setupPendingQuery(async () => ({
      data: [
        actionEvent({
          id: "invitation-v2",
          subtype: "invitation",
          registrationId: "registration-1",
          invitationVersion: 2,
          decisionState: "pending",
        }),
        actionEvent({
          id: "invitation-v1",
          subtype: "invitation",
          registrationId: "registration-1",
          invitationVersion: 1,
          decisionState: "treated",
        }),
      ],
      error: null,
    }));

    const { loadPendingDecisionNotificationsForCurrentUser } = await import("./client");
    await expect(loadPendingDecisionNotificationsForCurrentUser(
      "user_123",
      getTokenMock,
      [{ kind: "action_invitation", requestId: "registration-1" }],
    )).resolves.toMatchObject({ missingRequestIds: [], unresolvedRequestIds: [] });
    expect(rangeMock).toHaveBeenCalledTimes(1);
  });

  it("does not classify a bounded partial traversal as missing", async () => {
    const page = Array.from({ length: 50 }, (_, index) => actionEvent({
      id: `page-${index}`,
      subtype: "action_result",
      actionId: "action-observed",
    }));
    const { rangeMock } = setupPendingQuery(async () => ({ data: page, error: null }));

    const { loadPendingDecisionNotificationsForCurrentUser } = await import("./client");
    await expect(loadPendingDecisionNotificationsForCurrentUser(
      "user_123",
      getTokenMock,
      [
        { kind: "action_result", requestId: "action-observed" },
        { kind: "action_result", requestId: "action-not-seen" },
      ],
    )).resolves.toMatchObject({ missingRequestIds: [], unresolvedRequestIds: ["action-not-seen"] });
    expect(rangeMock).toHaveBeenCalledTimes(20);
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
