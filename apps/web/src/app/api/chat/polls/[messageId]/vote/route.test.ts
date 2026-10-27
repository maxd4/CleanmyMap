import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClerkAuthModule, createRateLimitModule, createSupabaseClerkRlsModule, createSupabaseServerModule, mockAllowedRateLimit } from "@/app/api/test-helpers";
import { buildChatPollVoteSupabaseMock } from "@/__tests__/support/chat-route";

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() =>
  vi.fn(() => new Response(JSON.stringify({ error: "handled" }), { status: 503 })),
);

vi.mock("@clerk/nextjs/server", () => createClerkAuthModule(authMock));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("@/lib/supabase/clerk-rls", () => createSupabaseClerkRlsModule(getSupabaseClerkRlsClientMock));
vi.mock("@/lib/supabase/server", () => createSupabaseServerModule(getSupabaseServerClientMock));
vi.mock("@/lib/rate-limit/server", () => createRateLimitModule());
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: vi.fn(),
}));

const MESSAGE_ID = "11111111-1111-4111-8111-111111111111";
const OPTION_YES = "33333333-3333-4333-8333-333333333333";
const OPTION_NO = "44444444-4444-4444-8444-444444444444";
const OTHER_OPTION = "55555555-5555-4555-8555-555555555555";
type PollChannel = "community" | "admin_elu" | "territory" | "action" | "dm";
type ActiveRole = "admin" | "elu" | "max" | "benevole";

type VoteHandler = (
  request: Request,
  context: { params: Promise<{ messageId: string }> },
) => Promise<Response>;

async function putVote(handler: VoteHandler, optionId: string) {
  return handler(
    new Request("http://localhost/api/chat/polls/111/vote", {
      method: "PUT",
      body: JSON.stringify({ optionId }),
    }),
    { params: Promise.resolve({ messageId: MESSAGE_ID }) },
  );
}

async function postVote(handler: VoteHandler, optionId: string) {
  return handler(
    new Request("http://localhost/api/chat/polls/111/vote", {
      method: "POST",
      body: JSON.stringify({ optionId }),
    }),
    { params: Promise.resolve({ messageId: MESSAGE_ID }) },
  );
}

async function deleteVote(handler: VoteHandler) {
  return handler(
    new Request("http://localhost/api/chat/polls/111/vote", { method: "DELETE" }),
    { params: Promise.resolve({ messageId: MESSAGE_ID }) },
  );
}

async function preparePollRoute(
  channelType: PollChannel = "community",
  options: { activeRole?: ActiveRole; visible?: boolean; serviceVisible?: boolean } = {},
) {
  const mock = buildChatPollVoteSupabaseMock({
    messageId: MESSAGE_ID,
    optionIds: [OPTION_YES, OPTION_NO],
    channelType,
    visible: options.visible,
    serviceVisible: options.serviceVisible,
  });
  getSupabaseClerkRlsClientMock.mockResolvedValue(mock.supabase);
  getSupabaseServerClientMock.mockReturnValue(mock.serviceSupabase);
  identityMock.mockResolvedValue({
    activeRole: options.activeRole ?? (channelType === "admin_elu" ? "elu" : "benevole"),
  });
  return { mock, route: await import("./route") };
}

describe("/api/chat/polls/[messageId]/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    identityMock.mockResolvedValue({ activeRole: "benevole" });
    mockAllowedRateLimit(30);
  });

  it("creates a first vote and returns aggregate counts plus the current selection", async () => {
    const { mock, route: { PUT } } = await preparePollRoute();

    const response = await putVote(PUT, OPTION_YES);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      messageId: MESSAGE_ID,
      totalVotes: 1,
      selectedOptionId: OPTION_YES,
      options: [
        { id: OPTION_YES, voteCount: 1 },
        { id: OPTION_NO, voteCount: 0 },
      ],
    });
    expect(mock.voteTable.upsert).toHaveBeenCalledWith(
      { message_id: MESSAGE_ID, option_id: OPTION_YES, user_id: "user-1" },
      { onConflict: "message_id,user_id" },
    );
    expect(mock.summaryRpc).toHaveBeenCalledWith(
      "get_my_chat_poll_vote_summaries",
      { p_message_ids: [MESSAGE_ID], p_user_id: "user-1" },
    );
  });

  it("keeps POST as an equivalent compatibility entry point for the vote transition", async () => {
    const { mock, route: { POST } } = await preparePollRoute();

    const response = await postVote(POST, OPTION_YES);

    expect(response.status).toBe(200);
    expect((await response.json()).selectedOptionId).toBe(OPTION_YES);
    expect(mock.voteTable.upsert).toHaveBeenCalledWith(
      { message_id: MESSAGE_ID, option_id: OPTION_YES, user_id: "user-1" },
      { onConflict: "message_id,user_id" },
    );
  });

  it.each(["community", "admin_elu", "territory", "action", "dm"] as const)(
    "changes and removes the current user's vote idempotently in %s",
    async (channelType) => {
    const { route: { PUT, DELETE } } = await preparePollRoute(channelType);

    await putVote(PUT, OPTION_YES);
    const changed = await putVote(PUT, OPTION_NO);
    expect((await changed.json()).selectedOptionId).toBe(OPTION_NO);

    const removed = await deleteVote(DELETE);
    expect(await removed.json()).toMatchObject({
      totalVotes: 0,
      selectedOptionId: null,
    });

    const removedAgain = await deleteVote(DELETE);
      expect((await removedAgain.json()).totalVotes).toBe(0);
    },
  );

  it.each(["admin_elu", "territory", "action", "dm"] as const)(
    "uses the same vote engine for a visible %s poll",
    async (channelType) => {
    const { mock, route: { PUT } } = await preparePollRoute(channelType);

    const response = await putVote(PUT, OPTION_YES);

    expect(response.status).toBe(200);
    expect((await response.json()).selectedOptionId).toBe(OPTION_YES);
    if (channelType === "admin_elu") {
      expect(mock.serviceVoteTable.upsert).toHaveBeenCalled();
      expect(mock.voteTable.upsert).not.toHaveBeenCalled();
    } else {
      expect(mock.voteTable.upsert).toHaveBeenCalled();
      expect(mock.serviceVoteTable.upsert).not.toHaveBeenCalled();
    }
    },
  );

  it.each(["community", "territory", "action", "dm"] as const)(
    "keeps a privileged actor on Clerk-RLS for an allowed ordinary %s poll",
    async (channelType) => {
      const { mock, route: { PUT } } = await preparePollRoute(channelType, { activeRole: "elu" });

      const response = await putVote(PUT, OPTION_YES);

      expect(response.status).toBe(200);
      expect(mock.voteTable.upsert).toHaveBeenCalled();
      expect(mock.serviceVoteTable.upsert).not.toHaveBeenCalled();
      expect(mock.summaryRpc).toHaveBeenCalled();
    },
  );

  it.each(["admin", "elu", "max"] as const)(
    "refuses a privileged %s actor who is not visible on an ordinary poll",
    async (activeRole) => {
      const { mock, route: { PUT, POST, DELETE } } = await preparePollRoute("dm", {
        activeRole,
        visible: false,
      });

      const responses = await Promise.all([
        putVote(PUT, OPTION_YES),
        postVote(POST, OPTION_YES),
        deleteVote(DELETE),
      ]);

      expect(responses.map((response) => response.status)).toEqual([404, 404, 404]);
      expect(mock.voteTable.upsert).not.toHaveBeenCalled();
      expect(mock.voteTable.delete).not.toHaveBeenCalled();
      expect(mock.serviceVoteTable.upsert).not.toHaveBeenCalled();
      expect(mock.serviceVoteTable.delete).not.toHaveBeenCalled();
      expect(mock.summaryRpc).not.toHaveBeenCalled();
      expect(mock.serviceAppMessageQuery.eq).toHaveBeenCalledWith("channel_type", "admin_elu");
    },
  );

  it.each(["action", "territory"] as const)(
    "does not let an authorized role bypass an invisible %s poll",
    async (channelType) => {
      const { mock, route: { PUT } } = await preparePollRoute(channelType, {
        activeRole: "elu",
        visible: false,
      });

      const response = await putVote(PUT, OPTION_YES);

      expect(response.status).toBe(404);
      expect(mock.voteTable.upsert).not.toHaveBeenCalled();
      expect(mock.serviceVoteTable.upsert).not.toHaveBeenCalled();
      expect(mock.summaryRpc).not.toHaveBeenCalled();
    },
  );

  it("allows only Clerk-authorized admin_elu roles to use the scoped service path", async () => {
    for (const activeRole of ["admin", "elu", "max"] as const) {
      const { mock, route: { PUT, DELETE } } = await preparePollRoute("admin_elu", { activeRole });

      const voteResponse = await putVote(PUT, OPTION_YES);
      const deleteResponse = await deleteVote(DELETE);

      expect(voteResponse.status).toBe(200);
      expect(deleteResponse.status).toBe(200);
      expect(mock.serviceVoteTable.upsert).toHaveBeenCalledWith(
        { message_id: MESSAGE_ID, option_id: OPTION_YES, user_id: "user-1" },
        { onConflict: "message_id,user_id" },
      );
      expect(mock.serviceVoteTable.delete).toHaveBeenCalled();
      expect(mock.voteTable.upsert).not.toHaveBeenCalled();
    }
  });

  it("refuses an unauthorized actor on admin_elu without reading or writing through service_role", async () => {
    const { mock, route: { PUT, POST, DELETE } } = await preparePollRoute("admin_elu", {
      activeRole: "benevole",
    });

    const putResponse = await putVote(PUT, OPTION_YES);
    const postResponse = await postVote(POST, OPTION_YES);
    const deleteResponse = await deleteVote(DELETE);

    expect(putResponse.status).toBe(404);
    expect(postResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(mock.voteTable.upsert).not.toHaveBeenCalled();
    expect(mock.serviceVoteTable.upsert).not.toHaveBeenCalled();
    expect(mock.summaryRpc).not.toHaveBeenCalled();
  });

  it("rejects an option belonging to another poll before writing", async () => {
    const { mock, route: { PUT } } = await preparePollRoute();

    const response = await putVote(PUT, OTHER_OPTION);

    expect(response.status).toBe(400);
    expect(mock.voteTable.upsert).not.toHaveBeenCalled();
  });

  it("returns the same inaccessible result for a non-poll message without writing", async () => {
    const mock = buildChatPollVoteSupabaseMock({
      messageId: MESSAGE_ID,
      optionIds: [OPTION_YES, OPTION_NO],
      messageKind: "message",
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(mock.supabase);
    getSupabaseServerClientMock.mockReturnValue(mock.serviceSupabase);
    const { PUT, DELETE } = await import("./route");

    const putResponse = await putVote(PUT, OPTION_YES);
    const deleteResponse = await deleteVote(DELETE);

    expect(putResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(mock.voteTable.upsert).not.toHaveBeenCalled();
    expect(mock.summaryRpc).not.toHaveBeenCalled();
  });

  it("maps a transactional upsert error without returning a vote summary", async () => {
    const { mock, route: { PUT } } = await preparePollRoute();
    const failure = new Error("vote write unavailable");
    mock.voteTable.upsert.mockResolvedValueOnce({ error: failure });

    const response = await putVote(PUT, OPTION_YES);

    expect(response.status).toBe(503);
    expect(handleApiErrorMock).toHaveBeenCalledWith(
      failure,
      "PUT /api/chat/polls/[messageId]/vote",
    );
    expect(mock.summaryRpc).not.toHaveBeenCalled();
  });

  it("keeps concurrent votes scoped to their authenticated actors", async () => {
    const { mock, route: { PUT } } = await preparePollRoute();
    authMock.mockReset();
    authMock
      .mockResolvedValueOnce({ userId: "user-1" })
      .mockResolvedValueOnce({ userId: "user-2" });

    const [yesResponse, noResponse] = await Promise.all([
      putVote(PUT, OPTION_YES),
      putVote(PUT, OPTION_NO),
    ]);

    expect((await yesResponse.json()).selectedOptionId).toBe(OPTION_YES);
    expect((await noResponse.json()).selectedOptionId).toBe(OPTION_NO);
    expect(mock.votes).toEqual(new Map([
      [`user-1:${MESSAGE_ID}`, OPTION_YES],
      [`user-2:${MESSAGE_ID}`, OPTION_NO],
    ]));
  });

  it("routes a vote summary rejection through handleApiError", async () => {
    const { mock, route: { PUT } } = await preparePollRoute();
    const failure = new Error("vote summary unavailable");
    mock.summaryRpc.mockRejectedValueOnce(failure);

    const response = await putVote(PUT, OPTION_YES);

    expect(response.status).toBe(503);
    expect(handleApiErrorMock).toHaveBeenCalledWith(
      failure,
      "PUT /api/chat/polls/[messageId]/vote",
    );
  });

  it("routes a deletion summary rejection through handleApiError", async () => {
    const { mock, route: { DELETE } } = await preparePollRoute();
    const failure = new Error("vote summary unavailable");
    mock.summaryRpc.mockRejectedValueOnce(failure);

    const response = await deleteVote(DELETE);

    expect(response.status).toBe(503);
    expect(handleApiErrorMock).toHaveBeenCalledWith(
      failure,
      "DELETE /api/chat/polls/[messageId]/vote",
    );
  });

  it("never returns individual voter identities and scopes the selected option to the current user", async () => {
    const mock = buildChatPollVoteSupabaseMock({ messageId: MESSAGE_ID, optionIds: [OPTION_YES, OPTION_NO] });
    getSupabaseClerkRlsClientMock.mockResolvedValue(mock.supabase);
    getSupabaseServerClientMock.mockReturnValue(mock.serviceSupabase);
    const { PUT } = await import("./route");

    await PUT(
      new Request("http://localhost/api/chat/polls/111/vote", {
        method: "PUT",
        body: JSON.stringify({ optionId: OPTION_YES }),
      }),
      { params: Promise.resolve({ messageId: MESSAGE_ID }) },
    );
    authMock.mockResolvedValue({ userId: "user-2" });
    const response = await PUT(
      new Request("http://localhost/api/chat/polls/111/vote", {
        method: "PUT",
        body: JSON.stringify({ optionId: OPTION_NO }),
      }),
      { params: Promise.resolve({ messageId: MESSAGE_ID }) },
    );
    const body = await response.json();

    expect(body.selectedOptionId).toBe(OPTION_NO);
    expect(body.totalVotes).toBe(2);
    expect(JSON.stringify(body)).not.toContain("user-1");
    expect(JSON.stringify(body)).not.toContain("user-2");
    expect(JSON.stringify(body)).not.toContain("voter");
  });

  it("does not aggregate or write an invisible poll", async () => {
    const mock = buildChatPollVoteSupabaseMock({
      messageId: MESSAGE_ID,
      optionIds: [OPTION_YES, OPTION_NO],
      visible: false,
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(mock.supabase);
    const { PUT } = await import("./route");

    const response = await PUT(
      new Request("http://localhost/api/chat/polls/111/vote", {
        method: "PUT",
        body: JSON.stringify({ optionId: OPTION_YES }),
      }),
      { params: Promise.resolve({ messageId: MESSAGE_ID }) },
    );

    expect(response.status).toBe(404);
    expect(mock.voteTable.upsert).not.toHaveBeenCalled();
    expect(mock.summaryRpc).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
