"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, type ReactNode,
} from "react";
import useSWR from "swr";
import {
  type PollutionScoreReferences,
} from "@/lib/actions/pollution/pollution-score";
import type { ActionCollectionReferenceAverages } from "@/lib/actions/action-collection-reference-averages";
import {
  ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT,
} from "@/lib/actions/pollution/pollution-score-references-events";
import { swrSupervisionOptions } from "@/lib/swr-config";

type ActionPollutionScoreReferencesContextValue = {
  references: PollutionScoreReferences | null;
  collectionReferences: ActionCollectionReferenceAverages | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

type ActionPollutionScoreReferencePayload = {
  references: PollutionScoreReferences | null;
  collectionReferences: ActionCollectionReferenceAverages | null;
};

const DEFAULT_ACTION_POLLUTION_SCORE_REFERENCES_CONTEXT: ActionPollutionScoreReferencesContextValue = {
  references: null,
  collectionReferences: null,
  isLoading: false,
  error: null,
  reload: () => {},
};

const ActionPollutionScoreReferencesContext =
  createContext<ActionPollutionScoreReferencesContextValue | null>(null);

async function fetchPollutionScoreReferences(): Promise<ActionPollutionScoreReferencePayload> {
  const response = await fetch("/api/actions/map/pollution-score-references", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Impossible de charger la référence du score.");
  }
  const payload = (await response.json()) as {
    references?: PollutionScoreReferences | null;
    collectionReferences?: ActionCollectionReferenceAverages | null;
  };
  return {
    references: payload.references ?? null,
    collectionReferences: payload.collectionReferences ?? null,
  };
}

const POLLUTION_SCORE_REFERENCES_KEY = "action-pollution-score-references";

export function ActionPollutionScoreReferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { data, error: fetchError, isLoading, mutate } = useSWR<ActionPollutionScoreReferencePayload, unknown>(
    POLLUTION_SCORE_REFERENCES_KEY,
    fetchPollutionScoreReferences,
    {
      ...swrSupervisionOptions,
      // Reference data is reused for five minutes, then refreshed on the next mount.
      revalidateIfStale: true,
    },
  );

  const references = data?.references ?? null;
  const collectionReferences = data?.collectionReferences ?? null;
  const error = fetchError
    ? fetchError instanceof Error && fetchError.message
      ? fetchError.message
      : "Impossible de charger la référence de score."
    : null;

  const reload = useCallback(() => {
    void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ mutate();
  }, [mutate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleInvalidation = () => {
      reload();
    };

    window.addEventListener(
      ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT,
      handleInvalidation,
    );

    return () => {
      window.removeEventListener(
        ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT,
        handleInvalidation,
      );
    };
  }, [reload]);

  const value = useMemo(
    () => ({
      references,
      collectionReferences,
      isLoading,
      error,
      reload,
    }),
    [collectionReferences, error, isLoading, references, reload],
  );

  return (
    <ActionPollutionScoreReferencesContext.Provider value={value}>
      {children}
    </ActionPollutionScoreReferencesContext.Provider>
  );
}

export function useActionPollutionScoreReferences() {
  const context = useContext(ActionPollutionScoreReferencesContext);

  if (!context) {
    return DEFAULT_ACTION_POLLUTION_SCORE_REFERENCES_CONTEXT;
  }

  return context;
}
