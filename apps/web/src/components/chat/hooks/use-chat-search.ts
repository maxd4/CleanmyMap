"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useChatSurfaceActivity } from "../chat-surface-activity-context";
import { getChatTopicIdsForPresentationScope } from "@/lib/chat/topic-presentation";

type ChatSearchParams = {
  activeChannelType: ChatChannelType;
  activeTopicId: ChatTopicId | null;
  activeTopicIds?: readonly ChatTopicId[] | null;
  selectedRecipientId: string | null;
  effectiveZone: string;
  territoryFocus: number | null;
  query: string;
};

type ChatSearchFetcherError = {
  hint?: unknown;
  message?: unknown;
};

async function fetchSearchResults(
  url: string,
  signal?: AbortSignal,
): Promise<ChatSearchResponse> {
  const response = await fetch(url, { signal });
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
  activeTopicIds,
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
  if (activeTopicIds?.length) {
    if (activeTopicIds.length === 1) params.set("topicId", activeTopicIds[0]);
    else params.set("topicIds", activeTopicIds.join(","));
  } else if (activeTopicId) {
    params.set("topicId", activeTopicId);
  }
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
  const surfaceActive = useChatSurfaceActivity();
  const [debouncedQuery, setDebouncedQuery] = useState(() => normalizeChatSearchQuery(params.query));
  const [continuation, setContinuation] = useState<{
    searchKey: string | null;
    sourceData: ChatSearchResponse | undefined;
    extraResults: ChatSearchResult[];
    nextCursor: ChatHistoryCursor | null;
    hasMore: boolean;
    loadMoreError: string | null;
  }>({
    searchKey: null,
    sourceData: undefined,
    extraResults: [],
    nextCursor: null,
    hasMore: false,
    loadMoreError: null,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(normalizeChatSearchQuery(params.query));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [params.query]);

  const searchKey = useMemo(
    () =>
      params.enabled === false || !surfaceActive
        ? null
        : buildChatSearchKey({
            activeChannelType: params.activeChannelType,
            activeTopicId: params.activeTopicId,
            activeTopicIds:
              params.activeTopicIds ??
              getChatTopicIdsForPresentationScope(
                params.activeChannelType,
                params.activeTopicId,
              ),
            selectedRecipientId: params.selectedRecipientId,
            effectiveZone: params.effectiveZone,
            territoryFocus: params.territoryFocus,
            query: debouncedQuery,
          }),
    [
      debouncedQuery,
      params.activeChannelType,
      params.activeTopicId,
      params.activeTopicIds,
      params.effectiveZone,
      params.enabled,
      params.selectedRecipientId,
      surfaceActive,
      params.territoryFocus,
    ],
  );
  const searchFetcher = useCallback(async (url: string) => {
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    try {
      return await fetchSearchResults(url, controller.signal);
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (searchKey) {
      return;
    }

    searchAbortRef.current?.abort();
  }, [searchKey]);

  useEffect(() => () => searchAbortRef.current?.abort(), []);

  const { data, error, isLoading } = useSWR<ChatSearchResponse>(
    searchKey,
    searchFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30_000,
    },
  );

  const continuationIsCurrent =
    continuation.searchKey === searchKey && continuation.sourceData === data;
  const extraResults = continuationIsCurrent ? continuation.extraResults : [];
  const pagination = useMemo(
    () =>
      continuationIsCurrent
        ? { nextCursor: continuation.nextCursor, hasMore: continuation.hasMore }
        : { nextCursor: data?.nextCursor ?? null, hasMore: data?.hasMore ?? false },
    [
      continuation.hasMore,
      continuation.nextCursor,
      continuationIsCurrent,
      data?.hasMore,
      data?.nextCursor,
    ],
  );
  const loadMoreError = continuationIsCurrent ? continuation.loadMoreError : null;

  const loadMore = useCallback(async () => {
    if (!searchKey || !pagination.hasMore || !pagination.nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setContinuation((current) => ({
      ...current,
      searchKey,
      sourceData: data,
      extraResults: continuationIsCurrent ? current.extraResults : [],
      nextCursor: pagination.nextCursor,
      hasMore: pagination.hasMore,
      loadMoreError: null,
    }));
    try {
      const nextPage = await searchFetcher(
        buildSearchPageKey(searchKey, pagination.nextCursor),
      );
      setContinuation((current) => {
        const currentResults =
          current.searchKey === searchKey && current.sourceData === data
            ? current.extraResults
            : [];
        const currentIds = new Set(currentResults.map((result) => result.messageId));
        return {
          searchKey,
          sourceData: data,
          extraResults: [
            ...currentResults,
            ...nextPage.results.filter((result) => !currentIds.has(result.messageId)),
          ],
          nextCursor: nextPage.nextCursor,
          hasMore: nextPage.hasMore,
          loadMoreError: null,
        };
      });
    } catch (loadError) {
      setContinuation((current) => ({
        ...current,
        searchKey,
        sourceData: data,
        loadMoreError:
          loadError instanceof Error
            ? loadError.message
            : "Les résultats suivants ne peuvent pas être chargés.",
      }));
    } finally {
      setIsLoadingMore(false);
    }
  }, [continuationIsCurrent, data, isLoadingMore, pagination, searchFetcher, searchKey]);

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
