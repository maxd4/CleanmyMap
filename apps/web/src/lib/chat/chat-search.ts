import type { ChatMessageKind } from "./announcements";
import type { ChatChannelType } from "./channels";
import type { ChatTopicId } from "./topics";

export const CHAT_SEARCH_MIN_QUERY_LENGTH = 2;
export const CHAT_SEARCH_MAX_QUERY_LENGTH = 120;
export const CHAT_SEARCH_PAGE_SIZE = 20;

export type ChatSearchResult = {
  messageId: string;
  excerpt: string;
  author: {
    displayName: string;
    handle: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  channelType: ChatChannelType;
  messageKind: ChatMessageKind;
  topicId: ChatTopicId | null;
};

export type ChatSearchResponse = {
  results: ChatSearchResult[];
  nextCursor: {
    createdAt: string;
    id: string;
  } | null;
  hasMore: boolean;
  query: string;
};

export function normalizeChatSearchQuery(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function getChatSearchQueryError(query: string): string | null {
  if (query.length < CHAT_SEARCH_MIN_QUERY_LENGTH) {
    return "Saisissez au moins 2 caractères.";
  }
  if (query.length > CHAT_SEARCH_MAX_QUERY_LENGTH) {
    return `La recherche est limitée à ${CHAT_SEARCH_MAX_QUERY_LENGTH} caractères.`;
  }
  return null;
}

export function buildChatMessageExcerpt(
  content: string,
  query: string,
  maxLength = 180,
): string {
  const normalizedContent = content.replace(/\s+/g, " ").trim();
  if (normalizedContent.length <= maxLength) {
    return normalizedContent;
  }

  const matchIndex = normalizedContent.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  const start = matchIndex > 40 ? matchIndex - 40 : 0;
  const prefix = start > 0 ? "…" : "";
  const availableLength = Math.max(1, maxLength - prefix.length - 1);
  const excerpt = normalizedContent.slice(start, start + availableLength).trimEnd();
  return `${prefix}${excerpt}${start + availableLength < normalizedContent.length ? "…" : ""}`;
}
