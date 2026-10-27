import { vi } from "vitest";

type ProfileRow = { id: string; display_name: string | null; handle: string | null; paris_arrondissement: number | null; role_label: string | null; metadata: Record<string, unknown> | null };

export type ChatMessageRow = {
  id: string; created_at: string; content: string; channel_type: string; sender_id: string;
  recipient_id: string | null; arrondissement_id: number | null; zone_name: string | null;
  topic_id?: string | null; message_kind?: "message" | "announcement" | "poll";
  related_event_id?: string | null; conversation_id?: string | null; attachment_url?: string | null;
  attachment_path?: string | null; attachment_type?: string | null; attachment_expires_at?: string | null;
  action_id?: string | null;
  related_event?: { id: string; title: string; event_date: string; location_label: string } | null;
  poll_options?: Array<{ id: string; position: number; label: string }>;
  sender?: { display_name: string | null; handle: string | null; avatar_url: string | null };
};

export async function postChatPayload(payload: Record<string, unknown>) {
  const { POST } = await import("@/app/api/chat/route");
  return POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }));
}

type ChatMessageFilter = { kind: "eq" | "in"; field: string; value: unknown } | { kind: "keyset"; expression: string };
type MessageQueryResult = { data: ChatMessageRow[]; error: null };
type MessageQuery = Promise<MessageQueryResult> & {
  select: (...args: unknown[]) => MessageQuery;
  order: (...args: unknown[]) => MessageQuery;
  limit: (...args: unknown[]) => MessageQuery;
  eq: (field: string, value: unknown) => MessageQuery;
  in: (field: string, value: unknown[]) => MessageQuery;
  or: (expression: string) => MessageQuery;
  maybeSingle: () => Promise<{ data: ChatMessageRow | null; error: null }>;
  single: () => Promise<{ data: ChatMessageRow | null; error: null | { message: string } }>;
};

function filterChatMessages(messages: ChatMessageRow[], filters: ChatMessageFilter[]): ChatMessageRow[] {
  return messages.filter((message) => filters.every((filter) => {
    if (filter.kind === "keyset") {
      const match = filter.expression.match(/^created_at\.(lt|lte)\.([^,]+),and\(created_at\.eq\.([^,]+),id\.(lt|lte)\.([^\)]+)\)$/);
      if (!match) return false;
      const messageTime = Date.parse(message.created_at); const cursorTime = Date.parse(match[3]);
      if (messageTime !== cursorTime) return match[1] === "lt" ? messageTime < cursorTime : messageTime <= cursorTime;
      const idIsBefore = message.id.localeCompare(match[5]) < 0;
      return match[4] === "lt" ? idIsBefore : idIsBefore || message.id === match[5];
    }
    if (filter.kind === "eq") return message[filter.field as keyof ChatMessageRow] === filter.value;
    return (filter.value as unknown[]).includes(message[filter.field as keyof ChatMessageRow]);
  }));
}

type SupabaseMockOptions = {
  profile: ProfileRow; messages: ChatMessageRow[]; insertedMessage: ChatMessageRow;
  relatedEvent?: { id: string; title: string; event_date: string; location_label: string } | null;
  pollMessage?: ChatMessageRow; actionConversation?: { id: string; action_id: string } | null;
  dmRows?: Array<{ peer_id: string; peer_display_name: string | null; peer_handle: string | null }>;
};

function createStaticQueries(options: SupabaseMockOptions) {
  const profileQuery = { select: vi.fn(() => profileQuery), eq: vi.fn(() => profileQuery), maybeSingle: vi.fn().mockResolvedValue({ data: options.profile, error: null }) };
  const relatedEventQuery = {
    select: vi.fn(() => relatedEventQuery),
    eq: vi.fn(() => relatedEventQuery),
    in: vi.fn().mockResolvedValue({
      data: options.relatedEvent ? [options.relatedEvent] : [],
      error: null,
    }),
    maybeSingle: vi.fn().mockResolvedValue({ data: options.relatedEvent ?? null, error: null }),
  };
  const actionConversationQuery = { select: vi.fn(() => actionConversationQuery), eq: vi.fn(() => actionConversationQuery), maybeSingle: vi.fn().mockResolvedValue({ data: options.actionConversation ?? null, error: null }) };
  return { profileQuery, relatedEventQuery, actionConversationQuery };
}

function createMessageHarness(options: SupabaseMockOptions) {
  const messagesQuery = { select: vi.fn(), order: vi.fn(), limit: vi.fn(), eq: vi.fn(), in: vi.fn(), or: vi.fn(), maybeSingle: vi.fn(), single: vi.fn() };
  const createMessagesQuery = () => {
    const filters: ChatMessageFilter[] = [];
    const filterMessages = () => filterChatMessages(options.messages, filters);
    // Supabase builders are awaitable and chainable; a real Promise preserves both behaviors without a manual thenable.
    const query = Object.assign(
      Promise.resolve().then<MessageQueryResult>(() => ({ data: filterMessages(), error: null })),
      {
        select: vi.fn(() => query),
        order: vi.fn((...args: unknown[]) => { messagesQuery.order(...args); return query; }),
        limit: vi.fn((...args: unknown[]) => { messagesQuery.limit(...args); return query; }),
        eq: vi.fn((field: string, value: unknown) => { filters.push({ kind: "eq", field, value }); messagesQuery.eq(field, value); return query; }),
        in: vi.fn((field: string, value: unknown[]) => { filters.push({ kind: "in", field, value }); messagesQuery.in(field, value); return query; }),
        or: vi.fn((expression: string) => { messagesQuery.or(expression); filters.push({ kind: "keyset", expression }); return query; }),
        maybeSingle: vi.fn().mockImplementation(async () => ({ data: filterMessages()[0] ?? null, error: null })),
        single: vi.fn().mockImplementation(async () => { const data = filterMessages()[0] ?? null; return data ? { data, error: null } : { data: null, error: { message: "not found" } }; }),
      },
    ) as MessageQuery;
    return query;
  };
  messagesQuery.select.mockImplementation(() => createMessagesQuery()); messagesQuery.order.mockImplementation(() => createMessagesQuery()); messagesQuery.limit.mockImplementation(() => createMessagesQuery());
  const insertResult = { single: vi.fn().mockResolvedValue({ data: options.insertedMessage, error: null }) };
  const insertBuilder = { select: vi.fn(() => insertResult) };
  return { messagesQuery, insertResult, insertBuilder, appMessagesTable: { select: messagesQuery.select, insert: vi.fn(() => insertBuilder) } };
}

function createServiceRpc(options: SupabaseMockOptions) {
  return vi.fn((functionName: string) => {
    if (functionName !== "get_my_chat_poll_vote_summaries" && functionName !== "create_chat_poll_with_options_for_server") throw new Error(`Unexpected service RPC: ${functionName}`);
    if (functionName === "create_chat_poll_with_options_for_server") return Promise.resolve({ data: options.pollMessage?.id ?? options.insertedMessage.id, error: null });
    return Promise.resolve({ data: (options.pollMessage?.poll_options ?? []).map((option) => ({ message_id: options.pollMessage?.id, option_id: option.id, vote_count: 0, total_votes: 0, selected_option_id: null })), error: null });
  });
}

export function buildSupabaseMock(options: SupabaseMockOptions) {
  const staticQueries = createStaticQueries(options); const messageHarness = createMessageHarness(options); const serviceRpc = createServiceRpc(options);
  const createSignedUrls = vi.fn(async (paths: string[]) => ({ data: paths.map((path) => ({ path, signedUrl: `https://storage.example.test/signed/${encodeURIComponent(path)}` })), error: null }));
  const serviceStorageBucket = { createSignedUrls };
  function from(table: string) {
    if (table === "profiles") return staticQueries.profileQuery;
    if (table === "app_messages") return messageHarness.appMessagesTable;
    if (table === "community_events") return staticQueries.relatedEventQuery;
    if (table === "action_conversations") return staticQueries.actionConversationQuery;
    throw new Error(`Unexpected table: ${table}`);
  }
  function rpc(functionName: string) {
    if (functionName === "list_my_dm_conversations") return Promise.resolve({ data: options.dmRows ?? [], error: null });
    throw new Error(`Unexpected RLS RPC: ${functionName}`);
  }
  const supabase = { from: vi.fn(from), rpc: vi.fn(rpc) };
  const serviceAppMessagesTable = { ...messageHarness.appMessagesTable };
  const serviceSupabase = { from: vi.fn((table: string) => table === "app_messages" ? serviceAppMessagesTable : from(table)), rpc: serviceRpc, storage: { from: vi.fn(() => serviceStorageBucket) } };
  return { supabase, ...staticQueries, ...messageHarness, serviceSupabase, serviceAppMessagesTable, serviceRpc, createSignedUrls };
}

export type ChatPollVoteSupabaseMockOptions = {
  messageId: string;
  optionIds?: readonly [string, string];
  visible?: boolean;
  messageKind?: string;
  channelType?: "community" | "admin_elu" | "territory" | "action" | "dm";
};

export function buildChatPollVoteSupabaseMock({
  messageId,
  optionIds = ["option-yes", "option-no"],
  visible = true,
  messageKind = "poll",
  channelType = "community",
}: ChatPollVoteSupabaseMockOptions) {
  const [yesOptionId, noOptionId] = optionIds;
  const options = [
    { id: yesOptionId, position: 1, label: "Oui", message_id: messageId },
    { id: noOptionId, position: 2, label: "Non", message_id: messageId },
  ];
  const votes = new Map<string, string>();

  const appMessageQuery = {
    select: vi.fn(() => appMessageQuery),
    eq: vi.fn(() => appMessageQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: visible ? { id: messageId, message_kind: messageKind, channel_type: channelType } : null,
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
    upsert: vi.fn(async (row: { message_id: string; option_id: string; user_id: string }): Promise<{ error: Error | null }> => {
      votes.set(`${row.user_id}:${row.message_id}`, row.option_id);
      return { error: null };
    }),
    delete: vi.fn(() => voteTable),
    eq: vi.fn((field: string, value: string) => {
      if (field === "user_id") votes.delete(`${value}:${messageId}`);
      return voteTable;
    }),
  };
  const summaryRpc = vi.fn().mockImplementation(
    async (_name: string, args: { p_message_ids: string[]; p_user_id: string }) => {
      const selected = votes.get(`${args.p_user_id}:${args.p_message_ids[0]}`) ?? null;
      return {
        data: options.map((option) => ({
          message_id: args.p_message_ids[0],
          option_id: option.id,
          vote_count: [...votes.values()].filter((value) => value === option.id).length,
          total_votes: votes.size,
          selected_option_id: selected,
        })),
        error: null,
      };
    },
  );
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "app_messages") return appMessageQuery;
      if (table === "chat_poll_options") return optionsQuery;
      if (table === "chat_poll_votes") return voteTable;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  const serviceSupabase = { from: supabase.from, rpc: summaryRpc };

  return { supabase, serviceSupabase, summaryRpc, options, votes, appMessageQuery, optionsQuery, voteTable };
}
