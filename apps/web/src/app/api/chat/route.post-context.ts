import { NextResponse } from "next/server";
import { buildChannelAccessHint, extractZoneContextFromMetadata } from "@/lib/chat/channels";
import { resolveActionTerritoryDestination } from "@/lib/chat/action-sharing";
import { createActionShareRequest } from "@/lib/chat/action-share-requests";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { handleApiError } from "@/lib/http/api-errors";
import { reserveDiscussionMessageSlot, toDiscussionRateLimitErrorPayload } from "@/lib/community/discussion-rate-limit";
import type { ChatRelatedEvent } from "@/lib/chat/announcements";
import {
  buildZoneContext,
  hasValidTerritoryContext,
} from "./route.shared";
import {
  hasExistingDmConversation,
  loadCurrentProfile,
  loadRelatedCommunityEvent,
  resolveBugReportRecipientId,
} from "./route.data";
import type { ValidatedChatPost } from "./route.post-validation";

type ChatSupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>;
type ServiceSupabaseClient = ReturnType<typeof getSupabaseServerClient>;
type ActiveRole = Parameters<typeof resolveBugReportRecipientId>[2];
export type SharedAction = {
  location_label: string;
  status: string | null;
  [key: string]: unknown;
};

export type ChatPostZoneContext = {
  zoneContext: ReturnType<typeof buildZoneContext>;
  zoneName: string | null;
  arrondissementId: number | null;
  arrondissementLabel: string | null;
  hasValidZone: boolean;
  hasGreaterParisZone: boolean;
  hasArrondissement: boolean;
};

export type ChatPostDestination = {
  recipientId: string | null;
  actionConversationId: string | null;
  targetArrondissementId: number | null;
  targetZoneName: string | null;
  relatedEvent: ChatRelatedEvent | null;
};

type DestinationPart = Pick<
  ChatPostDestination,
  "recipientId" | "actionConversationId" | "targetArrondissementId" | "targetZoneName"
>;

async function resolveDmDestination({
  supabase,
  serviceSupabase,
  userId,
  data,
  isExternalActionShare,
}: {
  supabase: ChatSupabaseClient;
  serviceSupabase: ServiceSupabaseClient;
  userId: string;
  data: ValidatedChatPost["data"];
  isExternalActionShare: boolean;
}): Promise<DestinationPart | Response> {
  const recipientId = data.recipientId?.trim() ?? null;
  if (!recipientId) {
    return NextResponse.json(
      { error: "Destinataire requis", hint: "Choisissez un membre avant d'envoyer un message privé." },
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
      actionId: data.actionId!,
      content: data.content,
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
  return { recipientId, actionConversationId: null, targetArrondissementId: null, targetZoneName: null };
}

function resolveTerritoryDestination(
  data: ValidatedChatPost["data"],
  zone: ChatPostZoneContext,
): DestinationPart | Response {
  if (!zone.hasValidZone) {
    const hasExplicitContext = data.zoneName?.trim() || data.arrondissementId !== undefined;
    return NextResponse.json(
      {
        error: hasExplicitContext ? "Zone invalide" : "Zone requise",
        hint: hasExplicitContext
          ? "Votre zone n'est pas reconnue. Choisissez un arrondissement parisien ou une commune de la région."
          : "Choisissez un arrondissement parisien ou une commune de la région pour écrire dans ce fil.",
      },
      { status: 400 },
    );
  }
  if (zone.zoneName) {
    return { recipientId: null, actionConversationId: null, targetArrondissementId: zone.arrondissementId, targetZoneName: zone.zoneName };
  }
  if (zone.arrondissementId && zone.arrondissementId >= 1 && zone.arrondissementId <= 20) {
    return { recipientId: null, actionConversationId: null, targetArrondissementId: zone.arrondissementId, targetZoneName: zone.arrondissementLabel };
  }
  return NextResponse.json(
    { error: "Zone requise", hint: "Choisissez une zone (arrondissement ou commune) dans la messagerie ou dans le message." },
    { status: 400 },
  );
}

async function resolveBugReportDestination(
  supabase: ChatSupabaseClient,
  userId: string,
  activeRole: ActiveRole,
): Promise<DestinationPart | Response> {
  const recipientId = await resolveBugReportRecipientId(supabase, userId, activeRole);
  return recipientId
    ? { recipientId, actionConversationId: null, targetArrondissementId: null, targetZoneName: null }
    : NextResponse.json(
        { error: "Destinataire introuvable", hint: buildChannelAccessHint("bug_report") },
        { status: 503 },
      );
}

async function resolveActionDestination(
  supabase: ChatSupabaseClient,
  actionId: string,
): Promise<DestinationPart | Response> {
  const { data: conversation, error } = await supabase
    .from("action_conversations")
    .select("id")
    .eq("action_id", actionId)
    .maybeSingle();
  if (error) return handleApiError(error, "POST /api/chat (action conversation)");
  const actionConversationId = typeof conversation?.id === "string" ? conversation.id : null;
  return actionConversationId
    ? { recipientId: null, actionConversationId, targetArrondissementId: null, targetZoneName: null }
    : NextResponse.json({ error: "Discussion d'action introuvable." }, { status: 404 });
}

async function resolveChannelDestination({
  supabase,
  serviceSupabase,
  userId,
  activeRole,
  data,
  zone,
  isExternalActionShare,
}: {
  supabase: ChatSupabaseClient;
  serviceSupabase: ServiceSupabaseClient;
  userId: string;
  activeRole: ActiveRole;
  data: ValidatedChatPost["data"];
  zone: ChatPostZoneContext;
  isExternalActionShare: boolean;
}): Promise<DestinationPart | Response> {
  if (data.channelType === "dm") {
    return resolveDmDestination({ supabase, serviceSupabase, userId, data, isExternalActionShare });
  }
  if (data.channelType === "territory") return resolveTerritoryDestination(data, zone);
  if (data.channelType === "bug_report") return resolveBugReportDestination(supabase, userId, activeRole);
  if (data.channelType === "action") return resolveActionDestination(supabase, data.actionId!);
  return { recipientId: null, actionConversationId: null, targetArrondissementId: null, targetZoneName: null };
}

export async function resolveChatPostExecutionZone({
  supabase,
  serviceSupabase,
  userId,
  data,
  sharedAction,
}: {
  supabase: ChatSupabaseClient;
  serviceSupabase: ServiceSupabaseClient;
  userId: string;
  data: ValidatedChatPost["data"];
  sharedAction: SharedAction | null;
}): Promise<ChatPostZoneContext | Response> {
  const quota = await reserveDiscussionMessageSlot(serviceSupabase, {
    userId,
    channel: data.channelType === "bug_report" ? "bug_report" : "discussion_event",
  });
  if (!quota.allowed) {
    return NextResponse.json(toDiscussionRateLimitErrorPayload(quota), { status: 429 });
  }
  return resolveChatPostZoneContext({ supabase, userId, data, sharedAction });
}

async function resolveChatPostZoneSources({
  supabase,
  userId,
  data,
  sharedAction,
}: {
  supabase: ChatSupabaseClient;
  userId: string;
  data: ValidatedChatPost["data"];
  sharedAction: SharedAction | null;
}) {
  const profile = await loadCurrentProfile(supabase, userId);
  const metadataZone = extractZoneContextFromMetadata(profile?.metadata ?? null);
  const requestedZoneName = data.zoneName?.trim() || null;
  const requestedArrondissement = data.arrondissementId ?? null;
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
  return { requestedZoneContext, actionZoneContext, profileZoneContext };
}

function buildChatPostZoneContext({
  zoneContext,
}: {
  zoneContext: ReturnType<typeof buildZoneContext>;
}): ChatPostZoneContext {
  const zoneName = zoneContext?.zoneName ?? null;
  const arrondissementId = zoneContext?.arrondissementId ?? null;
  const hasValidZone = hasValidTerritoryContext(zoneContext);
  const arrondissementLabel =
    !zoneName && arrondissementId && arrondissementId >= 1 && arrondissementId <= 20
      ? `${arrondissementId}e arrondissement`
      : null;
  return {
    zoneContext,
    zoneName,
    arrondissementId,
    arrondissementLabel,
    hasValidZone,
    hasGreaterParisZone: zoneName !== null || arrondissementLabel !== null,
    hasArrondissement: arrondissementId !== null && arrondissementId >= 1 && arrondissementId <= 20,
  };
}

async function resolveChatPostZoneContext({
  supabase,
  userId,
  data,
  sharedAction,
}: {
  supabase: ChatSupabaseClient;
  userId: string;
  data: ValidatedChatPost["data"];
  sharedAction: SharedAction | null;
}): Promise<ChatPostZoneContext> {
  const sources = await resolveChatPostZoneSources({ supabase, userId, data, sharedAction });
  return buildChatPostZoneContext({
    zoneContext: sources.requestedZoneContext ?? sources.actionZoneContext ?? sources.profileZoneContext,
  });
}

export async function resolveChatPostDestination({
  supabase,
  serviceSupabase,
  userId,
  activeRole,
  validated,
  zone,
  isExternalActionShare,
}: {
  supabase: ChatSupabaseClient;
  serviceSupabase: ServiceSupabaseClient;
  userId: string;
  activeRole: ActiveRole;
  validated: ValidatedChatPost;
  zone: ChatPostZoneContext;
  isExternalActionShare: boolean;
}): Promise<ChatPostDestination | Response> {
  const { data } = validated;
  let relatedEvent: ChatRelatedEvent | null = null;
  if (data.relatedEventId) {
    relatedEvent = await loadRelatedCommunityEvent(supabase, data.relatedEventId);
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
  const destination = await resolveChannelDestination({
    supabase,
    serviceSupabase,
    userId,
    activeRole,
    data,
    zone,
    isExternalActionShare,
  });
  if (destination instanceof Response) return destination;
  return {
    ...destination,
    relatedEvent,
  };
}
