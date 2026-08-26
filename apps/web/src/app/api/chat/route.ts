import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";
import { extractArrondissementFromLabel } from "@/lib/geo/paris-arrondissements";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  canAccessChatChannel,
  isChatChannelType,
  type ChatChannelType,
  getTerritoryFilter,
  buildChannelAccessHint,
  extractZoneContextFromMetadata,
  type ZoneContext,
} from "@/lib/chat/channels";
import {
  isChatTopicId,
  isChatTopicAllowedForChannel,
  type ChatTopicId,
} from "@/lib/chat/topics";
import {
  CHAT_MESSAGE_KINDS,
  isCommunityAnnouncementTopicId,
  type ChatMessageKind,
  type ChatRelatedEvent,
} from "@/lib/chat/announcements";
import {
  getChatPollOptionsValidationError,
  normalizeChatPollOptionLabels,
  type ChatPollOption,
} from "@/lib/chat/polls";
import {
  isSafeChatAttachmentUrl,
  isSupportedChatAttachmentMimeType,
} from "@/lib/chat/chat-attachments";
import { createChatNotificationsForMessage } from "@/lib/chat/chat-notifications";
import { mergeRowGroupsById, sortByCreatedAtAsc } from "@/lib/chat/postgrest";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import {
  reserveDiscussionMessageSlot,
  toDiscussionRateLimitErrorPayload,
} from "@/lib/community/discussion-rate-limit";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { requireBotIdHuman } from "@/lib/botid/server";

const CHANNEL_TYPES = [
  "community",
  "dm",
  "admin_elu",
  "territory",
  "bug_report",
] as const satisfies readonly ChatChannelType[];

const sendMessageSchema = z.object({
  channelType: z.enum(CHANNEL_TYPES),
  content: z.string().min(1).max(2000),
  messageKind: z.enum(CHAT_MESSAGE_KINDS).optional().default("message"),
  pollOptions: z.array(z.string()).optional(),
  relatedEventId: z.string().uuid().optional(),
  topicId: z.string().optional(),
  recipientId: z.string().optional(),
  arrondissementId: z.number().int().min(1).max(20).optional(),
  zoneName: z.string().optional(),
  attachmentUrl: z
    .string()
    .trim()
    .url()
    .refine(isSafeChatAttachmentUrl, {
      message: "L'URL de la pièce jointe doit utiliser http(s).",
    })
    .optional(),
  attachmentType: z.string().optional(),
});

type CurrentProfileRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
  paris_arrondissement: number | null;
  role_label: string | null;
  metadata: Record<string, unknown> | null;
};

type ChatMessageRow = {
  id: string;
  created_at: string;
  [key: string]: unknown;
};

function validateTopicForChannel(
  channelType: ChatChannelType,
  topicId: string | null | undefined,
): { topicId: ChatTopicId | null; error?: string } {
  if (!topicId) {
    return { topicId: null };
  }

  if (!isChatTopicId(topicId)) {
    return { topicId: null, error: "Salon inconnu." };
  }

  if (!isChatTopicAllowedForChannel(channelType, topicId)) {
    return { topicId: null, error: "Ce salon n'est pas disponible dans ce canal." };
  }

  return { topicId };
}

function validateMessageKind(
  channelType: ChatChannelType,
  messageKind: ChatMessageKind,
  topicId: ChatTopicId | null,
  relatedEventId: string | undefined,
  attachmentUrl: string | undefined,
  pollOptions: string[] | undefined,
): { error?: string } {
  if (messageKind === "message") {
    if (relatedEventId || pollOptions !== undefined) {
      return { error: "Un message standard ne peut pas contenir de contexte de sondage ou d'événement." };
    }
    return {};
  }

  if (messageKind === "announcement") {
    if (pollOptions !== undefined) {
      return { error: "Une annonce ne peut pas contenir d'options de sondage." };
    }

    if (channelType !== "community") {
      return { error: "Les annonces sont disponibles uniquement dans la communauté." };
    }

    if (!topicId || !isCommunityAnnouncementTopicId(topicId)) {
      return { error: "Choisissez un modèle d'annonce compatible avec la communauté." };
    }

    return {};
  }

  if (channelType !== "community") {
    return { error: "Les sondages sont disponibles uniquement dans la communauté." };
  }

  if (relatedEventId || attachmentUrl) {
    return { error: "Un sondage ne peut pas contenir de pièce jointe ou d'événement." };
  }

  const pollOptionsError = getChatPollOptionsValidationError(pollOptions ?? []);
  if (pollOptionsError) {
    return { error: pollOptionsError };
  }

  return {};
}

type ChatQueryResult<T> = PromiseLike<{
  data: T[] | null;
  error: {
    message: string;
    code?: string;
    details?: string;
  } | null;
}>;

const messageSelect =
  "*, sender:profiles!sender_id(display_name, handle, avatar_url), related_event:community_events!related_event_id(id, title, event_date, location_label), poll_options:chat_poll_options(id, position, label)";

type RelatedCommunityEventRow = ChatRelatedEvent;

function normalizeChatMessageRow(row: ChatMessageRow): ChatMessageRow {
  const pollOptions = Array.isArray(row.poll_options)
    ? [...(row.poll_options as ChatPollOption[])].sort(
        (left, right) => left.position - right.position,
      )
    : [];

  return {
    ...row,
    poll_options: pollOptions,
  };
}

function sortChatMessages(rows: ChatMessageRow[]): ChatMessageRow[] {
  return sortByCreatedAtAsc(rows.map(normalizeChatMessageRow));
}

async function runMessageQuery(query: ChatQueryResult<ChatMessageRow>): Promise<ChatMessageRow[]> {
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data ?? []) as ChatMessageRow[];
}

function parseArrondissement(raw: string | null): number | null {
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    return null;
  }

  return parsed;
}

async function loadCurrentProfile(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  userId: string,
): Promise<CurrentProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, handle, paris_arrondissement, role_label, metadata")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as CurrentProfileRow | null;
}

async function loadRelatedCommunityEvent(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  eventId: string,
): Promise<RelatedCommunityEventRow | null> {
  const { data, error } = await supabase
    .from("community_events")
    .select("id, title, event_date, location_label")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as RelatedCommunityEventRow | null;
}

async function loadMessageById(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  messageId: string,
): Promise<ChatMessageRow | null> {
  const { data, error } = await supabase
    .from("app_messages")
    .select(messageSelect)
    .eq("id", messageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeChatMessageRow(data as ChatMessageRow) : null;
}

async function resolveBugReportRecipientId(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  senderId: string,
  senderRole: string,
): Promise<string | null> {
  const { data: maxData, error: maxError } = await supabase
    .from("profiles")
    .select("id")
    .in("role_label", ["imu", "max"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (maxError) {
    throw maxError;
  }

  if (maxData?.id) {
    return maxData.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role_label", "admin")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  if (data?.id) {
    return data.id;
  }

  if (senderRole === "admin" || senderRole === "max") {
    return senderId;
  }

  return null;
}

function buildZoneContext(
  zoneName: string | null,
  arrondissementId: number | null,
): ZoneContext {
  return {
    zoneName: zoneName && findZoneWithNeighbors(zoneName) ? zoneName : null,
    arrondissementId,
  };
}

export async function POST(request: Request) {
  const botIdResponse = await requireBotIdHuman();
  if (botIdResponse) return botIdResponse;

  const writeRateLimit = await verifyRateLimit(request, { limit: 20, window: 60 });
  const writeRateLimitResponse = createServerRateLimitResponse(
    writeRateLimit.allowed,
    writeRateLimit.retryAfter,
    writeRateLimit,
  );
  if (writeRateLimitResponse) {
    return writeRateLimitResponse;
  }

  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  const identity = await getCurrentUserIdentity();
  if (!identity) return unauthorizedJsonResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  const topicValidation = validateTopicForChannel(
    parsed.data.channelType,
    parsed.data.topicId,
  );
  if (topicValidation.error) {
    return NextResponse.json(
      {
        error: "Salon invalide",
        hint: topicValidation.error,
      },
      { status: 400 },
    );
  }

  const messageKind = parsed.data.messageKind;
  const messageKindValidation = validateMessageKind(
    parsed.data.channelType,
    messageKind,
    topicValidation.topicId,
    parsed.data.relatedEventId,
    parsed.data.attachmentUrl,
    parsed.data.pollOptions,
  );
  if (messageKindValidation.error) {
    return NextResponse.json(
      {
        error: "Type de message invalide",
        hint: messageKindValidation.error,
      },
      { status: 400 },
    );
  }

  if (parsed.data.attachmentUrl) {
    if (!parsed.data.attachmentType) {
      return validationErrorResponse({
        attachmentType: [
          "Le type de la pièce jointe est requis quand un fichier est envoyé.",
        ],
      });
    }

    if (!isSupportedChatAttachmentMimeType(parsed.data.attachmentType)) {
      return validationErrorResponse({
        attachmentType: [
          "Ce format de pièce jointe n'est pas autorisé. Utilisez une image, un PDF ou un document courant.",
        ],
      });
    }
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
    const serviceSupabase = getSupabaseServerClient();

    const quota = await reserveDiscussionMessageSlot(serviceSupabase, {
      userId,
      channel: parsed.data.channelType === "bug_report" ? "bug_report" : "discussion_event",
    });
    if (!quota.allowed) {
      return NextResponse.json(toDiscussionRateLimitErrorPayload(quota), { status: 429 });
    }

    const profile = await loadCurrentProfile(supabase, userId);
    const metadataZone = extractZoneContextFromMetadata(profile?.metadata ?? null);
    const parsedArr = parseArrondissement(parsed.data.arrondissementId?.toString() ?? null);
    const profileArrondissement = profile?.paris_arrondissement ?? parsedArr;

    const zoneName = parsed.data.zoneName?.trim() || metadataZone.zoneName;
    const inferredZoneArrondissement = zoneName ? extractArrondissementFromLabel(zoneName) : null;
    const arrondissementId =
      parsed.data.arrondissementId ?? profileArrondissement ?? inferredZoneArrondissement;
    const zoneContext = buildZoneContext(zoneName, arrondissementId);
    const arrondissementLabel =
      !zoneName && arrondissementId && arrondissementId >= 1 && arrondissementId <= 20
        ? `${arrondissementId}e arrondissement`
        : null;

    const hasGreaterParisZone =
      (zoneName && findZoneWithNeighbors(zoneName)) !== null || arrondissementLabel !== null;
    const hasArrondissement = arrondissementId !== null && arrondissementId >= 1 && arrondissementId <= 20;

    if (
      !canAccessChatChannel(parsed.data.channelType, {
        roleLabel: identity.role,
        hasArrondissement,
        hasGreaterParisZone,
        zoneContext,
      })
    ) {
      return NextResponse.json(
        {
          error: "Canal indisponible",
          hint: buildChannelAccessHint(parsed.data.channelType),
        },
        { status: 403 },
      );
    }

    let recipientId: string | null = null;
    let targetArrondissementId: number | null = null;
    let targetZoneName: string | null = null;
    let relatedEvent: RelatedCommunityEventRow | null = null;

    if (parsed.data.relatedEventId) {
      relatedEvent = await loadRelatedCommunityEvent(
        supabase,
        parsed.data.relatedEventId,
      );
      if (!relatedEvent) {
        return NextResponse.json(
          {
            error: "Événement introuvable",
            hint: "Le cleanup associé n'est plus disponible ou n'est pas accessible.",
          },
          { status: 400 },
        );
      }
    }

    switch (parsed.data.channelType) {
      case "dm": {
        recipientId = parsed.data.recipientId?.trim() ?? null;
        if (!recipientId) {
          return NextResponse.json(
            {
              error: "Destinataire requis",
              hint: "Choisissez un membre avant d'envoyer un message privé.",
            },
            { status: 400 },
          );
        }
        break;
      }
      case "territory": {
        if (zoneName && findZoneWithNeighbors(zoneName)) {
          targetZoneName = zoneName;
          targetArrondissementId = arrondissementId;
        } else if (arrondissementId && arrondissementId >= 1 && arrondissementId <= 20) {
          targetArrondissementId = arrondissementId;
          targetZoneName = arrondissementLabel;
        } else {
          return NextResponse.json(
            {
              error: "Zone requise",
              hint: "Renseignez une zone (arrondissement ou commune) dans votre profil ou dans le message.",
            },
            { status: 400 },
          );
        }
        break;
      }
      case "bug_report": {
        recipientId = await resolveBugReportRecipientId(
          supabase,
          userId,
          identity.role,
        );
        if (!recipientId) {
          return NextResponse.json(
            {
              error: "Destinataire introuvable",
              hint: buildChannelAccessHint("bug_report"),
            },
            { status: 503 },
          );
        }
        break;
      }
      case "community":
      case "admin_elu":
        break;
      default:
        break;
    }

    let message: ChatMessageRow | null = null;
    if (messageKind === "poll") {
      const { data: pollMessageId, error: pollError } = await supabase.rpc(
        "create_chat_poll_with_options",
        {
          p_content: parsed.data.content,
          p_topic_id: topicValidation.topicId,
          p_option_labels: normalizeChatPollOptionLabels(parsed.data.pollOptions ?? []),
        },
      );

      if (pollError) return handleApiError(pollError, "POST /api/chat (poll insert)");
      if (typeof pollMessageId !== "string") {
        return handleApiError(
          new Error("La création du sondage n'a pas renvoyé son message."),
          "POST /api/chat (poll result)",
        );
      }

      message = await loadMessageById(supabase, pollMessageId);
      if (!message) {
        return handleApiError(
          new Error("Le sondage créé est introuvable."),
          "POST /api/chat (poll readback)",
        );
      }
    } else {
      const { data: insertedMessage, error } = await supabase
        .from("app_messages")
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          channel_type: parsed.data.channelType,
          topic_id: topicValidation.topicId,
          message_kind: messageKind,
          related_event_id: relatedEvent?.id ?? null,
          arrondissement_id: targetArrondissementId,
          zone_name: targetZoneName,
          content: parsed.data.content,
          attachment_url: parsed.data.attachmentUrl,
          attachment_type: parsed.data.attachmentType,
          attachment_expires_at: parsed.data.attachmentUrl
            ? new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        })
        .select(messageSelect)
        .single();

      if (error) return handleApiError(error, "POST /api/chat (insert)");
      message = normalizeChatMessageRow(insertedMessage as ChatMessageRow);
    }

    try {
      await createChatNotificationsForMessage(serviceSupabase, message.id);
    } catch (notificationError) {
      console.warn("[POST /api/chat] Notification fan-out failed:", notificationError);
    }

    return NextResponse.json({ status: "sent", message }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/chat (general)");
  }
}

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
  const requestedZoneName = searchParams.get("zoneName");

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

  const zoneName = requestedZoneName || profileMetadataZone.zoneName;
  const arrondissementId = requestedArrondissement ?? profileArrondissement;
  const zoneContext = buildZoneContext(zoneName, arrondissementId);

  const hasGreaterParisZone = (zoneName && findZoneWithNeighbors(zoneName)) !== null;
  const hasArrondissement = arrondissementId !== null && arrondissementId >= 1 && arrondissementId <= 20;

  if (
    !canAccessChatChannel(channelType, {
      roleLabel: identity.role,
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

  const createMessageQuery = () =>
    supabase
      .from("app_messages")
      .select(messageSelect)
      .order("created_at", { ascending: false })
      .limit(50);

  try {
    if (channelType === "community") {
      let query = createMessageQuery().eq("channel_type", "community");
      if (topicId) {
        query = query.eq("topic_id", topicId);
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return NextResponse.json({
        messages: sortChatMessages((data ?? []) as ChatMessageRow[]),
      });
    }

    if (channelType === "dm") {
      if (!recipientId) {
        return NextResponse.json(
          {
            error: "Destinataire requis",
            hint: "Choisissez un membre pour charger la conversation privée.",
          },
          { status: 400 },
        );
      }

      const { data, error } = await createMessageQuery()
        .eq("channel_type", "dm")
        .in("sender_id", [userId, recipientId])
        .in("recipient_id", [userId, recipientId]);
      if (error) {
        throw error;
      }

      return NextResponse.json({
        messages: sortChatMessages((data ?? []) as ChatMessageRow[]),
      });
    }

    if (channelType === "admin_elu") {
      const { data, error } = await createMessageQuery().eq("channel_type", "admin_elu");
      if (error) {
        throw error;
      }

      return NextResponse.json({
        messages: sortChatMessages((data ?? []) as ChatMessageRow[]),
      });
    }

    if (channelType === "territory") {
      if (!zoneName && !arrondissementId) {
        return NextResponse.json(
          {
            error: "Zone manquante",
            hint: "Ajoutez une zone (arrondissement ou commune) à votre profil pour ouvrir ce canal.",
          },
          { status: 400 },
        );
      }

      const territory = getTerritoryFilter(zoneContext);
      const territoryQueries: Promise<ChatMessageRow[]>[] = [];

      if (zoneName) {
        let query = createMessageQuery()
          .eq("channel_type", "territory")
          .eq("zone_name", zoneName);
        if (topicId) {
          query = query.eq("topic_id", topicId);
        }
        territoryQueries.push(runMessageQuery(query));
      }
      if (territory.zoneNames && territory.zoneNames.length > 0) {
        let query = createMessageQuery()
          .eq("channel_type", "territory")
          .in("zone_name", territory.zoneNames);
        if (topicId) {
          query = query.eq("topic_id", topicId);
        }
        territoryQueries.push(
          runMessageQuery(query),
        );
      }
      if (territory.arrondissementIds && territory.arrondissementIds.length > 0) {
        let query = createMessageQuery()
          .eq("channel_type", "territory")
          .in("arrondissement_id", territory.arrondissementIds);
        if (topicId) {
          query = query.eq("topic_id", topicId);
        }
        territoryQueries.push(
          runMessageQuery(query),
        );
      }

      if (territoryQueries.length === 0) {
        return NextResponse.json(
          {
            error: "Zone invalide",
            hint: "Votre zone n'est pas reconnue. Veuillez choisir un arrondissement parisien ou une commune de la région.",
          },
          { status: 400 },
        );
      }

      const territoryMessages = await Promise.all(territoryQueries);
      return NextResponse.json({
        messages: sortChatMessages(mergeRowGroupsById(territoryMessages)),
      });
    }

    if (channelType === "bug_report") {
      const [sentMessages, receivedMessages] = await Promise.all([
        runMessageQuery(
          createMessageQuery().eq("channel_type", "bug_report").eq("sender_id", userId),
        ),
        runMessageQuery(
          createMessageQuery().eq("channel_type", "bug_report").eq("recipient_id", userId),
        ),
      ]);

      return NextResponse.json({
        messages: sortChatMessages(
          mergeRowGroupsById([sentMessages, receivedMessages]),
        ),
      });
    }

    return NextResponse.json({ messages: [] });
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
          channelType === "territory" && !zoneName && !profileArrondissement
            ? "Votre profil n'a pas encore de zone exploitable."
            : "Vérifiez que la table 'app_messages' existe et que les profils sont synchronisés.",
      },
      { status: 500 },
    );
  }
}
