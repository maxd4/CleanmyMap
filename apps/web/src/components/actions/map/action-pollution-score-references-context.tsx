"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, type ReactNode,
} from "react";
import useSWR from "swr";
import {
  type PollutionScoreReferences,
} from "@/lib/actions/pollution/pollution-score";
import {
  ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT,
} from "@/lib/actions/pollution/pollution-score-references-events";
import { swrSupervisionOptions } from "@/lib/swr-config";

type ActionPollutionScoreReferencesContextValue = {
  references: PollutionScoreReferences | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

const DEFAULT_ACTION_POLLUTION_SCORE_REFERENCES_CONTEXT: ActionPollutionScoreReferencesContextValue = {
  references: null,
  isLoading: false,
  error: null,
  reload: () => {},
};

const ActionPollutionScoreReferencesContext =
  createContext<ActionPollutionScoreReferencesContextValue | null>(null);

async function fetchPollutionScoreReferences(): Promise<PollutionScoreReferences | null> {
  const response = await fetch("/api/actions/map/pollution-score-references", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Impossible de charger la référence du score.");
  }
  const payload = (await response.json()) as { references?: PollutionScoreReferences | null };
  return payload.references ?? null;
}

const POLLUTION_SCORE_REFERENCES_KEY = "action-pollution-score-references";

export function ActionPollutionScoreReferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { data, error: fetchError, isLoading, mutate } = useSWR(
    POLLUTION_SCORE_REFERENCES_KEY,
    fetchPollutionScoreReferences,
    {
      ...swrSupervisionOptions,
      // Reference data is reused for five minutes, then refreshed on the next mount.
      revalidateIfStale: true,
    },
  );

  const references = data ?? null;
  const error = fetchError
    ? fetchError instanceof Error && fetchError.message
      ? fetchError.message
      : "Impossible de charger la référence de score."
    : null;

  const reload = useCallback(() => {
    void mutate();
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
      isLoading,
      error,
      reload,
    }),
    [error, isLoading, references, reload],
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
