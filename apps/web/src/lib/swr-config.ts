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

export const swrSupervisionOptions: SWRConfiguration = {
  ...swrRecentViewOptions,
  dedupingInterval: 300_000,
};

export const swrLiveFeedOptions: SWRConfiguration = {
  ...swrRecentViewOptions,
  revalidateOnFocus: true,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  refreshInterval: 300_000, // Live feeds stay warm without retrying every couple of minutes.
};
