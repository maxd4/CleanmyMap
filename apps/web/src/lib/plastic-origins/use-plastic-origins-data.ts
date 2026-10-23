"use client";

import { useCallback } from "react";
import useSWR from "swr";
import {
  isPlasticOriginsDataset,
  PLASTIC_ORIGINS_DATA_URL,
  type PlasticOriginsDataset,
} from "./contract";

export type PlasticOriginsDataState = {
  data: PlasticOriginsDataset | null;
  error: Error | null;
  isLoading: boolean;
  reload: () => void;
};

export function usePlasticOriginsData(enabled: boolean): PlasticOriginsDataState {
  const { data, error, isLoading, mutate } = useSWR<PlasticOriginsDataset>(
    enabled ? PLASTIC_ORIGINS_DATA_URL : null,
    async (url: string) => {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) {
        throw new Error(`Plastic Origins: HTTP ${response.status}`);
      }
      const payload: unknown = await response.json();
      if (!isPlasticOriginsDataset(payload)) {
        throw new Error("Plastic Origins: export statique invalide.");
      }
      return payload;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 300_000,
    },
  );
  const reload = useCallback(() => {
    void mutate();
  }, [mutate]);

  return {
    data: data ?? null,
    error: error instanceof Error ? error : null,
    isLoading,
    reload,
  };
}
