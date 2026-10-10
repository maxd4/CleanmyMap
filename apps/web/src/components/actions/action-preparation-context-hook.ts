"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { fetchActionById, type ActionEditorRecord } from "@/lib/actions/http";
import { createInitialFormState } from "./action-declaration/payload";
import type { FormState } from "./action-declaration/model";
import { clearDraft, loadDraftSnapshot, saveDraft } from "./action-declaration/draft-storage";
import {
  buildActionPreparationContext,
  type ActionPreparationPersistenceStatus,
  type ActionPreparationContext,
} from "@/lib/actions/action-preparation-context";
import { peekPlannerActionHandoff } from "@/lib/route/route-action-handoff";
const preparationActionRequests = new Map<string, Promise<ActionEditorRecord>>();

function preparationDraftSignature(
  context: ActionPreparationContext,
  fallback: Pick<FormState, "actionDate" | "departureTime" | "locationLabel" | "latitude" | "longitude" | "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials">,
): string {
  return JSON.stringify({
    actionDate: context.actionDate || fallback.actionDate,
    departureTime: context.departureTime || fallback.departureTime,
    locationLabel: context.locationLabel || fallback.locationLabel,
    latitude: context.latitude || fallback.latitude,
    longitude: context.longitude || fallback.longitude,
    preparationChecklist: context.preparationChecklist ?? fallback.preparationChecklist,
    suggestedMaterials: context.suggestedMaterials ?? fallback.suggestedMaterials,
    materialsProvided: context.materialsProvided ?? fallback.materialsProvided,
    recommendedMaterials: context.recommendedMaterials ?? fallback.recommendedMaterials,
  });
}

export function loadPreparationAction(actionId: string): Promise<ActionEditorRecord> {
  const cached = preparationActionRequests.get(actionId);
  if (cached) return cached;

  const request = fetchActionById(actionId);
  preparationActionRequests.set(actionId, request);
  return request;
}

export function useActionPreparationContext({
  defaultActorName,
  actionId,
}: {
  defaultActorName: string;
  actionId: string | null;
}): {
  preparationContext: ActionPreparationContext;
  setPreparationContext: Dispatch<SetStateAction<ActionPreparationContext>>;
  preparationContextReady: boolean;
  preparationPersistenceStatus: ActionPreparationPersistenceStatus;
  markPreparationPersisted: (persistedActionId?: string | null) => void;
} {
  const [preparationContext, setPreparationContext] = useState<ActionPreparationContext>(() => buildActionPreparationContext({}));
  const [loadedActionId, setLoadedActionId] = useState<string | null | undefined>(undefined);
  const [preparationPersistenceStatus, setPreparationPersistenceStatus] = useState<ActionPreparationPersistenceStatus>("saved");
  const persistedDraftSignatureRef = useRef<string | null>(null);

  const preparationContextReady = loadedActionId === actionId;
  const setPreparationContextWithDraftStatus = useCallback<Dispatch<SetStateAction<ActionPreparationContext>>>((update) => {
    setPreparationPersistenceStatus("draft");
    setPreparationContext(update);
  }, []);

  useEffect(() => {
    let active = true;
    const loadContext = async () => {
      const plannerHandoff = peekPlannerActionHandoff();
      const fallback = createInitialFormState(defaultActorName, "action");
      let action: Awaited<ReturnType<typeof fetchActionById>> | null = null;
      if (actionId) {
        try {
          action = await loadPreparationAction(actionId);
        } catch { action = null; }
      }
      const draftSnapshot = loadDraftSnapshot(fallback, "action", actionId);
      if (!active) return;
      const nextContext = buildActionPreparationContext({
        action,
        draft: draftSnapshot?.form,
        plannerHandoff,
        draftOverridesAction: Boolean(actionId && draftSnapshot),
      });
      persistedDraftSignatureRef.current = actionId || draftSnapshot
        ? preparationDraftSignature(nextContext, draftSnapshot?.form ?? fallback)
        : null;
      setPreparationContext(nextContext);
      setPreparationPersistenceStatus(draftSnapshot ? "draft" : "saved");
      setLoadedActionId(actionId);
    };
    void loadContext();
    return () => { active = false; };
  }, [actionId, defaultActorName]);

  useEffect(() => {
    if (!preparationContextReady) return;
    const fallback = createInitialFormState(defaultActorName, "action");
    const draft = loadDraftSnapshot(fallback, "action", actionId)?.form ?? fallback;
    const nextDraft = {
      ...draft,
      actionDate: preparationContext.actionDate || draft.actionDate,
      departureTime: preparationContext.departureTime || draft.departureTime,
      locationLabel: preparationContext.locationLabel || draft.locationLabel,
      latitude: preparationContext.latitude || draft.latitude,
      longitude: preparationContext.longitude || draft.longitude,
      preparationChecklist: preparationContext.preparationChecklist ?? draft.preparationChecklist,
      suggestedMaterials: preparationContext.suggestedMaterials ?? draft.suggestedMaterials,
      materialsProvided: preparationContext.materialsProvided ?? draft.materialsProvided,
      recommendedMaterials: preparationContext.recommendedMaterials ?? draft.recommendedMaterials,
    };
    const signature = preparationDraftSignature(preparationContext, draft);
    if (persistedDraftSignatureRef.current === signature) return;
    try {
      const savedAt = saveDraft(nextDraft, undefined, null, actionId);
      if (!savedAt) throw new Error("Le brouillon local n’est pas disponible.");
      persistedDraftSignatureRef.current = signature;
    } catch {
      queueMicrotask(() => setPreparationPersistenceStatus("error"));
    }
  }, [actionId, defaultActorName, preparationContext, preparationContextReady]);

  const markPreparationPersisted = (persistedActionId: string | null = actionId) => {
    if (persistedActionId) clearDraft(persistedActionId);
    const signature = preparationDraftSignature(
      preparationContext,
      createInitialFormState(defaultActorName, "action"),
    );
    persistedDraftSignatureRef.current = signature;
    setPreparationPersistenceStatus("saved");
  };

  return {
    preparationContext,
    setPreparationContext: setPreparationContextWithDraftStatus,
    preparationContextReady,
    preparationPersistenceStatus,
    markPreparationPersisted,
  };
}
