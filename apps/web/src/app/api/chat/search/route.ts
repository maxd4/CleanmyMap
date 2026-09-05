import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  canAccessChatChannel,
  buildChannelAccessHint,
  extractZoneContextFromMetadata,
  getTerritoryFilter,
  isChatChannelType,
  type ChatChannelType,
  type ZoneContext,
} from "@/lib/chat/channels";
import { getCurrentUserIdentity } from "@/lib/authz";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";
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

type CurrentProfileRow = {
  paris_arrondissement: number | null;
  metadata: Record<string, unknown> | null;
};

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

function buildZoneContext(
  zoneName: string | null,
  arrondissementId: number | null,
): ZoneContext {
  return {
    zoneName: zoneName && findZoneWithNeighbors(zoneName) ? zoneName : null,
    arrondissementId,
  };
}

async function loadCurrentProfile(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  userId: string,
): Promise<CurrentProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("paris_arrondissement, metadata")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CurrentProfileRow | null;
}

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

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  const identity = await getCurrentUserIdentity();
  if (!identity) return unauthorizedJsonResponse();

  const { searchParams } = new URL(request.url);
  const channelTypeRaw = searchParams.get("channelType");
  const channelType = isChatChannelType(channelTypeRaw) ? channelTypeRaw : null;
  const query = normalizeChatSearchQuery(searchParams.get("q"));
  const queryError = getChatSearchQueryError(query);
  const requestedTopicId = searchParams.get("topicId");
  const recipientId = searchParams.get("recipientId")?.trim() || null;
  const beforeCursor = parseChatHistoryCursor(
    searchParams.get("beforeCreatedAt"),
    searchParams.get("beforeId"),
  );

  if (!channelType) {
    return NextResponse.json({ error: "Canal invalide" }, { status: 400 });
  }
  if (queryError) {
    return NextResponse.json(
      { error: "Recherche invalide", hint: queryError },
      { status: 400 },
    );
  }
  if (
    (searchParams.get("beforeCreatedAt") || searchParams.get("beforeId")) &&
    !beforeCursor
  ) {
    return NextResponse.json(
      {
        error: "Curseur invalide",
        hint: "Le curseur doit contenir une date et un identifiant de message valides.",
      },
      { status: 400 },
    );
  }

  const topicId = requestedTopicId
    ? parseChatTopicIdForChannel(channelType, requestedTopicId)
    : null;
  if (requestedTopicId && !topicId) {
    return NextResponse.json(
      { error: "Salon invalide", hint: "Ce salon n'est pas disponible dans ce canal." },
      { status: 400 },
    );
  }

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
    const profile = await loadCurrentProfile(supabase, userId);
    const profileZone = extractZoneContextFromMetadata(profile?.metadata ?? null);
    // The query parameters are navigation hints only. Never let them replace
    // the profile territory used by the authorization and RLS boundary.
    const zoneName = profileZone.zoneName;
    const arrondissementId = profile?.paris_arrondissement ?? profileZone.arrondissementId;
    const zoneContext = buildZoneContext(zoneName, arrondissementId);
    const hasGreaterParisZone = Boolean(zoneName && findZoneWithNeighbors(zoneName));
    const hasArrondissement =
      arrondissementId !== null && arrondissementId >= 1 && arrondissementId <= 20;

    if (
      !canAccessChatChannel(channelType, {
        roleLabel: identity.activeRole,
        hasArrondissement,
        hasGreaterParisZone,
        zoneContext,
      })
    ) {
      return NextResponse.json(
        { error: "Canal inaccessible", hint: buildChannelAccessHint(channelType) },
        { status: 403 },
      );
    }

    if (channelType === "dm" && !recipientId) {
      return NextResponse.json(
        { error: "Destinataire requis", hint: "Choisissez une conversation privée à rechercher." },
        { status: 400 },
      );
    }
    if (channelType === "territory" && !zoneName && !arrondissementId) {
      return NextResponse.json(
        { error: "Zone manquante", hint: "Votre profil ne permet pas encore cette recherche territoriale." },
        { status: 400 },
      );
    }

    const pattern = `%${escapePostgrestLikePattern(query)}%`;
    const createSearchQuery = () =>
      supabase
        .from("app_messages")
        .select(searchSelect)
        .ilike("content", pattern)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
    type SearchScopedQuery = ReturnType<typeof createSearchQuery>;
    const scopeQueryFactories: Array<() => SearchScopedQuery> = [];

    if (channelType === "community") {
      scopeQueryFactories.push(() => {
        let scopedQuery = createSearchQuery().eq("channel_type", "community");
        if (topicId) scopedQuery = scopedQuery.eq("topic_id", topicId);
        return scopedQuery;
      });
    } else if (channelType === "dm") {
      scopeQueryFactories.push(() =>
        createSearchQuery()
          .eq("channel_type", "dm")
          .in("sender_id", [userId, recipientId])
          .in("recipient_id", [userId, recipientId]),
      );
    } else if (channelType === "admin_elu") {
      scopeQueryFactories.push(() => createSearchQuery().eq("channel_type", "admin_elu"));
    } else if (channelType === "territory") {
      const territory = getTerritoryFilter(zoneContext);
      if (zoneName) {
        scopeQueryFactories.push(() => {
          let scopedQuery = createSearchQuery()
            .eq("channel_type", "territory")
            .eq("zone_name", zoneName);
          if (topicId) scopedQuery = scopedQuery.eq("topic_id", topicId);
          return scopedQuery;
        });
      }
      if (territory.zoneNames?.length) {
        scopeQueryFactories.push(() => {
          let scopedQuery = createSearchQuery()
            .eq("channel_type", "territory")
            .in("zone_name", territory.zoneNames ?? []);
          if (topicId) scopedQuery = scopedQuery.eq("topic_id", topicId);
          return scopedQuery;
        });
      }
      if (territory.arrondissementIds?.length) {
        scopeQueryFactories.push(() => {
          let scopedQuery = createSearchQuery()
            .eq("channel_type", "territory")
            .in("arrondissement_id", territory.arrondissementIds ?? []);
          if (topicId) scopedQuery = scopedQuery.eq("topic_id", topicId);
          return scopedQuery;
        });
      }
    } else if (channelType === "bug_report") {
      scopeQueryFactories.push(
        () => createSearchQuery().eq("channel_type", "bug_report").eq("sender_id", userId),
        () => createSearchQuery().eq("channel_type", "bug_report").eq("recipient_id", userId),
      );
    }

    if (scopeQueryFactories.length === 0) {
      return NextResponse.json({ results: [], nextCursor: null, hasMore: false, query });
    }

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

    return NextResponse.json({
      results,
      nextCursor,
      hasMore:
        newestFirst.length > CHAT_SEARCH_PAGE_SIZE ||
        resultGroups.some((group) => group.length > CHAT_SEARCH_PAGE_SIZE),
      query,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/chat/search");
  }
}
