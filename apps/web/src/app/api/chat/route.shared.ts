import { z } from "zod";
import { NextResponse } from "next/server";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";
import {
  type ChatChannelType,
  type ZoneContext,
  buildChannelAccessHint,
  canAccessChatChannel,
  extractZoneContextFromMetadata,
  getTerritoryFilter,
} from "@/lib/chat/channels";
import { extractParisArrondissementFromLabel } from "@/lib/geo/paris-arrondissements";
import {
  isChatTopicId,
  isChatTopicAllowedForChannel,
  type ChatTopicId,
} from "@/lib/chat/topics";
import {
  CHAT_MESSAGE_KINDS,
  isCommunityAnnouncementTopicId,
  type ChatMessageKind,
} from "@/lib/chat/announcements";
import {
  getChatPollOptionsValidationError,
  type ChatPollOption,
} from "@/lib/chat/polls";
import {
  CHAT_VIDEO_UNSUPPORTED_MESSAGE,
  isSafeChatAttachmentUrl,
  isUnsupportedChatVideoMimeType,
} from "@/lib/chat/chat-attachments";
import { sortByCreatedAtAsc } from "@/lib/chat/postgrest";

export const CHANNEL_TYPES = [
  "community",
  "dm",
  "admin_elu",
  "territory",
  "bug_report",
  "action",
] as const satisfies readonly ChatChannelType[];

export const sendMessageSchema = z.object({
  channelType: z.enum(CHANNEL_TYPES),
  content: z.string().min(1).max(2000),
  messageKind: z.enum(CHAT_MESSAGE_KINDS).optional().default("message"),
  pollOptions: z.array(z.string()).optional(),
  relatedEventId: z.string().uuid().optional(),
  topicId: z.string().optional(),
  actionId: z.string().uuid().optional(),
  feedbackId: z.string().trim().min(1).max(200).optional(),
  operationId: z.string().trim().min(1).max(200).optional(),
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
  attachmentType: z
    .string()
    .refine((value) => !isUnsupportedChatVideoMimeType(value), {
      message: CHAT_VIDEO_UNSUPPORTED_MESSAGE,
    })
    .optional(),
});

export type CurrentProfileRow = {
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
  [key: string]: unknown;
};

export function validateTopicForChannel(
  channelType: ChatChannelType,
  topicId: string | null | undefined,
): { topicId: ChatTopicId | null; topicIds?: ChatTopicId[]; error?: string } {
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

type ChatTopicRequestValidation = {
  topicId: ChatTopicId | null;
  topicIds: ChatTopicId[] | null;
  error?: string;
};

export function validateTopicRequestForChannel(
  channelType: ChatChannelType,
  topicId: string | null | undefined,
): ChatTopicRequestValidation {
  if (!topicId || !topicId.includes(",")) {
    const validation = validateTopicForChannel(channelType, topicId);
    return {
      topicId: validation.topicId,
      topicIds: validation.topicId ? [validation.topicId] : null,
      error: validation.error,
    };
  }

  const topicIds = [...new Set(topicId.split(",").map((value) => value.trim()).filter(Boolean))];
  const results = topicIds.map((value) => validateTopicForChannel(channelType, value));
  if (results.length === 0 || results.some((result) => result.error || !result.topicId)) {
    return { topicId: null, topicIds: null, error: "Ce groupe de salons n'est pas disponible dans ce canal." };
  }
  return {
    topicId: null,
    topicIds: results.map((result) => result.topicId as ChatTopicId),
  };
}

export function getChatTopicRequestParam(searchParams: URLSearchParams): string | null {
  return searchParams.get("topicIds") || searchParams.get("topicId");
}

export function getChatTopicIdsFromValidation(
  validation: ChatTopicRequestValidation,
): ChatTopicId[] | null {
  if (validation.topicIds) return validation.topicIds;
  return validation.topicId ? [validation.topicId] : null;
}

export function resolveChatTopicRequest(
  channelType: ChatChannelType,
  searchParams: URLSearchParams,
  legacyTopicId: string | null = null,
): {
  topicId: ChatTopicId | null;
  topicIds: ChatTopicId[] | null;
  error?: string;
} {
  const requestedTopicId = searchParams.get("topicIds") || legacyTopicId || searchParams.get("topicId");
  const validation = validateTopicRequestForChannel(channelType, requestedTopicId);
  return {
    topicId: validation.topicId,
    topicIds: getChatTopicIdsFromValidation(validation),
    error: validation.error,
  };
}

export function applyChatTopicFilter<T>(
  query: T,
  topicIds: readonly ChatTopicId[] | null,
): T {
  if (!topicIds) return query;
  const filterable = query as {
    eq: (field: string, value: unknown) => unknown;
    in: (field: string, values: unknown[]) => unknown;
  };
  if (topicIds.length === 1) filterable.eq("topic_id", topicIds[0]);
  else filterable.in("topic_id", [...topicIds]);
  return query;
}

export function validateMessageKind(
  channelType: ChatChannelType,
  messageKind: ChatMessageKind,
  topicId: ChatTopicId | null,
  relatedEventId: string | undefined,
  attachmentUrl: string | undefined,
  pollOptions: string[] | undefined,
): { error?: string } {
  if (channelType === "action" && !["message", "poll"].includes(messageKind)) {
    return { error: "Les discussions d'action acceptent les messages et les sondages." };
  }

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

  if (![
    "community",
    "admin_elu",
    "territory",
    "action",
    "dm",
  ].includes(channelType)) {
    return { error: "Les sondages ne sont pas disponibles dans ce canal." };
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

export type ChatQueryResult<T> = PromiseLike<{
  data: T[] | null;
  error: {
    message: string;
    code?: string;
    details?: string;
  } | null;
}>;

export const messageSelect =
  "*, sender:profiles!sender_id(display_name, handle, avatar_url), related_event:community_events!related_event_id(id, title, event_date, location_label), poll_options:chat_poll_options(id, position, label)";

export function normalizeChatMessageRow(row: ChatMessageRow): ChatMessageRow {
  const pollOptions = Array.isArray(row.poll_options)
    ? [...(row.poll_options as ChatPollOption[])]
        .map((option) => ({
          ...option,
          voteCount:
            typeof option.voteCount === "number" && Number.isFinite(option.voteCount)
              ? Math.max(0, Math.trunc(option.voteCount))
              : 0,
        }))
        .sort((left, right) => left.position - right.position)
    : [];

  return {
    ...row,
    poll_options: pollOptions,
    ...(row.message_kind === "poll"
      ? {
          totalVotes:
            typeof row.totalVotes === "number" && Number.isFinite(row.totalVotes)
              ? Math.max(0, Math.trunc(row.totalVotes))
              : 0,
          selectedOptionId:
            typeof row.selectedOptionId === "string" ? row.selectedOptionId : null,
        }
      : {}),
  };
}

export function sortChatMessages(rows: ChatMessageRow[]): ChatMessageRow[] {
  return sortByCreatedAtAsc(rows.map(normalizeChatMessageRow));
}

export function parseArrondissement(raw: string | null): number | null {
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    return null;
  }

  return parsed;
}

export function buildZoneContext(
  zoneName: string | null,
  arrondissementId: number | null,
): ZoneContext {
  const normalizedZoneName = zoneName?.trim() || null;
  const matchedZone = normalizedZoneName
    ? findZoneWithNeighbors(normalizedZoneName)
    : null;
  const parisArrondissement = normalizedZoneName
    ? extractParisArrondissementFromLabel(normalizedZoneName)
    : null;
  return {
    zoneName: matchedZone?.name ?? (parisArrondissement ? normalizedZoneName : null),
    arrondissementId: arrondissementId ?? parisArrondissement,
  };
}

export function hasValidTerritoryContext(zoneContext: ZoneContext | null): boolean {
  const filter = getTerritoryFilter(zoneContext);
  return Boolean(filter.arrondissementIds?.length || filter.zoneNames?.length);
}

export function resolveChatZoneContext(params: {
  profileMetadata: Record<string, unknown> | null | undefined;
  profileArrondissement: number | null | undefined;
  requestedZoneName: string | null;
  requestedArrondissement: number | null;
}) {
  const profileMetadataZone = extractZoneContextFromMetadata(params.profileMetadata ?? null);
  const hasExplicitTerritoryContext =
    params.requestedZoneName !== null || params.requestedArrondissement !== null;
  const profileZoneContext = buildZoneContext(
    profileMetadataZone.zoneName,
    params.profileArrondissement ?? profileMetadataZone.arrondissementId,
  );
  const requestedZoneContext = hasExplicitTerritoryContext
    ? buildZoneContext(params.requestedZoneName, params.requestedArrondissement)
    : null;
  const zoneContext = requestedZoneContext ?? profileZoneContext;
  const zoneName = zoneContext.zoneName;
  const arrondissementId = zoneContext.arrondissementId;
  return {
    hasExplicitTerritoryContext,
    zoneContext,
    zoneName,
    arrondissementId,
    hasValidZone: hasValidTerritoryContext(zoneContext),
    hasGreaterParisZone: zoneName !== null,
    hasArrondissement:
      arrondissementId !== null && arrondissementId >= 1 && arrondissementId <= 20,
  };
}

function buildChatChannelAccessError(
  channelType: ChatChannelType,
  roleLabel: string | null | undefined,
  context: Omit<ReturnType<typeof resolveChatZoneContext>, "arrondissementId">,
) {
  return canAccessChatChannel(channelType, {
    roleLabel,
    hasArrondissement: context.hasArrondissement,
    hasGreaterParisZone: context.hasGreaterParisZone,
    zoneContext: context.zoneContext,
  })
    ? null
    : NextResponse.json(
        { error: "Canal inaccessible", hint: buildChannelAccessHint(channelType) },
        { status: 403 },
      );
}

export function resolveChatAccessContext(params: {
  profileMetadata: Record<string, unknown> | null | undefined;
  profileArrondissement: number | null | undefined;
  requestedZoneName: string | null;
  requestedArrondissement: number | null;
  channelType: ChatChannelType;
  roleLabel: string | null | undefined;
}) {
  const zone = resolveChatZoneContext(params);
  return {
    ...zone,
    error: buildChatChannelAccessError(params.channelType, params.roleLabel, zone),
  };
}

export function validateActionChannelParams(
  channelType: ChatChannelType,
  requestedActionId: string | null,
): Response | null {
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
  return null;
}

export function buildEmptyChatResponse(requestedMessageId: string | null) {
  return NextResponse.json({
    messages: [],
    previousCursor: null,
    hasMore: false,
    ...(requestedMessageId
      ? { targetMessageId: requestedMessageId, targetStatus: "unavailable" as const }
      : {}),
  });
}

type ChatFilterableQuery<T> = {
  eq: (column: string, value: unknown) => T;
  in: (column: string, values: readonly unknown[]) => T;
};

export function buildChatDirectScopeFactories<T extends ChatFilterableQuery<T>>(params: {
  channelType: ChatChannelType;
  createQuery: () => T;
  userId: string;
  recipientId: string;
  topicId: string | null;
}): Array<() => T> {
  if (params.channelType === "dm") {
    return [() =>
      params.createQuery()
        .eq("channel_type", "dm")
        .in("sender_id", [params.userId, params.recipientId])
        .in("recipient_id", [params.userId, params.recipientId])
    ];
  }
  if (params.channelType === "admin_elu") {
    return [() => {
      let query = params.createQuery().eq("channel_type", "admin_elu");
      if (params.topicId) query = query.eq("topic_id", params.topicId);
      return query;
    }];
  }
  return [];
}
