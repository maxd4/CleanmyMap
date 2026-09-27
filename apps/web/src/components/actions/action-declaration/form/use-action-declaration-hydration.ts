import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import {
  fetchActionById,
  type ActionEditorRecord,
} from "@/lib/actions/http";
import type {
  ActionDrawing,
  ActionGeometrySource,
} from "@/lib/actions/types";
import {
  buildActionDeclarationHydration,
  type LoadedActionPhase,
} from "./action-declaration-hydration.model";
import type { FormState } from "./model";

type SetFormState = Dispatch<SetStateAction<FormState>>;

type UseActionDeclarationHydrationParams = {
  initialActionId?: string | null;
  createCleanForm: () => FormState;
  setForm: SetFormState;
  setManualDrawingState: Dispatch<SetStateAction<ActionDrawing | null>>;
  setManualDrawingSource: Dispatch<SetStateAction<ActionGeometrySource | null>>;
  setPersistedDrawing: Dispatch<SetStateAction<ActionDrawing | null>>;
  setPersistedDrawingSource: Dispatch<SetStateAction<ActionGeometrySource | null>>;
};

export function useActionDeclarationHydration({
  initialActionId,
  createCleanForm,
  setForm,
  setManualDrawingState,
  setManualDrawingSource,
  setPersistedDrawing,
  setPersistedDrawingSource,
}: UseActionDeclarationHydrationParams) {
  const [loadedActionPhase, setLoadedActionPhase] =
    useState<LoadedActionPhase>(null);
  const [isHydratingAction, setIsHydratingAction] = useState<boolean>(
    Boolean(initialActionId),
  );
  const [hydrationError, setHydrationError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialActionId) {
      return;
    }

    let active = true;

    fetchActionById(initialActionId)
      .then((action: ActionEditorRecord) => {
        if (!active) {
          return;
        }

        const hydrated = buildActionDeclarationHydration(
          createCleanForm(),
          action,
        );
        setLoadedActionPhase(hydrated.loadedActionPhase);
        setForm(hydrated.form);
        setManualDrawingState(hydrated.geometry.manualDrawing);
        setManualDrawingSource(hydrated.geometry.manualDrawingSource);
        setPersistedDrawing(hydrated.geometry.reconstructedDrawing);
        setPersistedDrawingSource(hydrated.geometry.reconstructedSource);
        setIsHydratingAction(false);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setHydrationError(
          error instanceof Error && error.message
            ? error.message
            : "Impossible de charger le formulaire existant.",
        );
        setIsHydratingAction(false);
      });

    return () => {
      active = false;
    };
  }, [
    createCleanForm,
    initialActionId,
    setForm,
    setManualDrawingSource,
    setManualDrawingState,
    setPersistedDrawing,
    setPersistedDrawingSource,
  ]);

  return {
    loadedActionPhase,
    setLoadedActionPhase,
    isHydratingAction,
    hydrationError,
  };
}
