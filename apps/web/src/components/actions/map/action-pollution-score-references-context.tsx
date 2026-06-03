"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_POLLUTION_SCORE_REFERENCES,
  type PollutionScoreReferences,
} from "@/lib/actions/pollution-score";
import {
  ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT,
} from "@/lib/actions/pollution-score-references-events";

type ActionPollutionScoreReferencesContextValue = {
  references: PollutionScoreReferences;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

const DEFAULT_ACTION_POLLUTION_SCORE_REFERENCES_CONTEXT: ActionPollutionScoreReferencesContextValue = {
  references: DEFAULT_POLLUTION_SCORE_REFERENCES,
  isLoading: false,
  error: null,
  reload: () => {},
};

const ActionPollutionScoreReferencesContext =
  createContext<ActionPollutionScoreReferencesContextValue | null>(null);

async function fetchPollutionScoreReferences(
  signal: AbortSignal,
): Promise<PollutionScoreReferences> {
  const response = await fetch("/api/actions/pollution-score-references", {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Impossible de charger la référence de score.");
  }

  const payload = (await response.json()) as {
    wastePerVolunteer?: number;
    buttsPerVolunteer?: number;
  };

  const wastePerVolunteer = Number(payload.wastePerVolunteer ?? 0);
  const buttsPerVolunteer = Number(payload.buttsPerVolunteer ?? 0);

  return {
    wastePerVolunteer:
      Number.isFinite(wastePerVolunteer) && wastePerVolunteer > 0
        ? wastePerVolunteer
        : DEFAULT_POLLUTION_SCORE_REFERENCES.wastePerVolunteer,
    buttsPerVolunteer:
      Number.isFinite(buttsPerVolunteer) && buttsPerVolunteer > 0
        ? buttsPerVolunteer
        : DEFAULT_POLLUTION_SCORE_REFERENCES.buttsPerVolunteer,
  };
}

export function ActionPollutionScoreReferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [references, setReferences] = useState<PollutionScoreReferences>(
    DEFAULT_POLLUTION_SCORE_REFERENCES,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => {
    setReloadTick((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    void fetchPollutionScoreReferences(controller.signal)
      .then((nextReferences) => {
        if (!active) {
          return;
        }
        setError(null);
        setReferences(nextReferences);
        setIsLoading(false);
      })
      .catch((fetchError: unknown) => {
        if (!active) {
          return;
        }
        setReferences(DEFAULT_POLLUTION_SCORE_REFERENCES);
        setError(
          fetchError instanceof Error && fetchError.message
            ? fetchError.message
            : "Impossible de charger la référence de score.",
        );
        setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadTick]);

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
