import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("updates only the current user's notification read state", async () => {
    const eqUserMock = vi.fn().mockResolvedValue({ error: null });
    const eqNotificationMock = vi.fn(() => ({ eq: eqUserMock }));
    const updateMock = vi.fn(() => ({ eq: eqNotificationMock }));
    const fromMock = vi.fn(() => ({ update: updateMock }));
    getSupabaseBrowserClientMock.mockReturnValue({ from: fromMock });
    getTokenMock.mockResolvedValue("clerk-supabase-token");

    const { markNotificationAsReadForCurrentUser } = await import("./client");
    await markNotificationAsReadForCurrentUser("user_123", "notification-1", getTokenMock);

    expect(updateMock).toHaveBeenCalledWith({
      read_at: expect.any(String),
      seen_at: expect.any(String),
    });
    expect(eqNotificationMock).toHaveBeenCalledWith("id", "notification-1");
    expect(eqUserMock).toHaveBeenCalledWith("user_id", "user_123");
  });

  it("propagates Supabase errors for unread counts and read mutations without widening the query", async () => {
    const countError = new Error("notifications unavailable");
    const countQuery = {
      select: vi.fn(() => countQuery),
      eq: vi.fn(() => countQuery),
      is: vi.fn().mockResolvedValue({ count: null, error: countError }),
    };
    const updateError = new Error("read update denied");
    const updateQuery = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn(() => updateQuery),
      then: undefined,
    };
    const fromMock = vi.fn((table: string) => table === "app_notifications"
      ? { select: vi.fn(() => countQuery), update: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: updateError }) })),
      })) }
      : undefined);
    getSupabaseBrowserClientMock.mockReturnValue({ from: fromMock });
    getTokenMock.mockResolvedValue("clerk-supabase-token");

    const {
      loadUnreadNotificationCountForCurrentUser,
      markNotificationAsReadForCurrentUser,
    } = await import("./client");
    await expect(loadUnreadNotificationCountForCurrentUser("user_123", getTokenMock)).rejects.toBe(countError);
    await expect(markNotificationAsReadForCurrentUser("user_123", "notification-1", getTokenMock)).rejects.toBe(updateError);
    expect(fromMock).toHaveBeenCalledWith("app_notifications");
    expect(updateQuery).toBeDefined();
  });

  it("normalizes contact, invitation and registration response lists while preserving HTTP errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [{ id: " request-1 " }, { id: 4 }, null] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ invitations: [{ registration_id: " registration-1 " }, {}] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [{ registration_id: " registration-2 " }, null] })));
    vi.stubGlobal("fetch", fetchMock);
    const {
      loadPendingNotificationDecisionIds,
      loadPendingActionInvitationIds,
      loadPendingActionRegistrationRequestIds,
    } = await import("./client");

    await expect(loadPendingNotificationDecisionIds()).resolves.toEqual(["request-1"]);
    await expect(loadPendingActionInvitationIds()).resolves.toEqual(["registration-1"]);
    await expect(loadPendingActionRegistrationRequestIds()).resolves.toEqual(["registration-2"]);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/chat/contact-requests", expect.objectContaining({ credentials: "same-origin" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/actions/invitations", expect.objectContaining({ cache: "no-store" }));
  });

  it("converts JSON and non-JSON HTTP failures into bounded decision errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "session expirée" }), { status: 401 }))
      .mockResolvedValueOnce(new Response("gateway unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const { loadPendingNotificationDecisionIds } = await import("./client");

    await expect(loadPendingNotificationDecisionIds()).rejects.toMatchObject({ message: "session expirée", status: 401 });
    await expect(loadPendingNotificationDecisionIds()).rejects.toMatchObject({
      message: "La décision de notification n'a pas pu être traitée.",
      status: 503,
    });
  });

  it("maps accepted decisions and rejects invalid server states instead of inventing a fallback", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "accepted", messageId: "message-1", actionId: "action-1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "unknown" })));
    vi.stubGlobal("fetch", fetchMock);
    const { respondToNotificationDecision } = await import("./client");

    await expect(respondToNotificationDecision("request-1", "accept")).resolves.toEqual({
      status: "accepted",
      messageId: "message-1",
      actionId: "action-1",
      senderId: null,
    });
    await expect(respondToNotificationDecision("request-2", "reject")).rejects.toThrow("état valide");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/chat/contact-requests", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ requestId: "request-1", decision: "accept" }),
    }));
  });

  it("keeps invitation and registration decisions idempotent and distinguishes unavailable states", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "unavailable", actionId: null })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok", alreadyReviewed: true, participantId: "registration-1", actionId: "action-1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "accepted", registrationId: "registration-2", actionId: "action-2" })));
    vi.stubGlobal("fetch", fetchMock);
    const {
      respondToActionInvitation,
      respondToActionRegistrationRequest,
    } = await import("./client");

    await expect(respondToActionInvitation("registration-1", "accept")).resolves.toEqual({
      status: "unavailable",
      registrationId: "registration-1",
      actionId: null,
    });
    await expect(respondToActionRegistrationRequest("action-1", "registration-1", "accept")).resolves.toEqual({
      status: "unavailable",
      registrationId: "registration-1",
      actionId: "action-1",
    });
    await expect(respondToActionInvitation("registration-2", "accept")).resolves.toEqual({
      status: "accepted",
      registrationId: "registration-2",
      actionId: "action-2",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/actions/action-1/group-join", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ participantId: "registration-1", decision: "accept", requestKind: "registration_request" }),
    }));
  });

  it("fails closed when a paged notification query returns a Supabase error", async () => {
    const queryError = new Error("RLS denied");
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: queryError });
    const secondOrderMock = vi.fn(() => ({ range: rangeMock }));
    const orderMock = vi.fn(() => ({ order: secondOrderMock }));
    const orMock = vi.fn(() => ({ order: orderMock }));
    const eqMock = vi.fn(() => ({ or: orMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    getSupabaseBrowserClientMock.mockReturnValue({ from: vi.fn(() => ({ select: selectMock })) });
    getTokenMock.mockResolvedValue("clerk-supabase-token");
    const { loadPendingDecisionNotificationsForCurrentUser } = await import("./client");

    await expect(loadPendingDecisionNotificationsForCurrentUser(
      "user-123",
      getTokenMock,
      [{ kind: "action_result", requestId: "action-1" }],
    )).rejects.toBe(queryError);
    expect(rangeMock).toHaveBeenCalledWith(0, 49);
  });
});
