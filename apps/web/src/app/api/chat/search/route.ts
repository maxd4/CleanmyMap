import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getTerritoryFilter,
  isChatChannelType,
  type ChatChannelType,
} from "@/lib/chat/channels";
import { getCurrentUserIdentity } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { handleApiError } from "@/lib/http/api-errors";
import { mergeRowGroupsById, sortByCreatedAtAsc } from "@/lib/chat/postgrest";
import { escapePostgrestLikePattern } from "@/lib/chat/postgrest";
import {
  buildChatHistoryCursor,
  buildStrictBeforeFilter,
  parseChatHistoryCursor,
} from "@/lib/chat/chat-pagination";
import {
  buildChatMessageExcerpt,
  CHAT_SEARCH_PAGE_SIZE,
  getChatSearchQueryError,
  normalizeChatSearchQuery,
  type ChatSearchResult,
} from "@/lib/chat/chat-search";
import { isChatMessageKind, type ChatMessageKind } from "@/lib/chat/announcements";
import { parseChatTopicIdForChannel } from "@/lib/chat/topics";
import { loadChatAccessContext } from "../route.data";
import {
  parseArrondissement,
  applyChatTopicFilter,
  resolveChatTopicRequest,
  buildChatDirectScopeFactories,
} from "../route.shared";

type SearchMessageRow = {
  id: string;
  created_at: string;
  content: string;
  channel_type: ChatChannelType;
  topic_id: string | null;
  message_kind: string | null;
  sender?: {
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  } | Array<{
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  }> | null;
};

type SearchQueryResult = PromiseLike<{
  data: SearchMessageRow[] | null;
  error: { message: string; code?: string; details?: string } | null;
}>;

const searchSelect =
  "id, created_at, content, channel_type, topic_id, message_kind, sender:profiles!sender_id(display_name, handle, avatar_url)";

async function runSearchQuery(query: SearchQueryResult): Promise<SearchMessageRow[]> {
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SearchMessageRow[];
}

function toSearchResult(row: SearchMessageRow, query: string): ChatSearchResult {
  const sender = Array.isArray(row.sender) ? row.sender[0] ?? null : row.sender ?? null;
  const messageKind: ChatMessageKind = isChatMessageKind(row.message_kind)
    ? row.message_kind
    : "message";
  return {
    messageId: row.id,
    excerpt: buildChatMessageExcerpt(row.content, query),
    author: {
      displayName: sender?.display_name?.trim() || "Membre",
      handle: sender?.handle?.trim() || "membre",
      avatarUrl: sender?.avatar_url ?? null,
    },
    createdAt: row.created_at,
    channelType: row.channel_type,
    messageKind,
    topicId: parseChatTopicIdForChannel(row.channel_type, row.topic_id),
  };
}

type SearchScopedQuery = SearchQueryResult & {
  eq: (field: string, value: unknown) => SearchScopedQuery;
  in: (field: string, values: readonly unknown[]) => SearchScopedQuery;
  or: (expression: string) => SearchScopedQuery;
  limit: (count: number) => SearchScopedQuery;
};
type SearchSupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>;

type SearchRequest = {
  channelType: ChatChannelType;
  query: string;
  topicId: string | null;
  topicRequest: ReturnType<typeof resolveChatTopicRequest>;
  recipientId: string | null;
  requestedZoneName: string | null;
  requestedArrondissement: ReturnType<typeof parseArrondissement>;
  beforeCursor: ReturnType<typeof parseChatHistoryCursor>;
};

function parseSearchRequest(request: Request): SearchRequest | { response: NextResponse } {
  const { searchParams } = new URL(request.url);
  const channelTypeRaw = searchParams.get("channelType");
  const channelType = isChatChannelType(channelTypeRaw) ? channelTypeRaw : null;
  const query = normalizeChatSearchQuery(searchParams.get("q"));
  const queryError = getChatSearchQueryError(query);
  const requestedTopicId = searchParams.get("topicId");
  const recipientId = searchParams.get("recipientId")?.trim() || null;
  const requestedZoneName = searchParams.get("zoneName")?.trim() || null;
  const requestedArrondissement = parseArrondissement(searchParams.get("arrondissementId"));
  const beforeCursor = parseChatHistoryCursor(
    searchParams.get("beforeCreatedAt"),
    searchParams.get("beforeId"),
  );

  if (!channelType) {
    return { response: NextResponse.json({ error: "Canal invalide" }, { status: 400 }) };
  }
  if (queryError) {
    return {
      response: NextResponse.json(
        { error: "Recherche invalide", hint: queryError },
        { status: 400 },
      ),
    };
  }
  if (
    (searchParams.get("beforeCreatedAt") || searchParams.get("beforeId")) &&
    !beforeCursor
  ) {
    return {
      response: NextResponse.json(
        {
          error: "Curseur invalide",
          hint: "Le curseur doit contenir une date et un identifiant de message valides.",
        },
        { status: 400 },
      ),
    };
  }

  const topicRequest = resolveChatTopicRequest(channelType, searchParams, requestedTopicId);
  if (topicRequest.error) {
    return {
      response: NextResponse.json(
        { error: "Salon invalide", hint: "Ce salon n'est pas disponible dans ce canal." },
        { status: 400 },
      ),
    };
  }

  return {
    channelType,
    query,
    topicId: topicRequest.topicId,
    topicRequest,
    recipientId,
    requestedZoneName,
    requestedArrondissement,
    beforeCursor,
  };
}

async function loadSearchAccessContext(
  supabase: SearchSupabaseClient,
  userId: string,
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>,
  search: SearchRequest,
): Promise<{
  error: NextResponse | null;
  zoneContext: Awaited<ReturnType<typeof loadChatAccessContext>>["zoneContext"];
  zoneName: string | null;
}> {
  const accessContext = await loadChatAccessContext(supabase, userId, {
    requestedZoneName: search.requestedZoneName,
    requestedArrondissement: search.requestedArrondissement,
    channelType: search.channelType,
    roleLabel: identity?.activeRole,
  });
  if (accessContext.error) {
    return {
      error: accessContext.error,
      zoneContext: accessContext.zoneContext,
      zoneName: accessContext.zoneName,
    };
  }
  if (search.channelType === "dm" && !search.recipientId) {
    return {
      error: NextResponse.json(
        { error: "Destinataire requis", hint: "Choisissez une conversation privée à rechercher." },
        { status: 400 },
      ),
      zoneContext: accessContext.zoneContext,
      zoneName: accessContext.zoneName,
    };
  }
  if (search.channelType === "territory" && !accessContext.hasValidZone) {
    return {
      error: NextResponse.json(
        {
          error: accessContext.hasExplicitTerritoryContext ? "Zone invalide" : "Zone manquante",
          hint: accessContext.hasExplicitTerritoryContext
            ? "Votre zone n'est pas reconnue. Choisissez un arrondissement parisien ou une commune de la région."
            : "Choisissez un arrondissement parisien ou une commune de la région pour rechercher dans ce fil.",
        },
        { status: 400 },
      ),
      zoneContext: accessContext.zoneContext,
      zoneName: accessContext.zoneName,
    };
  }
  return { error: null, zoneContext: accessContext.zoneContext, zoneName: accessContext.zoneName };
}

function buildScopeQueryFactories({
  supabase,
  search,
  userId,
  zoneContext,
  zoneName,
}: {
  supabase: SearchSupabaseClient;
  search: SearchRequest;
  userId: string;
  zoneContext: Parameters<typeof getTerritoryFilter>[0];
  zoneName: string | null;
}): Array<() => SearchScopedQuery> {
  const pattern = `%${escapePostgrestLikePattern(search.query)}%`;
  const createSearchQuery = (): SearchScopedQuery => {
    const query = supabase
      .from("app_messages")
      .select(searchSelect)
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }) as unknown as SearchScopedQuery;
    return applyChatTopicFilter<SearchScopedQuery>(query, search.topicRequest.topicIds);
  };
  const scopeQueryFactories: Array<() => SearchScopedQuery> = [];

  if (search.channelType === "community") {
    scopeQueryFactories.push(() => {
      let scopedQuery = createSearchQuery().eq("channel_type", "community");
      if (search.topicId) scopedQuery = scopedQuery.eq("topic_id", search.topicId);
      return scopedQuery;
    });
  } else if (search.channelType === "dm" || search.channelType === "admin_elu") {
    scopeQueryFactories.push(...buildChatDirectScopeFactories({
      channelType: search.channelType,
      createQuery: createSearchQuery,
      userId,
      recipientId: search.recipientId ?? "",
      topicId: search.topicId,
    }));
  } else if (search.channelType === "territory") {
    const territory = getTerritoryFilter(zoneContext);
    if (zoneName) {
      scopeQueryFactories.push(() => {
        let scopedQuery = createSearchQuery()
          .eq("channel_type", "territory")
          .eq("zone_name", zoneName);
        if (search.topicId) scopedQuery = scopedQuery.eq("topic_id", search.topicId);
        return scopedQuery;
      });
    }
    if (territory.zoneNames?.length) {
      scopeQueryFactories.push(() => {
        let scopedQuery = createSearchQuery()
          .eq("channel_type", "territory")
          .in("zone_name", territory.zoneNames ?? []);
        if (search.topicId) scopedQuery = scopedQuery.eq("topic_id", search.topicId);
        return scopedQuery;
      });
    }
    if (territory.arrondissementIds?.length) {
      scopeQueryFactories.push(() => {
        let scopedQuery = createSearchQuery()
          .eq("channel_type", "territory")
          .in("arrondissement_id", territory.arrondissementIds ?? []);
        if (search.topicId) scopedQuery = scopedQuery.eq("topic_id", search.topicId);
        return scopedQuery;
      });
    }
  } else if (search.channelType === "bug_report") {
    scopeQueryFactories.push(
      () => createSearchQuery().eq("channel_type", "bug_report").eq("sender_id", userId),
      () => createSearchQuery().eq("channel_type", "bug_report").eq("recipient_id", userId),
    );
  }

  return scopeQueryFactories;
}

async function executeSearch(
  scopeQueryFactories: Array<() => SearchScopedQuery>,
  beforeCursor: SearchRequest["beforeCursor"],
  query: string,
) {
  const resultGroups = await Promise.all(
    scopeQueryFactories.map((factory) => {
      let scopedQuery = factory();
      if (beforeCursor) scopedQuery = scopedQuery.or(buildStrictBeforeFilter(beforeCursor));
      return runSearchQuery(scopedQuery.limit(CHAT_SEARCH_PAGE_SIZE + 1));
    }),
  );
  const mergedRows = mergeRowGroupsById(resultGroups);
  const newestFirst = sortByCreatedAtAsc(mergedRows).reverse();
  const pageRows = newestFirst.slice(0, CHAT_SEARCH_PAGE_SIZE);
  const results = pageRows.map((row) => toSearchResult(row, query));
  const nextCursor = pageRows.at(-1)
    ? buildChatHistoryCursor(pageRows.at(-1) as SearchMessageRow)
    : null;
  return {
    results,
    nextCursor,
    hasMore:
      newestFirst.length > CHAT_SEARCH_PAGE_SIZE ||
      resultGroups.some((group) => group.length > CHAT_SEARCH_PAGE_SIZE),
  };
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  const identity = await getCurrentUserIdentity();
  if (!identity) return unauthorizedJsonResponse();

  const search = parseSearchRequest(request);
  if ("response" in search) return search.response;

  const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error: "Connexion sécurisée indisponible",
        hint: "Activez l'intégration native Clerk/Supabase dans Supabase et vérifiez que la session Clerk est disponible.",
      },
      { status: 503 },
    );
  }

  try {
    // Les garde-fous de canal restent portés par loadChatAccessContext,
    // getTerritoryFilter, buildChatDirectScopeFactories et applyChatTopicFilter;
    // sender_id/recipient_id bornent la propriété des messages.
    const accessContext = await loadSearchAccessContext(supabase, userId, identity, search);
    if (accessContext.error) return accessContext.error;
    const { zoneContext, zoneName } = accessContext;

    const scopeQueryFactories = buildScopeQueryFactories({
      supabase,
      search,
      userId,
      zoneContext,
      zoneName,
    });

    if (scopeQueryFactories.length === 0) {
      return NextResponse.json({ results: [], nextCursor: null, hasMore: false, query: search.query });
    }

    const response = await executeSearch(scopeQueryFactories, search.beforeCursor, search.query);
    return NextResponse.json({ ...response, query: search.query });
  } catch (error) {
    return handleApiError(error, "GET /api/chat/search");
  }
}
