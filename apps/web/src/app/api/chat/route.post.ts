import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";
import { extractArrondissementFromLabel } from "@/lib/geo/paris-arrondissements";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  canAccessChatChannel,
  buildChannelAccessHint,
  extractZoneContextFromMetadata,
} from "@/lib/chat/channels";
import { type ChatRelatedEvent } from "@/lib/chat/announcements";
import { normalizeChatPollOptionLabels } from "@/lib/chat/polls";
import {
  isSupportedChatAttachmentMimeType,
} from "@/lib/chat/chat-attachments";
import { createChatNotificationsForMessage } from "@/lib/chat/chat-notifications";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import {
  reserveDiscussionMessageSlot,
  toDiscussionRateLimitErrorPayload,
} from "@/lib/community/discussion-rate-limit";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import {
  messageSelect,
  sendMessageSchema,
  buildZoneContext,
  normalizeChatMessageRow,
  parseArrondissement,
  validateMessageKind,
  validateTopicForChannel,
  type ChatMessageRow,
} from "./route.shared";
import {
  loadCurrentProfile,
  loadMessageById,
  loadRelatedCommunityEvent,
  resolveBugReportRecipientId,
} from "./route.data";

export async function POST(request: Request) {
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
        roleLabel: identity.activeRole,
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
    let relatedEvent: ChatRelatedEvent | null = null;

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
          identity.activeRole,
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

      message = await loadMessageById(supabase, serviceSupabase, userId, pollMessageId);
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
