"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import {
  CHAT_SEARCH_MAX_QUERY_LENGTH,
  CHAT_SEARCH_MIN_QUERY_LENGTH,
  normalizeChatSearchQuery,
  type ChatSearchResponse,
  type ChatSearchResult,
} from "@/lib/chat/chat-search";
import type { ChatHistoryCursor } from "@/lib/chat/chat-pagination";

type ChatSearchParams = {
  activeChannelType: ChatChannelType;
  activeTopicId: ChatTopicId | null;
  selectedRecipientId: string | null;
  effectiveZone: string;
  territoryFocus: number | null;
  query: string;
};

type ChatSearchFetcherError = {
  hint?: unknown;
  message?: unknown;
};

async function fetchSearchResults(url: string): Promise<ChatSearchResponse> {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => ({}))) as
    | ChatSearchResponse
    | ChatSearchFetcherError;
  if (!response.ok) {
    const errorPayload = payload as ChatSearchFetcherError;
    throw new Error(
      typeof errorPayload.hint === "string"
        ? errorPayload.hint
        : typeof errorPayload.message === "string"
          ? errorPayload.message
          : "La recherche est momentanément indisponible.",
    );
  }
  return payload as ChatSearchResponse;
}

export function buildChatSearchKey({
  activeChannelType,
  activeTopicId,
  selectedRecipientId,
  effectiveZone,
  territoryFocus,
  query,
}: ChatSearchParams): string | null {
  const normalizedQuery = normalizeChatSearchQuery(query);
  if (
    normalizedQuery.length < CHAT_SEARCH_MIN_QUERY_LENGTH ||
    normalizedQuery.length > CHAT_SEARCH_MAX_QUERY_LENGTH
  ) {
    return null;
  }

  if (activeChannelType === "dm" && !selectedRecipientId) {
    return null;
  }

  const params = new URLSearchParams({
    channelType: activeChannelType,
    q: normalizedQuery,
  });
  if (activeTopicId) params.set("topicId", activeTopicId);
  if (selectedRecipientId && activeChannelType === "dm") {
    params.set("recipientId", selectedRecipientId);
  }
  if (activeChannelType === "territory") {
    if (effectiveZone) params.set("zoneName", effectiveZone);
    else if (territoryFocus) params.set("arrondissementId", String(territoryFocus));
  }
  return `/api/chat/search?${params.toString()}`;
}

function buildSearchPageKey(
  searchKey: string,
  cursor: ChatHistoryCursor,
): string {
  const url = new URL(searchKey, "http://chat.local");
  url.searchParams.set("beforeCreatedAt", cursor.createdAt);
  url.searchParams.set("beforeId", cursor.id);
  return `${url.pathname}${url.search}`;
}

export function useChatSearch(params: ChatSearchParams & { enabled?: boolean }) {
  const [debouncedQuery, setDebouncedQuery] = useState(() => normalizeChatSearchQuery(params.query));
  const [extraResults, setExtraResults] = useState<ChatSearchResult[]>([]);
  const [pagination, setPagination] = useState<{
    nextCursor: ChatHistoryCursor | null;
    hasMore: boolean;
  }>({ nextCursor: null, hasMore: false });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(normalizeChatSearchQuery(params.query));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [params.query]);

  const searchKey = useMemo(
    () =>
      params.enabled === false
        ? null
        : buildChatSearchKey({
            activeChannelType: params.activeChannelType,
            activeTopicId: params.activeTopicId,
            selectedRecipientId: params.selectedRecipientId,
            effectiveZone: params.effectiveZone,
            territoryFocus: params.territoryFocus,
            query: debouncedQuery,
          }),
    [
      debouncedQuery,
      params.activeChannelType,
      params.activeTopicId,
      params.effectiveZone,
      params.enabled,
      params.selectedRecipientId,
      params.territoryFocus,
    ],
  );
  const { data, error, isLoading } = useSWR<ChatSearchResponse>(
    searchKey,
    fetchSearchResults,
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );

  useEffect(() => {
    setExtraResults([]);
    setLoadMoreError(null);
    setPagination({
      nextCursor: data?.nextCursor ?? null,
      hasMore: data?.hasMore ?? false,
    });
  }, [data, searchKey]);

  const loadMore = useCallback(async () => {
    if (!searchKey || !pagination.hasMore || !pagination.nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const nextPage = await fetchSearchResults(
        buildSearchPageKey(searchKey, pagination.nextCursor),
      );
      setExtraResults((current) => {
        const ids = new Set(current.map((result) => result.messageId));
        return [
          ...current,
          ...nextPage.results.filter((result) => !ids.has(result.messageId)),
        ];
      });
      setPagination({ nextCursor: nextPage.nextCursor, hasMore: nextPage.hasMore });
    } catch (loadError) {
      setLoadMoreError(
        loadError instanceof Error
          ? loadError.message
          : "Les résultats suivants ne peuvent pas être chargés.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, pagination, searchKey]);

  return {
    results: [...(data?.results ?? []), ...extraResults],
    isLoading: Boolean(searchKey) && (isLoading || !data),
    error: error instanceof Error ? error : null,
    hasMore: pagination.hasMore,
    isLoadingMore,
    loadMoreError,
    loadMore,
    hasSearched: Boolean(searchKey),
  };
}
