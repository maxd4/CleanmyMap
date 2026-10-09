"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { fetchActionById } from "@/lib/actions/http";
import { createInitialFormState } from "./action-declaration/payload";
import { loadDraftSnapshot } from "./action-declaration/draft-storage";
import {
  buildActionPreparationContext,
  type ActionPreparationContext,
} from "@/lib/actions/action-preparation-context";
import { peekPlannerActionHandoff } from "@/lib/route/route-action-handoff";

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
  const [preparationContextReady, setPreparationContextReady] = useState(false);

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
          action = await fetchActionById(actionId);
        } catch {
          // The form remains usable with the current draft or a matching route handoff.
        }
      }
      if (!active) return;
      setPreparationContext(buildActionPreparationContext({ action, draft, plannerHandoff }));
      setPreparationContextReady(true);
    };
    void loadContext();
    return () => { active = false; };
  }, [actionId, defaultActorName]);

  return { preparationContext, setPreparationContext, preparationContextReady };
}
