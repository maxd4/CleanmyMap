import { startTransition, useEffect, useRef, useState } from "react";
import { loadDraftSnapshotResult, retryDraftLoad } from "../draft-storage";
import type { FormState } from "../model";
import type { BeforeActionPersistenceStatus } from "./persistence-status";

function resolvePersistenceStatus(
  draftResult: ReturnType<typeof loadDraftSnapshotResult>,
  initialActionId?: string | null,
): BeforeActionPersistenceStatus {
  if (draftResult.readError) return "read-error";
  if (draftResult.snapshot) return "local";
  return initialActionId ? "account" : "clean";
}

export function useBeforeActionPersistence({
  fallbackForm,
  initialActionId,
}: {
  fallbackForm: FormState;
  initialActionId?: string | null;
}) {
  const fallbackFormRef = useRef(fallbackForm);
  // Keep the first render identical on the server and client. localStorage is
  // only available in the browser, so resolving it in the state initializer
  // otherwise changes the markup during hydration when a draft exists.
  const [persistenceStatus, setPersistenceStatus] = useState<BeforeActionPersistenceStatus>("clean");
  const [retryGeneration, setRetryGeneration] = useState(0);

  useEffect(() => {
    const draftResult = loadDraftSnapshotResult(fallbackFormRef.current, "action", initialActionId ?? null);
    startTransition(() => {
      setPersistenceStatus(resolvePersistenceStatus(draftResult, initialActionId));
    });
  }, [initialActionId, retryGeneration]);

  return {
    persistenceStatus,
    setPersistenceStatus,
    retryGeneration,
    retryDraftPersistence: () => {
      retryDraftLoad();
      setRetryGeneration((generation) => generation + 1);
    },
  };
}
