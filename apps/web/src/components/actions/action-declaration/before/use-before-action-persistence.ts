import { startTransition, useEffect, useRef, useState } from "react";
import { loadDraftSnapshotResult, retryDraftLoad } from "../draft-storage";
import type { FormState } from "../model";
import type { BeforeActionPersistenceStatus } from "./persistence-status";

export function useBeforeActionPersistence({
  fallbackForm,
  initialActionId,
}: {
  fallbackForm: FormState;
  initialActionId?: string | null;
}) {
  const fallbackFormRef = useRef(fallbackForm);
  const [persistenceStatus, setPersistenceStatus] = useState<BeforeActionPersistenceStatus>("clean");
  const [retryGeneration, setRetryGeneration] = useState(0);

  useEffect(() => {
    const draftResult = loadDraftSnapshotResult(fallbackFormRef.current, "action", initialActionId ?? null);
    startTransition(() => {
      setPersistenceStatus(draftResult.readError
        ? "read-error"
        : draftResult.snapshot
          ? "local"
          : initialActionId
            ? "account"
            : "clean");
    });
  }, [initialActionId, retryGeneration]);

  return {
    persistenceStatus,
    setPersistenceStatus,
    retryDraftPersistence: () => {
      retryDraftLoad();
      setRetryGeneration((generation) => generation + 1);
    },
  };
}
