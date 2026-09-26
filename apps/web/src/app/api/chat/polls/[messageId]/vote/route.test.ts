import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClerkAuthModule, createRateLimitModule, createSupabaseClerkRlsModule, createSupabaseServerModule, mockAllowedRateLimit } from "@/app/api/test-helpers";

const authMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => createClerkAuthModule(authMock));
vi.mock("@/lib/supabase/clerk-rls", () => createSupabaseClerkRlsModule(getSupabaseClerkRlsClientMock));
vi.mock("@/lib/supabase/server", () => createSupabaseServerModule(getSupabaseServerClientMock));
vi.mock("@/lib/rate-limit/server", () => createRateLimitModule());

const MESSAGE_ID = "11111111-1111-4111-8111-111111111111";
const OPTION_YES = "33333333-3333-4333-8333-333333333333";
const OPTION_NO = "44444444-4444-4444-8444-444444444444";
const OTHER_OPTION = "55555555-5555-4555-8555-555555555555";

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

async function deleteVote(handler: VoteHandler) {
  return handler(
    new Request("http://localhost/api/chat/polls/111/vote", { method: "DELETE" }),
    { params: Promise.resolve({ messageId: MESSAGE_ID }) },
  );
}

function buildSupabaseMock({
  visible = true,
  channelType = "community",
}: {
  visible?: boolean;
  channelType?: "community" | "admin_elu" | "territory" | "action" | "dm";
} = {}) {
  const votes = new Map<string, string>();
  const options = [
    { id: OPTION_YES, position: 1, label: "Oui", message_id: MESSAGE_ID },
    { id: OPTION_NO, position: 2, label: "Non", message_id: MESSAGE_ID },
  ];

  const appMessageQuery = {
    select: vi.fn(() => appMessageQuery),
    eq: vi.fn(() => appMessageQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: visible
        ? { id: MESSAGE_ID, message_kind: "poll", channel_type: channelType }
        : null,
      error: null,
    }),
  };
  const optionsQuery = {
    select: vi.fn(() => optionsQuery),
    eq: vi.fn(() => optionsQuery),
    order: vi.fn(() => optionsQuery),
    then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
      Promise.resolve({ data: options, error: null }).then(resolve, reject),
  };
  const voteTable = {
    upsert: vi.fn(async (row: { message_id: string; option_id: string; user_id: string }) => {
      votes.set(`${row.user_id}:${row.message_id}`, row.option_id);
      return { error: null };
    }),
    delete: vi.fn(() => voteTable),
    eq: vi.fn((field: string, value: string) => {
      if (field === "user_id") {
        votes.delete(`${value}:${MESSAGE_ID}`);
      }
      return voteTable;
    }),
  };

  const summaryRpc = vi.fn().mockImplementation(
    async (_name: string, args: { p_message_ids: string[]; p_user_id: string }) => {
      const messageId = args.p_message_ids[0];
      const selected = votes.get(`${args.p_user_id}:${messageId}`) ?? null;
      return {
        data: options.map((option) => ({
          message_id: messageId,
          option_id: option.id,
          vote_count: [...votes.values()].filter((value) => value === option.id).length,
          total_votes: votes.size,
          selected_option_id: selected,
        })),
        error: null,
      };
    },
  );

  const serviceSupabase = {
    rpc: summaryRpc,
  };

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "app_messages") return appMessageQuery;
      if (table === "chat_poll_options") return optionsQuery;
      if (table === "chat_poll_votes") return voteTable;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    supabase,
    serviceSupabase,
    summaryRpc,
    options,
    votes,
    setCurrentUserId: (userId: string) => {
      authMock.mockResolvedValue({ userId });
    },
    appMessageQuery,
    optionsQuery,
    voteTable,
  };
}

async function preparePollRoute(channelType?: "community" | "admin_elu" | "territory" | "action" | "dm") {
  const mock = buildSupabaseMock({ channelType });
  getSupabaseClerkRlsClientMock.mockResolvedValue(mock.supabase);
  getSupabaseServerClientMock.mockReturnValue(mock.serviceSupabase);
  return { mock, route: await import("./route") };
}

describe("/api/chat/polls/[messageId]/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
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
    const { route: { PUT } } = await preparePollRoute(channelType);

    const response = await putVote(PUT, OPTION_YES);

    expect(response.status).toBe(200);
    expect((await response.json()).selectedOptionId).toBe(OPTION_YES);
    },
  );

  it("rejects an option belonging to another poll before writing", async () => {
    const { mock, route: { PUT } } = await preparePollRoute();

    const response = await putVote(PUT, OTHER_OPTION);

    expect(response.status).toBe(400);
    expect(mock.voteTable.upsert).not.toHaveBeenCalled();
  });

  it("never returns individual voter identities and scopes the selected option to the current user", async () => {
    const mock = buildSupabaseMock();
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
    mock.setCurrentUserId("user-2");
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
    const mock = buildSupabaseMock({ visible: false });
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
