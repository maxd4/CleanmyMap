import { beforeEach, describe, expect, it, vi } from "vitest";

type SearchRow = {
  id: string;
  created_at: string;
  content: string;
  channel_type: string;
  topic_id: string | null;
  message_kind: string;
  sender_id: string;
  recipient_id: string | null;
  arrondissement_id: number | null;
  zone_name: string | null;
  sender: Array<{ display_name: string; handle: string; avatar_url: string | null }>;
};

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const rlsClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: rlsClientMock,
}));

function buildSupabaseMock({
  rows,
  arrondissement = null,
  metadata = null,
}: {
  rows: SearchRow[];
  arrondissement?: number | null;
  metadata?: Record<string, unknown> | null;
}) {
  const profileQuery = {
    select: vi.fn(() => profileQuery),
    eq: vi.fn(() => profileQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { paris_arrondissement: arrondissement, metadata },
      error: null,
    }),
  };
  const table = {
    select: vi.fn(),
  };
  const calls = {
    ilike: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    limit: vi.fn(),
  };
  table.select.mockImplementation(() => {
    const eqFilters: Array<[string, unknown]> = [];
    const inFilters: Array<[string, unknown[]]> = [];
    const likeFilters: Array<[string, string]> = [];
    const keysetFilters: string[] = [];
    const query = {
      ilike: vi.fn((field: string, value: string) => {
        likeFilters.push([field, value]);
        calls.ilike(field, value);
        return query;
      }),
      order: vi.fn(() => query),
      eq: vi.fn((field: string, value: unknown) => {
        eqFilters.push([field, value]);
        calls.eq(field, value);
        return query;
      }),
      in: vi.fn((field: string, value: unknown[]) => {
        inFilters.push([field, value]);
        calls.in(field, value);
        return query;
      }),
      or: vi.fn((expression: string) => {
        keysetFilters.push(expression);
        calls.or(expression);
        return query;
      }),
      limit: vi.fn((value: number) => {
        calls.limit(value);
        return query;
      }),
      then: (
        resolve: (value: { data: SearchRow[]; error: null }) => unknown,
        reject: (reason?: unknown) => unknown,
      ) => {
        const filtered = rows.filter((row) => {
          const matchesEq = eqFilters.every(([field, value]) => row[field as keyof SearchRow] === value);
          const matchesIn = inFilters.every(([field, values]) => values.includes(row[field as keyof SearchRow]));
          const matchesLike = likeFilters.every(([, pattern]) => {
            const needle = pattern.replace(/^%|%$/g, "").replace(/\\([_%])/g, "$1").toLocaleLowerCase();
            return row.content.toLocaleLowerCase().includes(needle);
          });
          const matchesKeyset = keysetFilters.every((expression) => {
            const match = expression.match(
              /^created_at\.lt\.([^,]+),and\(created_at\.eq\.([^,]+),id\.lt\.([^\)]+)\)$/,
            );
            if (!match) return false;
            const rowTime = Date.parse(row.created_at);
            const cursorTime = Date.parse(match[1]);
            return rowTime < cursorTime || (rowTime === cursorTime && row.id.localeCompare(match[3]) < 0);
          });
          return matchesEq && matchesIn && matchesLike && matchesKeyset;
        });
        return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
      },
    };
    return query;
  });

  return {
    supabase: {
      from: vi.fn((tableName: string) => {
        if (tableName === "profiles") return profileQuery;
        if (tableName === "app_messages") return table;
        throw new Error(`Unexpected table ${tableName}`);
      }),
    },
    calls,
  };
}

function buildRow(index: number, overrides: Partial<SearchRow> = {}): SearchRow {
  return {
    id: `11111111-1111-4111-8111-${index.toString(16).padStart(12, "0")}`,
    created_at: `2026-05-01T${String(9 + Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00.000Z`,
    content: `Message de recherche ${index}`,
    channel_type: "community",
    topic_id: null,
    message_kind: "message",
    sender_id: "user-2",
    recipient_id: null,
    arrondissement_id: null,
    zone_name: null,
    sender: [{ display_name: "Alex", handle: "alex", avatar_url: null }],
    ...overrides,
  };
}

describe("GET /api/chat/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    identityMock.mockResolvedValue({ role: "member" });
  });

  it("requires an authenticated current user before resolving a search client", async () => {
    authMock.mockResolvedValueOnce({ userId: null });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/chat/search?channelType=community&q=message"),
    );

    expect(response.status).toBe(401);
    expect(identityMock).not.toHaveBeenCalled();
    expect(rlsClientMock).not.toHaveBeenCalled();
  });

  it("rejects short, overlong and malformed cursors before querying messages", async () => {
    const { GET } = await import("./route");
    const shortResponse = await GET(new Request("http://localhost/api/chat/search?channelType=community&q=a"));
    expect(shortResponse.status).toBe(400);
    expect(rlsClientMock).not.toHaveBeenCalled();

    const longResponse = await GET(
      new Request(`http://localhost/api/chat/search?channelType=community&q=${"a".repeat(121)}`),
    );
    expect(longResponse.status).toBe(400);

    const cursorResponse = await GET(
      new Request("http://localhost/api/chat/search?channelType=community&q=ok&beforeId=invalid"),
    );
    expect(cursorResponse.status).toBe(400);
  });

  it("searches only the selected community topic and returns compact metadata", async () => {
    const supabaseMock = buildSupabaseMock({
      rows: [
        buildRow(1, { content: "Relais important", topic_id: "relais_associatif" }),
        buildRow(2, { content: "Relais important ailleurs", topic_id: "appel_aux_benevoles" }),
      ],
    });
    rlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/chat/search?channelType=community&topicId=relais_associatif&q=important"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({
      messageId: expect.any(String),
      excerpt: "Relais important",
      messageKind: "message",
      topicId: "relais_associatif",
      author: { displayName: "Alex", handle: "alex" },
    });
    expect(supabaseMock.calls.ilike).toHaveBeenCalledWith("content", "%important%");
  });

  it("keeps DM search inside the selected conversation", async () => {
    const supabaseMock = buildSupabaseMock({
      rows: [
        buildRow(1, { channel_type: "dm", sender_id: "user-1", recipient_id: "user-2", content: "Plan partagé" }),
        buildRow(2, { channel_type: "dm", sender_id: "user-2", recipient_id: "user-1", content: "Plan reçu" }),
        buildRow(3, { channel_type: "dm", sender_id: "user-1", recipient_id: "user-3", content: "Plan tiers" }),
      ],
    });
    rlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/chat/search?channelType=dm&recipientId=user-2&q=plan"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results.map((result: { messageId: string }) => result.messageId)).toEqual([
      "11111111-1111-4111-8111-000000000002",
      "11111111-1111-4111-8111-000000000001",
    ]);
  });

  it("keeps bug report search limited to messages sent or received by the current user", async () => {
    const supabaseMock = buildSupabaseMock({
      rows: [
        buildRow(1, {
          channel_type: "bug_report",
          sender_id: "user-1",
          recipient_id: "admin-1",
          content: "Mon signalement envoyé",
        }),
        buildRow(2, {
          channel_type: "bug_report",
          sender_id: "admin-1",
          recipient_id: "user-1",
          content: "Réponse à mon signalement",
        }),
        buildRow(3, {
          channel_type: "bug_report",
          sender_id: "user-2",
          recipient_id: "admin-1",
          content: "Signalement d'un autre compte",
        }),
      ],
    });
    rlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/chat/search?channelType=bug_report&q=signalement"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results.map((result: { messageId: string }) => result.messageId)).toEqual([
      "11111111-1111-4111-8111-000000000002",
      "11111111-1111-4111-8111-000000000001",
    ]);
  });

  it("denies admin_elu search to a non-authorized role", async () => {
    identityMock.mockResolvedValueOnce({ role: "benevole" });
    const supabaseMock = buildSupabaseMock({ rows: [] });
    rlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/chat/search?channelType=admin_elu&q=secret"),
    );

    expect(response.status).toBe(403);
    expect(supabaseMock.calls.ilike).not.toHaveBeenCalled();
  });

  it("uses only the profile territory when client coordinates request another arrondissement", async () => {
    const supabaseMock = buildSupabaseMock({
      arrondissement: 11,
      rows: [
        buildRow(1, {
          channel_type: "territory",
          arrondissement_id: 11,
          content: "Besoin autorisé dans mon territoire",
        }),
        buildRow(2, {
          channel_type: "territory",
          arrondissement_id: 1,
          content: "Besoin hors territoire",
        }),
      ],
    });
    rlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/chat/search?channelType=territory&zoneName=Paris%201er%20arrondissement&arrondissementId=1&q=Besoin",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results.map((result: { messageId: string }) => result.messageId)).toEqual([
      "11111111-1111-4111-8111-000000000001",
    ]);
    expect(supabaseMock.calls.eq).not.toHaveBeenCalledWith(
      "zone_name",
      "Paris 1er arrondissement",
    );
    expect(supabaseMock.calls.in).toHaveBeenCalledWith(
      "arrondissement_id",
      expect.arrayContaining([11, 3, 4, 10, 12, 19, 20]),
    );
    expect(supabaseMock.calls.in).not.toHaveBeenCalledWith(
      "arrondissement_id",
      expect.arrayContaining([1]),
    );
  });

  it("paginates search results with the same stable keyset and keeps territory scope", async () => {
    const rows = Array.from({ length: 21 }, (_, index) =>
      buildRow(index, {
        channel_type: "territory",
        arrondissement_id: 11,
        content: `Besoin local ${index}`,
      }),
    );
    rows.push(buildRow(99, { channel_type: "territory", arrondissement_id: 1, content: "Besoin local hors scope" }));
    const supabaseMock = buildSupabaseMock({ rows, arrondissement: 11 });
    rlsClientMock.mockResolvedValue(supabaseMock.supabase);

    const { GET } = await import("./route");
    const firstResponse = await GET(
      new Request("http://localhost/api/chat/search?channelType=territory&q=local"),
    );
    const firstBody = await firstResponse.json();
    expect(firstResponse.status).toBe(200);
    expect(firstBody.results).toHaveLength(20);
    expect(firstBody.hasMore).toBe(true);
    expect(firstBody.nextCursor).toMatchObject({ id: expect.any(String) });

    const secondResponse = await GET(
      new Request(
        `http://localhost/api/chat/search?channelType=territory&q=local&beforeCreatedAt=${encodeURIComponent(firstBody.nextCursor.createdAt)}&beforeId=${firstBody.nextCursor.id}`,
      ),
    );
    const secondBody = await secondResponse.json();
    expect(secondResponse.status).toBe(200);
    expect(secondBody.results).toHaveLength(1);
    expect(secondBody.results[0].excerpt).toContain("Besoin local");
    expect(secondBody.hasMore).toBe(false);
    expect(supabaseMock.calls.limit).toHaveBeenCalledWith(21);
  });
});
