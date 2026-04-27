import type { SWRConfiguration } from "swr";

export const VIEW_CACHE_TTL_MS = 60_000;

export const swrRecentViewOptions: SWRConfiguration = {
  // Reuse recent in-memory data when returning to a view instead of immediately calling APIs again.
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  dedupingInterval: VIEW_CACHE_TTL_MS,
  keepPreviousData: true,
};

export const swrLiveFeedOptions: SWRConfiguration = {
  ...swrRecentViewOptions,
  revalidateOnFocus: true,
  refreshInterval: 30_000, // Polling every 30s for live streams (community, chat, etc.)
};
