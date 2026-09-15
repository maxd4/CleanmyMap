import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
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
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActionDiscussionAccess } from "@/lib/chat/action-conversations";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import {
  reserveDiscussionMessageSlot,
  toDiscussionRateLimitErrorPayload,
} from "@/lib/community/discussion-rate-limit";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { loadActionById } from "@/lib/actions/store";
import {
  getCommunityBugReportById,
  updateCommunityBugReportCreatorState,
} from "@/lib/community/bug-reports-store";
import {
  isPublicActionReferenceAvailable,
  resolveActionTerritoryDestination,
} from "@/lib/chat/action-sharing";
import { createActionShareRequest } from "@/lib/chat/action-share-requests";
import {
  messageSelect,
  sendMessageSchema,
  buildZoneContext,
  hasValidTerritoryContext,
  normalizeChatMessageRow,
  validateMessageKind,
  validateTopicForChannel,
  type ChatMessageRow,
} from "./route.shared";
import {
  loadCurrentProfile,
  hasExistingDmConversation,
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
  if (parsed.data.channelType === "action" && !parsed.data.actionId) {
    return NextResponse.json(
      { error: "Action requise", hint: "Sélectionnez une action publiée." },
      { status: 400 },
    );
  }
  const isExternalActionShare =
    parsed.data.channelType !== "action" && Boolean(parsed.data.actionId);
  if (isExternalActionShare && !["community", "territory", "dm"].includes(parsed.data.channelType)) {
    return NextResponse.json(
      { error: "Partage indisponible", hint: "Une action peut être partagée uniquement dans une conversation publique, territoriale ou privée existante." },
      { status: 403 },
    );
  }
  if (isExternalActionShare && (
    messageKind !== "message" ||
    parsed.data.topicId ||
    parsed.data.relatedEventId ||
    parsed.data.pollOptions !== undefined ||
    parsed.data.attachmentUrl ||
    parsed.data.attachmentType ||
    (parsed.data.recipientId && parsed.data.channelType !== "dm") ||
    (parsed.data.channelType === "community" && (parsed.data.zoneName || parsed.data.arrondissementId))
  )) {
    return NextResponse.json(
      { error: "Partage invalide", hint: "Le partage d'action est un message standard contenant uniquement la référence actionId." },
      { status: 400 },
    );
  }
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

    let feedbackReplyContext: {
      feedbackId: string;
      targetUserId: string;
      previousCreatorState: string;
    } | null = null;
    if (parsed.data.feedbackId) {
      if (
        parsed.data.channelType !== "dm" ||
        parsed.data.messageKind !== "message" ||
        parsed.data.actionId ||
        parsed.data.relatedEventId ||
        parsed.data.topicId ||
        parsed.data.attachmentUrl ||
        parsed.data.attachmentType
      ) {
        return NextResponse.json(
          { error: "Contexte feedback invalide" },
          { status: 400 },
        );
      }
      if (identity.activeRole !== "admin" && identity.activeRole !== "max") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const feedback = await getCommunityBugReportById(parsed.data.feedbackId);
      const targetUserId = feedback?.submittedByUserId?.trim();
      const recipientId = parsed.data.recipientId?.trim();
      if (
        !feedback ||
        !targetUserId ||
        targetUserId === "unknown" ||
        !recipientId ||
        recipientId !== targetUserId
      ) {
        return NextResponse.json(
          { error: "Destinataire feedback invalide" },
          { status: 403 },
        );
      }

      feedbackReplyContext = {
        feedbackId: parsed.data.feedbackId,
        targetUserId,
        previousCreatorState: feedback.creatorState,
      };
    }

    let sharedAction: Awaited<ReturnType<typeof loadActionById>> = null;
    if (isExternalActionShare) {
      const action = await loadActionById(serviceSupabase, parsed.data.actionId!);
      if (!action || !isPublicActionReferenceAvailable(action)) {
        return NextResponse.json(
          { error: "Action non partageable", hint: "Cette action n'est plus publiée ou accessible." },
          { status: 403 },
        );
      }
      sharedAction = action;
    }

    if (parsed.data.channelType === "action" && parsed.data.actionId && typeof serviceSupabase.from === "function") {
      const access = await resolveActionDiscussionAccess(serviceSupabase, parsed.data.actionId, userId);
      if (access.state === "excluded") {
        return NextResponse.json({ error: "Vous êtes exclu de cette discussion." }, { status: 403 });
      }
      if (access.state === "unavailable") {
        return NextResponse.json({ error: "Discussion d'action introuvable." }, { status: 404 });
      }
      const action = await loadActionById(serviceSupabase, parsed.data.actionId);
      if (action?.status === "cancelled") {
        return NextResponse.json(
          { error: "Cette action a été annulée.", hint: "La discussion est conservée en lecture seule." },
          { status: 403 },
        );
      }
    }

    const quota = await reserveDiscussionMessageSlot(serviceSupabase, {
      userId,
      channel: parsed.data.channelType === "bug_report" ? "bug_report" : "discussion_event",
    });
    if (!quota.allowed) {
      return NextResponse.json(toDiscussionRateLimitErrorPayload(quota), { status: 429 });
    }

    const profile = await loadCurrentProfile(supabase, userId);
    const metadataZone = extractZoneContextFromMetadata(profile?.metadata ?? null);
    const requestedZoneName = parsed.data.zoneName?.trim() || null;
    const requestedArrondissement = parsed.data.arrondissementId ?? null;
    const hasExplicitTerritoryContext =
      requestedZoneName !== null || requestedArrondissement !== null;
    const profileZoneContext = buildZoneContext(
      metadataZone.zoneName,
      profile?.paris_arrondissement ?? metadataZone.arrondissementId,
    );
    const actionTerritory = sharedAction
      ? resolveActionTerritoryDestination(sharedAction)
      : null;
    const actionZoneContext = actionTerritory
      ? {
          zoneName: actionTerritory.zoneName ?? null,
          arrondissementId: actionTerritory.arrondissementId ?? null,
        }
      : null;
    const requestedZoneContext = hasExplicitTerritoryContext
      ? buildZoneContext(requestedZoneName, requestedArrondissement)
      : null;
    const zoneContext =
      requestedZoneContext ?? actionZoneContext ?? profileZoneContext;
    const zoneName = zoneContext?.zoneName ?? null;
    const arrondissementId = zoneContext?.arrondissementId ?? null;
    const hasValidZone = hasValidTerritoryContext(zoneContext);
    const arrondissementLabel =
      !zoneName && arrondissementId && arrondissementId >= 1 && arrondissementId <= 20
        ? `${arrondissementId}e arrondissement`
        : null;

    const hasGreaterParisZone = zoneName !== null || arrondissementLabel !== null;
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
    let actionConversationId: string | null = null;
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
        if (recipientId === userId) {
          return NextResponse.json(
            { error: "Destinataire invalide", hint: "Vous ne pouvez pas vous partager une action." },
            { status: 400 },
          );
        }
        if (isExternalActionShare && !(await hasExistingDmConversation(supabase, recipientId))) {
          const requestResult = await createActionShareRequest(serviceSupabase, {
            senderId: userId,
            recipientId,
            actionId: parsed.data.actionId!,
            content: parsed.data.content,
          });

          if (requestResult.result === "cooldown") {
            return NextResponse.json(
              {
                error: "Demande temporairement indisponible",
                hint: "Une demande récente existe déjà pour ce membre. Réessayez plus tard.",
                retryAfterSeconds: requestResult.retryAfterSeconds ?? 24 * 60 * 60,
              },
              { status: 429 },
            );
          }
          if (requestResult.result === "already_shared") {
            return NextResponse.json(
              { error: "Partage déjà disponible", hint: "Cette action est déjà disponible dans cette conversation." },
              { status: 409 },
            );
          }

          return NextResponse.json(
            { status: "request_pending", requestId: requestResult.requestId },
            { status: 202 },
          );
        }
        break;
      }
      case "territory": {
        if (!hasValidZone) {
          return NextResponse.json(
            {
              error: hasExplicitTerritoryContext ? "Zone invalide" : "Zone requise",
              hint: hasExplicitTerritoryContext
                ? "Votre zone n'est pas reconnue. Choisissez un arrondissement parisien ou une commune de la région."
                : "Choisissez un arrondissement parisien ou une commune de la région pour écrire dans ce fil.",
            },
            { status: 400 },
          );
        }
        if (zoneName) {
          targetZoneName = zoneName;
          targetArrondissementId = arrondissementId;
        } else if (arrondissementId && arrondissementId >= 1 && arrondissementId <= 20) {
          targetArrondissementId = arrondissementId;
          targetZoneName = arrondissementLabel;
        } else {
          return NextResponse.json(
            {
              error: "Zone requise",
              hint: "Choisissez une zone (arrondissement ou commune) dans la messagerie ou dans le message.",
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
      case "action": {
        const { data: conversation, error: conversationError } = await supabase
          .from("action_conversations")
          .select("id")
          .eq("action_id", parsed.data.actionId!)
          .maybeSingle();
        if (conversationError) return handleApiError(conversationError, "POST /api/chat (action conversation)");
        actionConversationId = typeof conversation?.id === "string" ? conversation.id : null;
        if (!actionConversationId) {
          return NextResponse.json({ error: "Discussion d'action introuvable." }, { status: 404 });
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
          conversation_id: actionConversationId,
          topic_id: topicValidation.topicId,
          message_kind: messageKind,
          related_event_id: relatedEvent?.id ?? null,
          arrondissement_id: targetArrondissementId,
          zone_name: targetZoneName,
          content: parsed.data.content,
          attachment_url: parsed.data.attachmentUrl,
          attachment_type: parsed.data.attachmentType,
          action_id: parsed.data.actionId && isExternalActionShare ? parsed.data.actionId : null,
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

    if (feedbackReplyContext) {
      const updatedFeedback = await updateCommunityBugReportCreatorState({
        reportId: feedbackReplyContext.feedbackId,
        creatorState: "responded",
      });
      if (!updatedFeedback) {
        throw new Error("Le statut du feedback n'a pas été mis à jour après l'envoi.");
      }

      await appendAdminOperationAudit({
        operationId: randomUUID(),
        at: new Date().toISOString(),
        actorUserId: userId,
        operationType: "admin_operation",
        outcome: "success",
        targetId: feedbackReplyContext.feedbackId,
        details: {
          operation: "feedback_private_reply_sent",
          targetUserId: feedbackReplyContext.targetUserId,
          messageSent: true,
          previousValue: {
            source: "feedback",
            creatorState: feedbackReplyContext.previousCreatorState,
          },
          newValue: {
            source: "feedback",
            creatorState: updatedFeedback.creatorState,
          },
        },
      });
    }

    return NextResponse.json({ status: "sent", message }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/chat (general)");
  }
}
