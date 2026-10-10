import { useState } from "react";
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
  const [persistenceStatus, setPersistenceStatus] = useState<BeforeActionPersistenceStatus>(() => {
    const hasLocalDraft = Boolean(loadDraftSnapshot(fallbackForm, "action", initialActionId ?? null));
    return hasLocalDraft ? "local" : initialActionId ? "account" : "clean";
  });

  return { persistenceStatus, setPersistenceStatus };
}
