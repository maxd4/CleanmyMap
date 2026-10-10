"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { fetchActionById, type ActionEditorRecord } from "@/lib/actions/http";
import { createInitialFormState } from "./action-declaration/payload";
import { loadDraftSnapshot, saveDraft } from "./action-declaration/draft-storage";
import {
  buildActionPreparationContext,
  type ActionPreparationContext,
} from "@/lib/actions/action-preparation-context";
import { peekPlannerActionHandoff } from "@/lib/route/route-action-handoff";
const preparationActionRequests = new Map<string, Promise<ActionEditorRecord>>();

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
} {
  const [preparationContext, setPreparationContext] = useState<ActionPreparationContext>(() => buildActionPreparationContext({}));
  const [loadedActionId, setLoadedActionId] = useState<string | null | undefined>(undefined);
  const persistedDraftSignatureRef = useRef<string | null>(null);

  const preparationContextReady = loadedActionId === actionId;

  useEffect(() => {
    let active = true;
    const loadContext = async () => {
      const plannerHandoff = peekPlannerActionHandoff();
      const draft = actionId
        ? null
        : loadDraftSnapshot(createInitialFormState(defaultActorName, "action"))?.form;
      let action: Awaited<ReturnType<typeof fetchActionById>> | null = null;
      if (actionId) {
        try {
          action = await loadPreparationAction(actionId);
        } catch { action = null; }
      }
      if (!active) return;
      setPreparationContext(buildActionPreparationContext({ action, draft, plannerHandoff }));
      setLoadedActionId(actionId);
    };
    void loadContext();
    return () => { active = false; };
  }, [actionId, defaultActorName]);

  useEffect(() => {
    if (actionId || !preparationContextReady) return;
    const fallback = createInitialFormState(defaultActorName, "action");
    const draft = loadDraftSnapshot(fallback, "action")?.form ?? fallback;
    const nextDraft = {
      ...draft,
      actionDate: preparationContext.actionDate || draft.actionDate,
      departureTime: preparationContext.departureTime || draft.departureTime,
      preparationChecklist: preparationContext.preparationChecklist ?? draft.preparationChecklist,
      suggestedMaterials: preparationContext.suggestedMaterials ?? draft.suggestedMaterials,
      materialsProvided: preparationContext.materialsProvided ?? draft.materialsProvided,
      recommendedMaterials: preparationContext.recommendedMaterials ?? draft.recommendedMaterials,
    };
    const signature = JSON.stringify({
      actionDate: nextDraft.actionDate,
      departureTime: nextDraft.departureTime,
      preparationChecklist: nextDraft.preparationChecklist,
      suggestedMaterials: nextDraft.suggestedMaterials,
      materialsProvided: nextDraft.materialsProvided,
      recommendedMaterials: nextDraft.recommendedMaterials,
    });
    if (persistedDraftSignatureRef.current === signature) return;
    saveDraft(nextDraft);
    persistedDraftSignatureRef.current = signature;
  }, [actionId, defaultActorName, preparationContext, preparationContextReady]);

  return { preparationContext, setPreparationContext, preparationContextReady };
}
