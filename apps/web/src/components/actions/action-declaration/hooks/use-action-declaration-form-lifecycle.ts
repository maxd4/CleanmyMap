import { useCallback, useMemo, useState } from "react";
import type {
  ActionDrawing,
  ActionGeometrySource,
} from "@/lib/actions/types";
import {
  createInitialFormState,
} from "../payload";
import type { FormState } from "../model";
import { useActionDeclarationHydration } from "./use-action-declaration-hydration";
import { useActionDeclarationDraft } from "./use-action-declaration-draft";

type ActionDeclarationFormLifecycleParams = {
  defaultActorName: string;
  actorNameOptions: string[];
  userId: string;
  initialActionId?: string | null;
  initialRecordType: "action";
};

export function useActionDeclarationFormLifecycle({
  defaultActorName,
  actorNameOptions,
  userId,
  initialActionId,
  initialRecordType,
}: ActionDeclarationFormLifecycleParams) {
  const resolvedDefaultActorName = actorNameOptions.includes(defaultActorName)
    ? defaultActorName
    : (actorNameOptions[0] ?? userId);
  const createCleanForm = useMemo(
    () => () => createInitialFormState(resolvedDefaultActorName, initialRecordType),
    [initialRecordType, resolvedDefaultActorName],
  );
  const [form, setForm] = useState<FormState>(() => createCleanForm());
  const [manualDrawingState, setManualDrawingState] = useState<ActionDrawing | null>(null);
  const [manualDrawingSourceState, setManualDrawingSourceState] = useState<ActionGeometrySource | null>(null);
  const [persistedDrawing, setPersistedDrawing] = useState<ActionDrawing | null>(null);
  const [persistedDrawingSource, setPersistedDrawingSource] = useState<ActionGeometrySource | null>(null);
  const [gpxError, setGpxError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [manualDrawingEnabled] = useState<boolean>(true);

  const setManualDrawing = useCallback((
    drawing: ActionDrawing | null,
    geometrySource?: ActionGeometrySource | null,
  ) => {
    setManualDrawingState(drawing);
    setManualDrawingSourceState(drawing ? geometrySource ?? "manual" : null);
  }, []);

  const hydration = useActionDeclarationHydration({
    initialActionId,
    createCleanForm,
    setForm,
    setManualDrawingState,
    setManualDrawingSource: setManualDrawingSourceState,
    setPersistedDrawing,
    setPersistedDrawingSource,
  });
  const draft = useActionDeclarationDraft({
    initialActionId,
    createCleanForm,
    setForm,
    setManualDrawingState,
    setManualDrawingSource: setManualDrawingSourceState,
    setHasAttemptedSubmit,
  });

  return {
    form,
    setForm,
    resolvedDefaultActorName,
    manualDrawingEnabled,
    manualDrawing: manualDrawingState,
    manualDrawingSource: manualDrawingSourceState,
    persistedDrawing,
    persistedDrawingSource,
    setPersistedDrawing,
    setPersistedDrawingSource,
    setManualDrawingState,
    setManualDrawingSource: setManualDrawingSourceState,
    setManualDrawing,
    gpxError,
    setGpxError,
    hasAttemptedSubmit,
    setHasAttemptedSubmit,
    hydration,
    draft,
  };
}
