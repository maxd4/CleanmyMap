import { vi } from "vitest";

type ProfileRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
  paris_arrondissement: number | null;
  role_label: string | null;
  metadata: Record<string, unknown> | null;
};

export type ChatMessageRow = {
  id: string;
  created_at: string;
  content: string;
  channel_type: string;
  sender_id: string;
  recipient_id: string | null;
  arrondissement_id: number | null;
  zone_name: string | null;
  topic_id?: string | null;
  message_kind?: "message" | "announcement" | "poll";
  related_event_id?: string | null;
  related_event?: {
    id: string;
    title: string;
    event_date: string;
    location_label: string;
  } | null;
  poll_options?: Array<{ id: string; position: number; label: string }>;
  sender?: {
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  };
};

export function buildSupabaseMock(options: {
  profile: ProfileRow;
  messages: ChatMessageRow[];
  insertedMessage: ChatMessageRow;
  relatedEvent?: {
    id: string;
    title: string;
    event_date: string;
    location_label: string;
  } | null;
  pollMessage?: ChatMessageRow;
}) {
  const profileQuery = {
    select: vi.fn(() => profileQuery),
    eq: vi.fn(() => profileQuery),
    maybeSingle: vi.fn().mockResolvedValue({ data: options.profile, error: null }),
  };

  const relatedEventQuery = {
    select: vi.fn(() => relatedEventQuery),
    eq: vi.fn(() => relatedEventQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.relatedEvent ?? null,
      error: null,
    }),
  };

  const messagesQuery = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  const createMessagesQuery = () => {
    const filters: Array<
      | { kind: "eq" | "in"; field: string; value: unknown }
      | { kind: "keyset"; expression: string }
    > = [];
    const filterMessages = () =>
      options.messages.filter((message) =>
        filters.every((filter) =>
          filter.kind === "keyset"
            ? (() => {
                const match = filter.expression.match(
                  /^created_at\.(lt|lte)\.([^,]+),and\(created_at\.eq\.([^,]+),id\.(lt|lte)\.([^\)]+)\)$/,
                );
                if (!match) return false;
                const messageTime = Date.parse(message.created_at);
                const cursorTime = Date.parse(match[3]);
                if (messageTime !== cursorTime) {
                  return match[1] === "lt"
                    ? messageTime < cursorTime
                    : messageTime <= cursorTime;
                }
                const idIsBefore = message.id.localeCompare(match[5]) < 0;
                return match[4] === "lt" ? idIsBefore : idIsBefore || message.id === match[5];
              })()
            : filter.kind === "eq"
            ? message[filter.field as keyof ChatMessageRow] === filter.value
            : (filter.value as unknown[]).includes(
                message[filter.field as keyof ChatMessageRow],
              ),
        ),
      );
    const query = {
      select: vi.fn(() => query),
      order: vi.fn((...args: unknown[]) => {
        messagesQuery.order(...args);
        return query;
      }),
      limit: vi.fn((...args: unknown[]) => {
        messagesQuery.limit(...args);
        return query;
      }),
      eq: vi.fn((field: string, value: unknown) => {
        filters.push({ kind: "eq", field, value });
        messagesQuery.eq(field, value);
        return query;
      }),
      in: vi.fn((field: string, value: unknown[]) => {
        filters.push({ kind: "in", field, value });
        messagesQuery.in(field, value);
        return query;
      }),
      or: vi.fn((expression: string) => {
        messagesQuery.or(expression);
        filters.push({ kind: "keyset", expression });
        return query;
      }),
      maybeSingle: vi.fn().mockImplementation(async () => {
        const data = filterMessages()[0] ?? null;
        return { data, error: null };
      }),
      single: vi.fn().mockImplementation(async () => {
        const data = filterMessages()[0] ?? null;
        return data
          ? { data, error: null }
          : { data: null, error: { message: "not found" } };
      }),
      then: (
        resolve: (value: { data: ChatMessageRow[]; error: null }) => unknown,
        reject: (reason?: unknown) => unknown,
      ) =>
        Promise.resolve({
          data: filterMessages(),
          error: null,
        }).then(resolve, reject),
    };
    return query;
  };
  messagesQuery.select.mockImplementation(() => createMessagesQuery());
  messagesQuery.order.mockImplementation(() => createMessagesQuery());
  messagesQuery.limit.mockImplementation(() => createMessagesQuery());

  const insertResult = {
    single: vi.fn().mockResolvedValue({ data: options.insertedMessage, error: null }),
  };

  const insertBuilder = {
    select: vi.fn(() => insertResult),
  };

  const appMessagesTable = {
    select: messagesQuery.select,
    insert: vi.fn(() => insertBuilder),
  };

  const serviceRpc = vi.fn((functionName: string) => {
    if (functionName !== "get_my_chat_poll_vote_summaries") {
      throw new Error(`Unexpected service RPC: ${functionName}`);
    }

    return Promise.resolve({
      data: (options.pollMessage?.poll_options ?? []).map((option) => ({
        message_id: options.pollMessage?.id,
        option_id: option.id,
        vote_count: 0,
        total_votes: 0,
        selected_option_id: null,
      })),
      error: null,
    });
  });

  const serviceSupabase = {
    rpc: serviceRpc,
  };

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return profileQuery;
      }
      if (table === "app_messages") {
        return appMessagesTable;
      }
      if (table === "community_events") {
        return relatedEventQuery;
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
    rpc: vi.fn((functionName: string) => {
      if (functionName !== "create_chat_poll_with_options") {
        throw new Error(`Unexpected RPC: ${functionName}`);
      }
      return Promise.resolve({
        data: options.pollMessage?.id ?? null,
        error: null,
      });
    }),
  };

  return {
    supabase,
    profileQuery,
    relatedEventQuery,
    messagesQuery,
    appMessagesTable,
    insertBuilder,
    insertResult,
    serviceSupabase,
    serviceRpc,
  };
}
