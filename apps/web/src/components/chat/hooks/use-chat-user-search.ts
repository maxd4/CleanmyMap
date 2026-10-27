"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import type { ChatUsersResponse } from "../chat-types";

type FetcherErrorPayload = {
  hint?: unknown;
  message?: unknown;
};

export const CHAT_USER_QUERY_DEBOUNCE_MS = 250;

export async function fetchChatJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const payload = (await response.json().catch(() => ({}))) as FetcherErrorPayload;

  if (!response.ok) {
    throw new Error(
      typeof payload.hint === "string"
        ? payload.hint
        : typeof payload.message === "string"
          ? payload.message
          : "La requête de messagerie est momentanément indisponible.",
    );
  }

  return payload as T;
}

export function useDebouncedChatQuery(query: string): string {
  const [debouncedQuery, setDebouncedQuery] = useState(() => query.trim());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, CHAT_USER_QUERY_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  return debouncedQuery;
}

export function useChatUserSearch({
  mentionUsersKey,
  dmUsersKey,
}: {
  mentionUsersKey: string | null;
  dmUsersKey: string | null;
}) {
  const mentionSearchAbortRef = useRef<AbortController | null>(null);
  const dmSearchAbortRef = useRef<AbortController | null>(null);
  const fetchUserSearch = useCallback(async (
    url: string,
    abortRef: { current: AbortController | null },
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      return await fetchChatJson<ChatUsersResponse>(url, controller.signal);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, []);

  const fetchMentionUsers = useCallback(
    (url: string) => fetchUserSearch(url, mentionSearchAbortRef),
    [fetchUserSearch],
  );
  const fetchDmUsers = useCallback(
    (url: string) => fetchUserSearch(url, dmSearchAbortRef),
    [fetchUserSearch],
  );

  useEffect(() => () => {
    mentionSearchAbortRef.current?.abort();
    dmSearchAbortRef.current?.abort();
  }, []);
  useEffect(() => {
    if (!mentionUsersKey && !dmUsersKey) {
      mentionSearchAbortRef.current?.abort();
      dmSearchAbortRef.current?.abort();
    }
  }, [dmUsersKey, mentionUsersKey]);

  const swrOptions = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30_000,
  } as const;
  const { data: mentionUsersData } = useSWR<ChatUsersResponse>(
    mentionUsersKey,
    fetchMentionUsers,
    swrOptions,
  );
  const { data: dmUsersData } = useSWR<ChatUsersResponse>(
    dmUsersKey,
    fetchDmUsers,
    swrOptions,
  );

  return { mentionUsersData, dmUsersData };
}
