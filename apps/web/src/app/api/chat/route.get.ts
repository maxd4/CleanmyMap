import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  canAccessChatChannel,
  isChatChannelType,
  getTerritoryFilter,
  buildChannelAccessHint,
  extractZoneContextFromMetadata,
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
import {
  buildZoneContext,
  hasValidTerritoryContext,
  messageSelect,
  parseArrondissement,
  sortChatMessages,
  validateTopicForChannel,
} from "./route.shared";
import {
  enrichPollVoteSummaries,
  loadCurrentProfile,
  runMessageQuery,
} from "./route.data";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  const identity = await getCurrentUserIdentity();
  if (!identity) return unauthorizedJsonResponse();

  const { searchParams } = new URL(request.url);
  const channelTypeRaw = searchParams.get("channelType");
  const channelType = isChatChannelType(channelTypeRaw) ? channelTypeRaw : null;
  const recipientId = searchParams.get("recipientId");
  const requestedTopicId = searchParams.get("topicId");
  const requestedArrondissement = parseArrondissement(searchParams.get("arrondissementId"));
  const requestedZoneName = searchParams.get("zoneName")?.trim() || null;
  const requestedMessageId = searchParams.get("messageId")?.trim() || null;
  const requestedActionId = searchParams.get("actionId")?.trim() || null;
  const beforeCreatedAt = searchParams.get("beforeCreatedAt");
  const beforeId = searchParams.get("beforeId");
  const beforeCursor = parseChatHistoryCursor(beforeCreatedAt, beforeId);

  if ((beforeCreatedAt || beforeId) && !beforeCursor) {
    return NextResponse.json(
      {
        error: "Curseur invalide",
        hint: "Le curseur doit contenir une date et un identifiant de message valides.",
      },
      { status: 400 },
    );
  }

  if (!channelType) {
    return NextResponse.json(
      {
        error: "Canal invalide",
        hint: "Le paramètre channelType doit être renseigné.",
      },
      { status: 400 },
    );
  }

  const topicValidation = validateTopicForChannel(channelType, requestedTopicId);
  if (requestedTopicId && topicValidation.error) {
    return NextResponse.json(
      {
        error: "Salon invalide",
        hint: topicValidation.error,
      },
      { status: 400 },
    );
  }
  const topicId = topicValidation.topicId;

  if (channelType === "action" && !requestedActionId) {
    return NextResponse.json(
      { error: "Action requise", hint: "Sélectionnez une action publiée." },
      { status: 400 },
    );
  }
  if (channelType !== "action" && requestedActionId) {
    return NextResponse.json(
      { error: "Paramètre action invalide", hint: "actionId est réservé au canal action." },
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

  const profile = await loadCurrentProfile(supabase, userId);
  const profileMetadataZone = extractZoneContextFromMetadata(profile?.metadata ?? null);
  const profileArrondissement = profile?.paris_arrondissement ?? null;

  const hasExplicitTerritoryContext =
    requestedZoneName !== null || requestedArrondissement !== null;
  const profileZoneContext = buildZoneContext(
    profileMetadataZone.zoneName,
    profileArrondissement ?? profileMetadataZone.arrondissementId,
  );
  const requestedZoneContext = hasExplicitTerritoryContext
    ? buildZoneContext(requestedZoneName, requestedArrondissement)
    : null;
  const zoneContext = requestedZoneContext ?? profileZoneContext;
  const zoneName = zoneContext.zoneName;
  const arrondissementId = zoneContext.arrondissementId;
  const hasValidZone = hasValidTerritoryContext(zoneContext);

  const hasGreaterParisZone = zoneName !== null;
  const hasArrondissement = arrondissementId !== null && arrondissementId >= 1 && arrondissementId <= 20;

  if (
    !canAccessChatChannel(channelType, {
      roleLabel: identity.activeRole,
      hasArrondissement,
      hasGreaterParisZone,
      zoneContext,
    })
  ) {
    return NextResponse.json(
      {
        error: "Canal inaccessible",
        hint: buildChannelAccessHint(channelType),
      },
      { status: 403 },
    );
  }

  try {
    let actionConversationId: string | null = null;
    if (channelType === "action" && requestedActionId) {
      const serviceSupabase = getSupabaseServerClient();
      const { resolveActionDiscussionAccess } =
        await import("@/lib/chat/action-conversations");
      // The service preflight gives excluded users a stable explicit state;
      // RLS remains the final authority for the actual message query.
      if (typeof serviceSupabase.from === "function") {
        const access = await resolveActionDiscussionAccess(serviceSupabase, requestedActionId, userId);
        if (access.state === "excluded") {
          return NextResponse.json({ error: "Vous êtes exclu de cette discussion." }, { status: 403 });
        }
        if (access.state === "unavailable") {
          return NextResponse.json({ error: "Discussion d'action introuvable." }, { status: 404 });
        }
      }
      const { data: conversation, error: conversationError } = await supabase
        .from("action_conversations")
        .select("id")
        .eq("action_id", requestedActionId)
        .maybeSingle();
      if (conversationError) throw conversationError;
      actionConversationId = typeof conversation?.id === "string" ? conversation.id : null;
      if (!actionConversationId) {
        return NextResponse.json(
          { error: "Discussion d'action introuvable." },
          { status: 404 },
        );
      }
    }

    const createMessageQuery = () =>
      supabase
        .from("app_messages")
        .select(messageSelect)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
    type ChatScopedQuery = ReturnType<typeof createMessageQuery>;
    const scopeQueryFactories: Array<() => ChatScopedQuery> = [];

    if (channelType === "community") {
      scopeQueryFactories.push(() => {
        let query = createMessageQuery().eq("channel_type", "community");
        if (topicId) {
          query = query.eq("topic_id", topicId);
        }
        return query;
      });
    } else if (channelType === "dm") {
      if (!recipientId) {
        return NextResponse.json(
          {
            error: "Destinataire requis",
            hint: "Choisissez un membre pour charger la conversation privée.",
          },
          { status: 400 },
        );
      }

      scopeQueryFactories.push(() =>
        createMessageQuery()
          .eq("channel_type", "dm")
          .in("sender_id", [userId, recipientId])
          .in("recipient_id", [userId, recipientId]),
      );
    } else if (channelType === "admin_elu") {
      scopeQueryFactories.push(() => {
        let query = createMessageQuery().eq("channel_type", "admin_elu");
        if (topicId) {
          query = query.eq("topic_id", topicId);
        }
        return query;
      });
    } else if (channelType === "territory") {
      if (!hasValidZone) {
        return NextResponse.json(
          {
            error: hasExplicitTerritoryContext ? "Zone invalide" : "Zone manquante",
            hint: hasExplicitTerritoryContext
              ? "Votre zone n'est pas reconnue. Choisissez un arrondissement parisien ou une commune de la région."
              : "Choisissez un arrondissement parisien ou une commune de la région pour ouvrir ce canal.",
          },
          { status: 400 },
        );
      }

      const territory = getTerritoryFilter(zoneContext);

      if (zoneName) {
        scopeQueryFactories.push(() => {
          let query = createMessageQuery()
            .eq("channel_type", "territory")
            .eq("zone_name", zoneName);
          if (topicId) {
            query = query.eq("topic_id", topicId);
          }
          return query;
        });
      }
      if (territory.zoneNames && territory.zoneNames.length > 0) {
        scopeQueryFactories.push(() => {
          let query = createMessageQuery()
            .eq("channel_type", "territory")
            .in("zone_name", territory.zoneNames ?? []);
          if (topicId) {
            query = query.eq("topic_id", topicId);
          }
          return query;
        });
      }
      if (territory.arrondissementIds && territory.arrondissementIds.length > 0) {
        scopeQueryFactories.push(() => {
          let query = createMessageQuery()
            .eq("channel_type", "territory")
            .in("arrondissement_id", territory.arrondissementIds ?? []);
          if (topicId) {
            query = query.eq("topic_id", topicId);
          }
          return query;
        });
      }

      if (scopeQueryFactories.length === 0) {
        return NextResponse.json(
          {
            error: "Zone invalide",
            hint: "Votre zone n'est pas reconnue. Veuillez choisir un arrondissement parisien ou une commune de la région.",
          },
          { status: 400 },
        );
      }
    } else if (channelType === "bug_report") {
      scopeQueryFactories.push(
        () => createMessageQuery().eq("channel_type", "bug_report").eq("sender_id", userId),
        () => createMessageQuery().eq("channel_type", "bug_report").eq("recipient_id", userId),
      );
    } else if (channelType === "action" && actionConversationId) {
      scopeQueryFactories.push(() =>
        createMessageQuery()
          .eq("channel_type", "action")
          .eq("conversation_id", actionConversationId),
      );
    }

    if (scopeQueryFactories.length === 0) {
      return NextResponse.json({
        messages: [],
        previousCursor: null,
        hasMore: false,
        ...(requestedMessageId ? {
          targetMessageId: requestedMessageId,
          targetStatus: "unavailable" as const,
        } : {}),
      });
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
      getSupabaseServerClient(),
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
