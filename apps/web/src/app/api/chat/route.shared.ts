import { z } from "zod";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";
import { type ChatChannelType, type ZoneContext, getTerritoryFilter } from "@/lib/chat/channels";
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
import { isSafeChatAttachmentUrl } from "@/lib/chat/chat-attachments";
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
  attachmentType: z.string().optional(),
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

export function validateMessageKind(
  channelType: ChatChannelType,
  messageKind: ChatMessageKind,
  topicId: ChatTopicId | null,
  relatedEventId: string | undefined,
  attachmentUrl: string | undefined,
  pollOptions: string[] | undefined,
): { error?: string } {
  if (channelType === "action" && messageKind !== "message") {
    return { error: "Les discussions d'action acceptent uniquement les messages standard." };
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

  if (channelType !== "community" && channelType !== "admin_elu") {
    return { error: "Les sondages sont disponibles dans la communauté et le canal Admin & élus." };
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
