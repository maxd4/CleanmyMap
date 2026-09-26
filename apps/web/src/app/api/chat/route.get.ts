import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  isChatChannelType,
  getTerritoryFilter,
  type ChatChannelType,
} from "@/lib/chat/channels";
import { mergeRowGroupsById } from "@/lib/chat/postgrest";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import {
  CHAT_PAGE_SIZE,
  buildChatHistoryCursor,
  buildInclusiveThroughFilter,
  buildStrictBeforeFilter,
  isChatMessageId,
  parseChatHistoryCursor,
  type ChatHistoryCursor,
} from "@/lib/chat/chat-pagination";
import type { ChatMessageRow, ChatQueryResult } from "./route.shared";
import {
  messageSelect,
  parseArrondissement,
  sortChatMessages,
  applyChatTopicFilter,
  getChatTopicIdsFromValidation,
  getChatTopicRequestParam,
  validateTopicRequestForChannel,
  buildChatDirectScopeFactories,
  validateActionChannelParams,
  buildEmptyChatResponse,
} from "./route.shared";
import {
  enrichPollVoteSummaries,
  loadChatAccessContext,
  runMessageQuery,
} from "./route.data";

type ChatScopedQuery = {
  eq: (column: string, value: unknown) => ChatScopedQuery;
  in: (column: string, values: readonly unknown[]) => ChatScopedQuery;
  or: (filter: string) => ChatScopedQuery;
  limit: (count: number) => ChatQueryResult<ChatMessageRow>;
};
type ChatQueryFactory = () => ChatScopedQuery;

function buildTerritoryScopeQueryFactories({
  createMessageQuery,
  hasExplicitTerritoryContext,
  hasValidZone,
  topicId,
  zoneContext,
  zoneName,
}: {
  createMessageQuery: () => ChatScopedQuery;
  hasExplicitTerritoryContext: boolean;
  hasValidZone: boolean;
  topicId: string | null;
  zoneContext: Parameters<typeof getTerritoryFilter>[0];
  zoneName: string | null;
}): { factories: ChatQueryFactory[]; error: Response | null } {
  if (!hasValidZone) {
    return {
      factories: [],
      error: NextResponse.json(
        {
          error: hasExplicitTerritoryContext ? "Zone invalide" : "Zone manquante",
          hint: hasExplicitTerritoryContext
            ? "Votre zone n'est pas reconnue. Choisissez un arrondissement parisien ou une commune de la région."
            : "Choisissez un arrondissement parisien ou une commune de la région pour ouvrir ce canal.",
        },
        { status: 400 },
      ),
    };
  }

  const territory = getTerritoryFilter(zoneContext);
  const factories: ChatQueryFactory[] = [];
  if (zoneName) {
    factories.push(() => {
      let query = createMessageQuery()
        .eq("channel_type", "territory")
        .eq("zone_name", zoneName);
      if (topicId) query = query.eq("topic_id", topicId);
      return query;
    });
  }
  if (territory.zoneNames && territory.zoneNames.length > 0) {
    factories.push(() => {
      let query = createMessageQuery()
        .eq("channel_type", "territory")
        .in("zone_name", territory.zoneNames ?? []);
      if (topicId) query = query.eq("topic_id", topicId);
      return query;
    });
  }
  if (territory.arrondissementIds && territory.arrondissementIds.length > 0) {
    factories.push(() => {
      let query = createMessageQuery()
        .eq("channel_type", "territory")
        .in("arrondissement_id", territory.arrondissementIds ?? []);
      if (topicId) query = query.eq("topic_id", topicId);
      return query;
    });
  }
  if (factories.length === 0) {
    return {
      factories,
      error: NextResponse.json(
        {
          error: "Zone invalide",
          hint: "Votre zone n'est pas reconnue. Veuillez choisir un arrondissement ou une commune de la région.",
        },
        { status: 400 },
      ),
    };
  }
  return { factories, error: null };
}

function buildChatScopeQueryFactories({
  actionConversationId,
  channelType,
  createMessageQuery,
  hasExplicitTerritoryContext,
  hasValidZone,
  recipientId,
  topicId,
  userId,
  zoneContext,
  zoneName,
}: {
  actionConversationId: string | null;
  channelType: ChatChannelType;
  createMessageQuery: () => ChatScopedQuery;
  hasExplicitTerritoryContext: boolean;
  hasValidZone: boolean;
  recipientId: string | null;
  topicId: string | null;
  userId: string;
  zoneContext: Parameters<typeof getTerritoryFilter>[0];
  zoneName: string | null;
}): { factories: ChatQueryFactory[]; error: Response | null } {
  if (channelType === "community") {
    return {
      factories: [() => {
        let query = createMessageQuery().eq("channel_type", "community");
        if (topicId) query = query.eq("topic_id", topicId);
        return query;
      }],
      error: null,
    };
  }
  if (channelType === "dm" && !recipientId) {
    return {
      factories: [],
      error: NextResponse.json(
        { error: "Destinataire requis", hint: "Choisissez un membre pour charger la conversation privée." },
        { status: 400 },
      ),
    };
  }
  if (channelType === "dm" || channelType === "admin_elu") {
    return {
      factories: buildChatDirectScopeFactories({
        channelType,
        createQuery: createMessageQuery,
        userId,
        recipientId: recipientId ?? "",
        topicId,
      }),
      error: null,
    };
  }
  if (channelType === "territory") {
    return buildTerritoryScopeQueryFactories({
      createMessageQuery,
      hasExplicitTerritoryContext,
      hasValidZone,
      topicId,
      zoneContext,
      zoneName,
    });
  }
  if (channelType === "bug_report") {
    return {
      factories: [
        () => createMessageQuery().eq("channel_type", "bug_report").eq("sender_id", userId),
        () => createMessageQuery().eq("channel_type", "bug_report").eq("recipient_id", userId),
      ],
      error: null,
    };
  }
  if (channelType === "action" && actionConversationId) {
    return {
      factories: [() =>
        createMessageQuery()
          .eq("channel_type", "action")
          .eq("conversation_id", actionConversationId)],
      error: null,
    };
  }
  return { factories: [], error: null };
}

async function resolveActionConversationId({
  channelType,
  requestedActionId,
  supabase,
  userId,
}: {
  channelType: string;
  requestedActionId: string | null;
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>;
  userId: string;
}): Promise<{ id: string | null; error: Response | null }> {
  if (channelType !== "action" || !requestedActionId) {
    return { id: null, error: null };
  }
  const serviceSupabase = getSupabaseServerClient(true);
  const { resolveActionDiscussionAccess } =
    await import("@/lib/chat/action-conversations");
  if (typeof serviceSupabase.from === "function") {
    const access = await resolveActionDiscussionAccess(serviceSupabase, requestedActionId, userId);
    if (access.state === "excluded") {
      return { id: null, error: NextResponse.json({ error: "Vous êtes exclu de cette discussion." }, { status: 403 }) };
    }
    if (access.state === "unavailable") {
      return { id: null, error: NextResponse.json({ error: "Discussion d'action introuvable." }, { status: 404 }) };
    }
  }
  const { data: conversation, error: conversationError } = await supabase
    .from("action_conversations")
    .select("id")
    .eq("action_id", requestedActionId)
    .maybeSingle();
  if (conversationError) throw conversationError;
  const id = typeof conversation?.id === "string" ? conversation.id : null;
  return id
    ? { id, error: null }
    : { id: null, error: NextResponse.json({ error: "Discussion d'action introuvable." }, { status: 404 }) };
}

type ChatGetRequestData = {
  channelType: ChatChannelType;
  recipientId: string | null;
  requestedTopicId: string | null;
  requestedArrondissement: number | null;
  requestedZoneName: string | null;
  requestedMessageId: string | null;
  requestedActionId: string | null;
  beforeCursor: ChatHistoryCursor | null;
};

function parseChatGetRequest(
  request: Request,
): { ok: true; data: ChatGetRequestData } | { ok: false; response: Response } {
  const { searchParams } = new URL(request.url);
  const channelTypeRaw = searchParams.get("channelType");
  const channelType = isChatChannelType(channelTypeRaw) ? channelTypeRaw : null;
  const requestedTopicId = getChatTopicRequestParam(searchParams);
  const requestedArrondissement = parseArrondissement(searchParams.get("arrondissementId"));
  const requestedZoneName = searchParams.get("zoneName")?.trim() || null;
  const requestedMessageId = searchParams.get("messageId")?.trim() || null;
  const requestedActionId = searchParams.get("actionId")?.trim() || null;
  const beforeCreatedAt = searchParams.get("beforeCreatedAt");
  const beforeId = searchParams.get("beforeId");
  const beforeCursor = parseChatHistoryCursor(beforeCreatedAt, beforeId);
  if ((beforeCreatedAt || beforeId) && !beforeCursor) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Curseur invalide", hint: "Le curseur doit contenir une date et un identifiant de message valides." },
        { status: 400 },
      ),
    };
  }
  if (!channelType) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Canal invalide", hint: "Le paramètre channelType doit être renseigné." },
        { status: 400 },
      ),
    };
  }
  const topicValidation = validateTopicRequestForChannel(channelType, requestedTopicId);
  if (requestedTopicId && topicValidation.error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Salon invalide", hint: topicValidation.error },
        { status: 400 },
      ),
    };
  }
  return {
    ok: true,
    data: {
      channelType,
      recipientId: searchParams.get("recipientId"),
      requestedTopicId,
      requestedArrondissement,
      requestedZoneName,
      requestedMessageId,
      requestedActionId,
      beforeCursor,
    },
  };
}

async function resolveChatIdentity(): Promise<
  { userId: string; identity: NonNullable<Awaited<ReturnType<typeof getCurrentUserIdentity>>> } | Response
> {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();
  const identity = await getCurrentUserIdentity();
  if (!identity) return unauthorizedJsonResponse();
  return { userId, identity };
}

export async function GET(request: Request) {
  const requester = await resolveChatIdentity();
  if (requester instanceof Response) return requester;
  const { userId, identity } = requester;

  const parsedRequest = parseChatGetRequest(request);
  if (!parsedRequest.ok) return parsedRequest.response;
  const {
    channelType,
    recipientId,
    requestedTopicId,
    requestedArrondissement,
    requestedZoneName,
    requestedMessageId,
    requestedActionId,
    beforeCursor,
  } = parsedRequest.data;
  const topicValidation = validateTopicRequestForChannel(channelType, requestedTopicId);
  const topicId = topicValidation.topicId;
  const topicIds = getChatTopicIdsFromValidation(topicValidation);

  const actionChannelError = validateActionChannelParams(channelType, requestedActionId);
  if (actionChannelError) return actionChannelError;

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

  const accessContext = await loadChatAccessContext(supabase, userId, {
    requestedZoneName,
    requestedArrondissement,
    channelType,
    roleLabel: identity.activeRole,
  });
  if (accessContext.error) return accessContext.error;
  const {
    hasExplicitTerritoryContext,
    zoneContext,
    zoneName,
    hasValidZone,
  } = accessContext;

  try {
    const actionConversation = await resolveActionConversationId({
      channelType,
      requestedActionId,
      supabase,
      userId,
    });
    if (actionConversation.error) return actionConversation.error;

    const createMessageQuery = (): ChatScopedQuery =>
      applyChatTopicFilter(supabase
        .from("app_messages")
        .select(messageSelect)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }), topicIds) as unknown as ChatScopedQuery;
    const scope = buildChatScopeQueryFactories({
      actionConversationId: actionConversation.id,
      channelType,
      createMessageQuery,
      hasExplicitTerritoryContext,
      hasValidZone,
      recipientId,
      topicId,
      userId,
      zoneContext,
      zoneName,
    });
    if (scope.error) return scope.error;
    const scopeQueryFactories = scope.factories;

    if (scopeQueryFactories.length === 0) {
      return buildEmptyChatResponse(requestedMessageId);
    }

    let targetCursor: ChatHistoryCursor | null = null;
    let targetFound = false;
    if (requestedMessageId && isChatMessageId(requestedMessageId)) {
      const targetGroups = await Promise.all(
        scopeQueryFactories.map((factory) =>
          runMessageQuery(factory().eq("id", requestedMessageId).limit(1)),
        ),
      );
      const targetRows = mergeRowGroupsById(targetGroups);
      const target = sortChatMessages(targetRows)[0];
      if (target) {
        targetFound = true;
        targetCursor = buildChatHistoryCursor(target);
      }
    }

    const pageGroups = await Promise.all(
      scopeQueryFactories.map((factory) => {
        let query = factory();
        if (targetCursor) {
          query = query.or(buildInclusiveThroughFilter(targetCursor));
        } else if (beforeCursor) {
          query = query.or(buildStrictBeforeFilter(beforeCursor));
        }
        return runMessageQuery(query.limit(CHAT_PAGE_SIZE + 1));
      }),
    );

    const mergedRows = mergeRowGroupsById(pageGroups);
    const newestFirst = sortChatMessages(mergedRows).reverse();
    const pageRows = newestFirst.slice(0, CHAT_PAGE_SIZE);
    const hasMore =
      newestFirst.length > CHAT_PAGE_SIZE ||
      pageGroups.some((group) => group.length > CHAT_PAGE_SIZE);
    const messages = await enrichPollVoteSummaries(
      supabase,
      getSupabaseServerClient(true),
      userId,
      sortChatMessages(pageRows),
    );
    const previousCursor = messages[0]
      ? buildChatHistoryCursor(messages[0])
      : null;

    return NextResponse.json({
      messages,
      previousCursor,
      hasMore,
      ...(requestedMessageId
        ? {
            targetMessageId: requestedMessageId,
            targetStatus: targetFound ? ("found" as const) : ("unavailable" as const),
          }
        : {}),
    });
  } catch (error) {
    console.error("[GET /api/chat] Database Error:", error);
    const dbError = error as {
      message?: string;
      code?: string;
      details?: string;
    };
    return NextResponse.json(
      {
        error: "Erreur Base de Données",
        message: dbError.message ?? "Erreur inconnue",
        code: dbError.code,
        details: dbError.details,
        hint:
          channelType === "territory" && !hasValidZone
            ? "Choisissez un arrondissement parisien ou une commune de la région."
            : "Vérifiez que la table 'app_messages' existe et que les profils sont synchronisés.",
      },
      { status: 500 },
    );
  }
}
