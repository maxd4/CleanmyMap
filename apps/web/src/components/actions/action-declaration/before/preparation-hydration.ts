import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { applyPreparationDataToForm } from "../payload";
import { loadDraftSnapshot, saveDraft } from "../draft-storage";
import { consumePlannerActionHandoff } from "@/lib/route/route-action-handoff";
import { normalizeClockTime } from "@/lib/actions/time-contract";
import type { ActionPreparationContext } from "@/lib/actions/action-preparation-context";
import type { FormState } from "../model";
import { sanitizePreActionForm } from "./model";

type StateSetter<T> = Dispatch<SetStateAction<T>>;

function hasPreparationContextData(context: ActionPreparationContext | undefined): boolean {
  if (!context) return false;
  return Boolean(
    context.actionId ||
      context.locationLabel.trim() ||
      context.actionDate.trim() ||
      context.departureTime.trim() ||
      context.latitude.trim() ||
      context.longitude.trim() ||
      context.plannerHandoff ||
      context.confirmedSelection ||
      context.preparationChecklist ||
      context.suggestedMaterials ||
      context.materialsProvided ||
      context.recommendedMaterials,
  );
}

export function applyPreparationContextToForm(
  form: FormState,
  context?: ActionPreparationContext,
): FormState {
  if (!context) return form;
  const selection = context.confirmedSelection;
  const departureTime = selection?.departureTime
    ? normalizeClockTime(selection.departureTime)
    : normalizeClockTime(context.departureTime);
  return {
    ...form,
    actionDate: selection?.actionDate || form.actionDate.trim() || context.actionDate,
    departureTime: departureTime && (selection?.departureTime || !form.departureTime.trim())
      ? departureTime
      : form.departureTime,
    preparationChecklist: context.preparationChecklist ?? form.preparationChecklist,
    suggestedMaterials: context.suggestedMaterials ?? form.suggestedMaterials,
    materialsProvided: context.materialsProvided ?? form.materialsProvided,
    recommendedMaterials: context.recommendedMaterials ?? form.recommendedMaterials,
  };
}

export function mergePlannerHandoffIntoForm(form: FormState, handoff: ReturnType<typeof consumePlannerActionHandoff>): FormState {
  if (!handoff) return form;
  const preparationData = handoff.preparationData
    ? { ...handoff.preparationData, operationalRoute: handoff.operationalRoute, routeCalibrationContext: handoff.routeCalibrationContext ?? undefined }
    : { operationalRoute: handoff.operationalRoute, routeCalibrationContext: handoff.routeCalibrationContext ?? undefined };
  const prepared = sanitizePreActionForm(applyPreparationDataToForm(form, preparationData));
  const departureCoordinate = handoff.operationalRoute.zones.departure.coordinate;
  if (!prepared.latitude.trim() && !prepared.longitude.trim() && departureCoordinate) {
    prepared.latitude = String(departureCoordinate[0]);
    prepared.longitude = String(departureCoordinate[1]);
  }
  if (prepared.routeTopology === "point_to_point" && !prepared.arrivalCoordinates) {
    const arrivalCoordinate = handoff.operationalRoute.zones.arrival.coordinate;
    if (arrivalCoordinate) prepared.arrivalCoordinates = { latitude: arrivalCoordinate[0], longitude: arrivalCoordinate[1] };
  }
  if (handoff.preparationData?.volunteersExpected !== undefined && !handoff.preparationData.volunteerParticipation) {
    prepared.childrenCount = "";
    prepared.adultCount = "";
    prepared.retiredCount = "";
  }
  return prepared;
}

export function usePlannerActionHandoffHydration({
  initialActionId,
  form,
  setForm,
  onFormChange,
  preparationContext,
}: {
  initialActionId?: string | null;
  form: FormState;
  setForm: StateSetter<FormState>;
  onFormChange?: (form: FormState) => void;
  preparationContext?: ActionPreparationContext;
}) {
  const hydratedRef = useRef(false);
  const formRef = useRef(form);
  const onFormChangeRef = useRef(onFormChange);
  const preparationContextRef = useRef(preparationContext);
  useEffect(() => {
    formRef.current = form;
    onFormChangeRef.current = onFormChange;
    preparationContextRef.current = preparationContext;
  }, [form, onFormChange, preparationContext]);
  useEffect(() => {
    if (initialActionId || hydratedRef.current) return;
    hydratedRef.current = true;
    const handoff = consumePlannerActionHandoff();
    const currentForm = formRef.current;
    const draft = loadDraftSnapshot(currentForm, currentForm.recordType)?.form;
    if (!handoff && !draft && !hasPreparationContextData(preparationContextRef.current)) return;
    const prepared = handoff ? mergePlannerHandoffIntoForm(draft ?? currentForm, handoff) : sanitizePreActionForm(draft ?? currentForm);
    const preparedWithContext = applyPreparationContextToForm(prepared, preparationContextRef.current);
    setForm(preparedWithContext);
    onFormChangeRef.current?.(preparedWithContext);
    if (handoff) saveDraft(preparedWithContext);
  }, [initialActionId, setForm]);
}
