import type { Dispatch, SetStateAction } from "react";
import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  clearDraft,
  loadDraftSnapshot,
  saveDraft,
  subscribeToDraftChanges,
  type ActionDeclarationDraftGeometry,
} from "../draft-storage";
import { consumePlannerActionHandoff } from "@/lib/route/route-action-handoff";
import { applyPlannerActionHandoffToForm } from "../utils/action-declaration-draft.model";
import type {
  FormState,
} from "../model";
import type { ActionDrawing, ActionGeometrySource } from "@/lib/actions/types";

type UseActionDeclarationDraftParams = {
  initialActionId?: string | null;
  createCleanForm: () => FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  setManualDrawingState: Dispatch<SetStateAction<ActionDrawing | null>>;
  setManualDrawingSource: Dispatch<SetStateAction<ActionGeometrySource | null>>;
  setHasAttemptedSubmit: Dispatch<SetStateAction<boolean>>;
};

export function useActionDeclarationDraft({
  initialActionId,
  createCleanForm,
  setForm,
  setManualDrawingState,
  setManualDrawingSource,
  setHasAttemptedSubmit,
}: UseActionDeclarationDraftParams) {
  const pendingDraft = useSyncExternalStore(
    subscribeToDraftChanges,
    () => {
      if (initialActionId) {
        return null;
      }
      // /actions/new is an action-only entry point. Historical clean_place
      // records remain readable when explicitly hydrated by id, but a local
      // draft cannot turn this form back into an observation entry point.
      return loadDraftSnapshot(createCleanForm(), "action");
    },
    () => null,
  );
  const plannerHandoffConsumedRef = useRef<boolean>(false);

  useEffect(() => {
    if (initialActionId || pendingDraft || plannerHandoffConsumedRef.current) {
      return;
    }
    plannerHandoffConsumedRef.current = true;
    const handoff = consumePlannerActionHandoff();
    if (!handoff) return;
    // The planner handoff is an external session-storage snapshot, so hydrate the
    // form once after the client-only boundary has been established.
    setForm((current) => applyPlannerActionHandoffToForm(current, handoff));
  }, [initialActionId, pendingDraft, setForm]);

  const handleResumeDraft = useCallback(() => {
    if (!pendingDraft) return;
    setForm(pendingDraft.form);
    setManualDrawingState(pendingDraft.manualDrawing ?? null);
    setManualDrawingSource(pendingDraft.manualDrawingSource ?? null);
    clearDraft();
    setHasAttemptedSubmit(false);
  }, [
    pendingDraft,
    setForm,
    setHasAttemptedSubmit,
    setManualDrawingSource,
    setManualDrawingState,
  ]);

  const handleIgnoreDraft = useCallback(() => {
    clearDraft();
    setForm(createCleanForm());
    setHasAttemptedSubmit(false);
  }, [createCleanForm, setForm, setHasAttemptedSubmit]);

  const saveDraftIfAllowed = useCallback(
    (
      form: FormState,
      draftGeometry?: ActionDeclarationDraftGeometry,
      shouldSave = true,
    ) => {
      if (!pendingDraft && shouldSave) {
        saveDraft(form, undefined, draftGeometry);
      }
    },
    [pendingDraft],
  );

  return {
    pendingDraft,
    saveDraftIfAllowed,
    clearDraft,
    handleResumeDraft,
    handleIgnoreDraft,
  };
}
