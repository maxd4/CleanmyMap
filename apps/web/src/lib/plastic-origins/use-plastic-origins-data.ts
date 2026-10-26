"use client";

import { useCallback } from "react";
import useSWRImmutable from "swr/immutable";
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

let staticDatasetRequest: Promise<PlasticOriginsDataset> | null = null;

function fetchStaticDataset(url: string): Promise<PlasticOriginsDataset> {
  if (!staticDatasetRequest) {
    staticDatasetRequest = fetch(url, { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Plastic Origins: HTTP ${response.status}`);
        }
        const payload: unknown = await response.json();
        if (!isPlasticOriginsDataset(payload)) {
          throw new Error("Plastic Origins: export statique invalide.");
        }
        return payload;
      })
      .catch((error: unknown) => {
        staticDatasetRequest = null;
        throw error;
      });
  }
  return staticDatasetRequest;
}

export function usePlasticOriginsData(enabled: boolean): PlasticOriginsDataState {
  const { data, error, isLoading, mutate } = useSWRImmutable<PlasticOriginsDataset, Error>(
    enabled ? PLASTIC_ORIGINS_DATA_URL : null,
    fetchStaticDataset,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 300_000,
    },
  );
  const reload = useCallback(() => {
    void mutate().catch(() => undefined);
  }, [mutate]);

  return {
    data: data ?? null,
    error: error instanceof Error ? error : null,
    isLoading,
    reload,
  };
}
