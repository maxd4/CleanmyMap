import { startTransition, useEffect, useRef, useState } from "react";
import { loadDraftSnapshot } from "../draft-storage";
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

  useEffect(() => {
    const hasLocalDraft = Boolean(loadDraftSnapshot(fallbackFormRef.current, "action", initialActionId ?? null));
    startTransition(() => setPersistenceStatus(hasLocalDraft ? "local" : initialActionId ? "account" : "clean"));
  }, [initialActionId]);

  return { persistenceStatus, setPersistenceStatus };
}
