"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { FormState } from "./action-declaration/model";
import { invalidateActionWorkflow, type ActionWorkflowState } from "@/lib/actions/action-workflow";
import { resolvePreparationSelection, type ActionPreparationContext, type PreparationSelection } from "@/lib/actions/action-preparation-context";

function nextPreparationContextFromForm(context: ActionPreparationContext, form: FormState): ActionPreparationContext {
  const actionDate = form.actionDate.trim();
  return {
    ...context,
    locationLabel: form.departureLocationLabel.trim() || form.locationLabel.trim(),
    actionDate,
    departureTime: form.departureTime.trim(),
    latitude: form.latitude.trim(),
    longitude: form.longitude.trim(),
    confirmedSelection: context.confirmedSelection && context.confirmedSelection.actionDate === actionDate ? context.confirmedSelection : null,
    preparationChecklist: form.preparationChecklist,
    suggestedMaterials: form.suggestedMaterials,
    materialsProvided: form.materialsProvided,
    recommendedMaterials: form.recommendedMaterials,
  };
}

export function useActionCreationPreparationSync({
  preparationContext,
  setPreparationContext,
  setWorkflow,
}: {
  preparationContext: ActionPreparationContext;
  setPreparationContext: Dispatch<SetStateAction<ActionPreparationContext>>;
  setWorkflow: Dispatch<SetStateAction<ActionWorkflowState>>;
}) {
  const handleBeforeFormChange = useCallback((form: FormState) => {
    const next = nextPreparationContextFromForm(preparationContext, form);
    if (preparationContext.actionDate && preparationContext.actionDate !== next.actionDate) {
      setWorkflow((current) => invalidateActionWorkflow(current, "date_time"));
    } else if (preparationContext.locationLabel && preparationContext.locationLabel !== next.locationLabel) {
      setWorkflow((current) => invalidateActionWorkflow(current, "location"));
    } else if (
      JSON.stringify(preparationContext.preparationChecklist) !== JSON.stringify(next.preparationChecklist) ||
      JSON.stringify(preparationContext.suggestedMaterials) !== JSON.stringify(next.suggestedMaterials) ||
      preparationContext.materialsProvided !== next.materialsProvided ||
      preparationContext.recommendedMaterials !== next.recommendedMaterials
    ) {
      setWorkflow((current) => invalidateActionWorkflow(current, "preparation"));
    }
    setPreparationContext(next);
  }, [preparationContext, setPreparationContext, setWorkflow]);

  const handlePreparationSelection = useCallback((selection: PreparationSelection, decision: "ask" | "replace" | "preserve" = "ask") => {
    const result = resolvePreparationSelection(preparationContext, selection, decision);
    setPreparationContext(result.context);
    if (result.status === "applied" && (result.context.actionDate !== preparationContext.actionDate || result.context.departureTime !== preparationContext.departureTime)) {
      setWorkflow((current) => invalidateActionWorkflow(current, "date_time"));
    }
    return result;
  }, [preparationContext, setPreparationContext, setWorkflow]);

  const handlePreparationContextChange = useCallback((update: Partial<Pick<ActionPreparationContext, "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials">>) => {
    setPreparationContext((current) => ({ ...current, ...update }));
    setWorkflow((current) => invalidateActionWorkflow(current, "preparation"));
  }, [setPreparationContext, setWorkflow]);

  return { handleBeforeFormChange, handlePreparationSelection, handlePreparationContextChange };
}
