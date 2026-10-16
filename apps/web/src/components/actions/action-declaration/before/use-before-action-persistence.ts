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
  const [persistenceStatus, setPersistenceStatus] = useState<BeforeActionPersistenceStatus>(() =>
    resolvePersistenceStatus(
      loadDraftSnapshotResult(fallbackForm, "action", initialActionId ?? null),
      initialActionId,
    ),
  );
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
