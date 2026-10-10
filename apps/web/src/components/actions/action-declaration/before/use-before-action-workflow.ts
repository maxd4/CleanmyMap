import { type FormEvent, type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import {
  createInitialFormState,
  applyPreparationDataToForm,
  normalizeParticipantAccounts,
  parseOrganizerAccounts,
} from "../payload";
import { clearDraft, saveDraft, loadDraftSnapshot } from "../draft-storage";
import { consumePlannerActionHandoff } from "@/lib/route/route-action-handoff";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import { createAction, fetchActionById, publishAction, updateAction, type ActionEditorRecord } from "@/lib/actions/http";
import { loadPreparationAction } from "../../action-preparation-context-hook";
import type { FormState } from "../model";
import type { CreateActionPayload } from "@/lib/actions/types";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import {
  isResumablePreAction,
  sanitizePreActionForm,
  type ActionBeforeDeclarationFormProps,
  type BeforeActionFieldUpdater,
  type TerminalPreActionStatus,
} from "./model";
import { applyOrganizerFormUpdates } from "./organizer-form-state";
import { buildBeforeActionPayload, validateBeforeActionForm, type BeforeValidationField } from "./form-logic";
import type { ActionPreparationContext } from "@/lib/actions/action-preparation-context";
import { applyPreparationContextToForm, mergePlannerHandoffIntoForm, usePlannerActionHandoffHydration } from "./preparation-hydration";
export { applyPreparationContextToForm } from "./preparation-hydration";

type SubmissionState = "idle" | "pending" | "success" | "error";
type PublicationState = "idle" | "pending" | "success" | "error";
type StateSetter<T> = Dispatch<SetStateAction<T>>;
type BeforeActionRecordSetters = {
  setForm: StateSetter<FormState>;
  onFormChange?: (form: FormState) => void;
  setCreatedId: StateSetter<string | null>;
  setPublishedAction: StateSetter<ActionEditorRecord | null>;
  setPublishedAt: StateSetter<string | null>;
  setTerminalActionStatus: StateSetter<TerminalPreActionStatus | null>;
  setSubmissionState: StateSetter<SubmissionState>;
};

function sameFormValue(current: unknown, next: unknown): boolean {
  return JSON.stringify(current ?? null) === JSON.stringify(next ?? null);
}

export function mergeBeforeActionHydrationWithLocalChanges(
  initialForm: FormState,
  currentForm: FormState,
  hydratedForm: FormState,
): FormState {
  const merged = { ...hydratedForm };
  for (const key of Object.keys(currentForm) as Array<keyof FormState>) {
    if (!sameFormValue(initialForm[key], currentForm[key])) {
      merged[key] = currentForm[key] as never;
    }
  }
  return merged;
}

function createInitialBeforeActionForm(
  actorName: string,
  recordType: "action",
): FormState {
  return {
    ...createInitialFormState(actorName, recordType),
    volunteersCount: "",
    childrenCount: "",
    adultCount: "",
    retiredCount: "",
  };
}

export async function persistBeforeAction(
  actionId: string | null | undefined,
  payload: CreateActionPayload,
  dependencies: { create: typeof createAction; update: typeof updateAction } = { create: createAction, update: updateAction },
): Promise<{ actionId: string; created: boolean }> {
  const result = actionId ? await dependencies.update(actionId, payload) : await dependencies.create(payload);
  return { actionId: "id" in result ? result.id : result.actionId, created: !actionId };
}

function applyFetchedBeforeAction({
  action,
  resolvedDefaultActorName,
  initialRecordType,
  setForm,
  onFormChange,
  setCreatedId,
  setPublishedAction,
  setPublishedAt,
  setTerminalActionStatus,
  setSubmissionState,
  setIsHydratingAction,
  preparationContext,
  initialForm,
  currentForm,
}: {
  action: Awaited<ReturnType<typeof fetchActionById>>;
  resolvedDefaultActorName: string;
  initialRecordType: "action";
  setIsHydratingAction: StateSetter<boolean>;
  preparationContext?: ActionPreparationContext;
  initialForm: FormState;
  currentForm: FormState;
} & BeforeActionRecordSetters) {
  if (action.actionPhase !== "pre_action") throw new Error("Cette action n'est plus une pré-action publiable.");
  if (!isResumablePreAction(action)) {
    if (action.status !== "rejected" && action.status !== "cancelled") throw new Error("Cette pré-action ne peut pas être reprise dans ce parcours.");
    setCreatedId(action.id); setPublishedAction(action); setPublishedAt(null); setTerminalActionStatus(action.status); setSubmissionState("success"); setIsHydratingAction(false); return;
  }
  const nextForm = buildBeforeActionFormFromAction({
    action,
    resolvedDefaultActorName,
    initialRecordType,
  });
  const handoff = consumePlannerActionHandoff();
  const matchingHandoff = handoff?.actionId === action.id ? handoff : null;
  const hydratedForm = applyPreparationContextToForm(
    mergePlannerHandoffIntoForm(nextForm, matchingHandoff),
    preparationContext,
  );
  const preservedForm = mergeBeforeActionHydrationWithLocalChanges(initialForm, currentForm, hydratedForm);
  setForm(preservedForm); onFormChange?.(preservedForm); setCreatedId(action.id); setPublishedAction(action); setPublishedAt(action.publishedAt ?? null); setTerminalActionStatus(null); setSubmissionState(matchingHandoff ? "idle" : "success"); setIsHydratingAction(false);
}

export function buildBeforeActionFormFromAction({
  action,
  resolvedDefaultActorName,
  initialRecordType,
}: {
  action: Awaited<ReturnType<typeof fetchActionById>>;
  resolvedDefaultActorName: string;
  initialRecordType: "action";
}): FormState {
  const hydrated = sanitizePreActionForm(
    applyPreparationDataToForm(
      createInitialBeforeActionForm(resolvedDefaultActorName, initialRecordType),
      action.preparationData,
    ),
  );
  const routeTopology = resolveActionRouteTopology({
    topology: action.preparationData?.routeTopology,
    arrivalLocationLabel: action.arrivalLocationLabel ?? hydrated.arrivalLocationLabel,
    recordType: "action",
  });
  return {
    ...hydrated,
    ...buildBeforeActionIdentityFields(action, hydrated),
    ...buildBeforeActionLocationFields(action, hydrated, routeTopology),
    ...buildBeforeActionTimingFields(action, hydrated),
  };
}

type BeforeActionIdentityFields = Pick<
  FormState,
  | "actorName"
  | "associationName"
  | "organizerType"
  | "organizerId"
  | "organizerName"
  | "organizerAccounts"
  | "participantAccounts"
  | "groupJoinEnabled"
>;

function buildBeforeActionIdentityFields(
  action: Awaited<ReturnType<typeof fetchActionById>>,
  hydrated: FormState,
): BeforeActionIdentityFields {
  return {
    actorName: action.actorName ?? hydrated.actorName,
    associationName: action.associationName ?? hydrated.associationName,
    organizerType: action.organizerType ?? hydrated.organizerType,
    organizerId: action.organizerId ?? hydrated.organizerId,
    organizerName:
      action.organizerName ??
      (action.organizerType === "spontaneous"
        ? hydrated.organizerName
        : action.associationName ?? hydrated.organizerName),
    organizerAccounts: parseOrganizerAccounts(
      action.organizerAccounts?.join(", ") ?? hydrated.organizerAccounts,
    ).join(", "),
    groupJoinEnabled: action.groupJoinEnabled,
    participantAccounts: normalizeParticipantAccounts(action.participantAccounts),
  };
}

function buildBeforeActionLocationFields(
  action: Awaited<ReturnType<typeof fetchActionById>>,
  hydrated: FormState,
  routeTopology: FormState["routeTopology"],
): Pick<FormState, "actionDate" | "locationLabel" | "departureLocationLabel" | "arrivalLocationLabel" | "routeTopology" | "latitude" | "longitude"> {
  return {
    actionDate: action.actionDate,
    locationLabel: action.locationLabel,
    departureLocationLabel: action.departureLocationLabel ?? hydrated.departureLocationLabel,
    arrivalLocationLabel: routeTopology === "point_to_point" ? action.arrivalLocationLabel ?? hydrated.arrivalLocationLabel : "",
    routeTopology,
    latitude: typeof action.latitude === "number" && Number.isFinite(action.latitude) ? String(action.latitude) : hydrated.latitude,
    longitude: typeof action.longitude === "number" && Number.isFinite(action.longitude) ? String(action.longitude) : hydrated.longitude,
  };
}

function buildBeforeActionTimingFields(
  action: Awaited<ReturnType<typeof fetchActionById>>,
  hydrated: FormState,
): Pick<FormState, "eventStartTime" | "eventEndTime" | "volunteersCount" | "durationMinutes"> {
  return {
    eventStartTime: action.eventStartTime ?? hydrated.eventStartTime,
    eventEndTime: action.eventEndTime ?? hydrated.eventEndTime,
    volunteersCount: typeof action.preparationData?.volunteersExpected === "number" ? String(action.preparationData.volunteersExpected) : "",
    durationMinutes: resolveActionDurationInput(action),
  };
}

function resolveActionDurationInput(
  action: Awaited<ReturnType<typeof fetchActionById>>,
): string {
  if (action.preparationData?.durationMinutesDeclared === true) {
    return String(action.durationMinutes);
  }
  if (typeof action.preparationData?.estimatedDurationMinutes === "number") {
    return String(action.preparationData.estimatedDurationMinutes);
  }
  return action.durationMinutes > 0 ? String(action.durationMinutes) : "";
}

export function buildBeforeActionFallbackForm(actorNameOptions: string[], defaultActorName: string, initialRecordType: "action"): FormState {
  return sanitizePreActionForm(
    createInitialBeforeActionForm(
      actorNameOptions.includes(defaultActorName) ? defaultActorName : actorNameOptions[0] ?? defaultActorName,
      initialRecordType,
    ),
  );
}

export function buildBeforeActionInitialForm(actorNameOptions: string[], defaultActorName: string, initialRecordType: "action"): FormState {
  const fallback = buildBeforeActionFallbackForm(actorNameOptions, defaultActorName, initialRecordType);
  const snapshot = loadDraftSnapshot(fallback, initialRecordType);
  return sanitizePreActionForm(snapshot?.form ?? fallback);
}

export function useBeforeActionHydration({
  resolvedDefaultActorName,
  initialActionId,
  initialRecordType,
  form,
  setForm,
  onFormChange,
  setCreatedId,
  setPublishedAction,
  setPublishedAt,
  setTerminalActionStatus,
  setSubmissionState,
  setErrorMessage,
  preparationContext,
}: {
  resolvedDefaultActorName: string;
  initialActionId?: string | null;
  initialRecordType: "action";
  form: FormState;
  setErrorMessage: StateSetter<string | null>;
  preparationContext?: ActionPreparationContext;
} & BeforeActionRecordSetters) {
  const [isHydratingAction, setIsHydratingAction] = useState(Boolean(initialActionId));
  const initialFormRef = useRef(form);
  const currentFormRef = useRef(form);
  const onFormChangeRef = useRef(onFormChange);
  const preparationContextRef = useRef(preparationContext);
  const resolvedDefaultActorNameRef = useRef(resolvedDefaultActorName);
  const actionIdRef = useRef(initialActionId);
  useEffect(() => {
    if (actionIdRef.current !== initialActionId) {
      actionIdRef.current = initialActionId;
      initialFormRef.current = form;
    }
    currentFormRef.current = form;
    onFormChangeRef.current = onFormChange;
    preparationContextRef.current = preparationContext;
    resolvedDefaultActorNameRef.current = resolvedDefaultActorName;
  }, [form, initialActionId, onFormChange, preparationContext, resolvedDefaultActorName]);

  useEffect(() => {
    if (!initialActionId) {
      return;
    }
    let active = true;
    loadPreparationAction(initialActionId).then((action) => {
      if (!active) return;
      applyFetchedBeforeAction({
        action,
        resolvedDefaultActorName: resolvedDefaultActorNameRef.current,
        initialRecordType,
        setForm,
        onFormChange: onFormChangeRef.current,
        setCreatedId,
        setPublishedAction,
        setPublishedAt,
        setTerminalActionStatus,
        setSubmissionState,
        setIsHydratingAction,
        preparationContext: preparationContextRef.current,
        initialForm: initialFormRef.current,
        currentForm: currentFormRef.current,
      });
    }).catch((error: unknown) => {
      if (!active) return;
      setErrorMessage(error instanceof Error && error.message ? error.message : "Impossible de reprendre cette pré-action pour le moment."); setSubmissionState("error"); setIsHydratingAction(false);
    });
    return () => { active = false; };
  }, [initialActionId, initialRecordType, setCreatedId, setErrorMessage, setForm, setPublishedAction, setPublishedAt, setSubmissionState, setTerminalActionStatus]);

  usePlannerActionHandoffHydration({ initialActionId, form, setForm, onFormChange, preparationContext });

  return isHydratingAction;
}

export function useBeforeActionFieldUpdates({
  form,
  draftActionId,
  linkedEventId,
  submissionState,
  setForm,
  onFormChange,
  setSubmissionState,
  setErrorMessage,
  setValidationIssues,
  setValidationIssueFields,
}: {
  form: FormState;
  draftActionId?: string | null;
  linkedEventId?: string;
  submissionState: SubmissionState;
  setForm: StateSetter<FormState>;
  onFormChange?: (form: FormState) => void;
  setSubmissionState: StateSetter<SubmissionState>;
  setErrorMessage: StateSetter<string | null>;
  setValidationIssues: StateSetter<string[]>;
  setValidationIssueFields: StateSetter<BeforeValidationField[]>;
}) {
  const hasTrackedStartRef = useRef(false);
  const updateFields = (updates: Partial<FormState>) => {
    if (!hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      trackFunnel("start_form", "quick", { source: "action_before_declaration_form", recordType: form.recordType, routePath: typeof window !== "undefined" ? window.location.pathname : null, formVariant: "quick", linkedEventId: linkedEventId ?? null }).catch(() => undefined);
    }
    const nextForm = sanitizePreActionForm({ ...form, ...updates } as FormState);
    if ("routeStyle" in updates) nextForm.routeStyle = "souple";
    if (updates.routeTopology === "loop" && nextForm.recordType === "action") {
      nextForm.arrivalLocationLabel = "";
      nextForm.arrivalCoordinates = null;
    }
    applyOrganizerFormUpdates(nextForm, form, updates);
    setForm(nextForm); onFormChange?.(nextForm); saveDraft(nextForm, undefined, null, draftActionId ?? null);
    if (submissionState === "error") { setSubmissionState("idle"); setErrorMessage(null); setValidationIssues([]); setValidationIssueFields([]); }
  };
  const updateField: BeforeActionFieldUpdater = (key, value) => updateFields({ [key]: value } as Partial<FormState>);
  return { updateField, updateFields };
}

export function useBeforeActionSubmission({
  form,
  submissionState,
  initialActionId,
  linkedEventId,
  userMetadata,
  isAuthenticated,
  setSubmissionState,
  setErrorMessage,
  setValidationIssues,
  setValidationIssueFields,
  setCreatedId,
  setPublishedAction,
  setPublishedAt,
  onActionPersisted,
}: {
  form: FormState;
  submissionState: SubmissionState;
  initialActionId?: string | null;
  linkedEventId?: string;
  userMetadata: ActionBeforeDeclarationFormProps["userMetadata"];
  isAuthenticated: boolean;
  setSubmissionState: StateSetter<SubmissionState>;
  setErrorMessage: StateSetter<string | null>;
  setValidationIssues: StateSetter<string[]>;
  setValidationIssueFields: StateSetter<BeforeValidationField[]>;
  setCreatedId: StateSetter<string | null>;
  setPublishedAction: StateSetter<ActionEditorRecord | null>;
  setPublishedAt: StateSetter<string | null>;
  onActionPersisted?: (actionId: string) => void;
}) {
  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (submissionState === "pending") return;
    const issues = validateBeforeActionForm(form);
    if (issues.length > 0) {
      setValidationIssues(issues.map((issue) => issue.message)); setValidationIssueFields(issues.map((issue) => issue.field)); setErrorMessage(issues[0]?.message ?? "Complétez les informations connues avant de continuer."); setSubmissionState("error"); return;
    }
    const normalizedForm = sanitizePreActionForm(form);
    const payload = buildBeforeActionPayload({ form: normalizedForm, linkedEventId, userMetadata });
    setSubmissionState("pending"); setErrorMessage(null); setValidationIssues([]); setValidationIssueFields([]);
    try {
      const result = await persistBeforeAction(initialActionId, payload);
      setCreatedId(result.actionId); onActionPersisted?.(result.actionId);
      if (initialActionId) { const canonicalAction = await fetchActionById(result.actionId); setPublishedAction(canonicalAction); setPublishedAt(canonicalAction.publishedAt ?? null); }
      setSubmissionState("success");
      if (initialActionId) clearDraft(initialActionId);
      else saveDraft(normalizedForm);
      await trackFunnel("submit_success", "quick", { source: "action_before_declaration_form", createdId: result.actionId, isAuthenticated });
    } catch (error: unknown) {
      setSubmissionState("error"); setErrorMessage(error instanceof Error && error.message ? error.message : "Impossible d'enregistrer le pré-formulaire pour le moment.");
    }
  }
  return handleSubmit;
}

export function useBeforeActionPublication({
  createdId,
  publishedAt,
  publicationState,
  setForm,
  setPublishedAction,
  setCreatedId,
  setPublishedAt,
  setPublicationState,
  setPublicationError,
  setPublicationConfirmationOpen,
}: {
  createdId: string | null;
  publishedAt: string | null;
  publicationState: PublicationState;
  setForm: StateSetter<FormState>;
  setPublishedAction: StateSetter<ActionEditorRecord | null>;
  setCreatedId: StateSetter<string | null>;
  setPublishedAt: StateSetter<string | null>;
  setPublicationState: StateSetter<PublicationState>;
  setPublicationError: StateSetter<string | null>;
  setPublicationConfirmationOpen: StateSetter<boolean>;
}) {
  function requestPublish() {
    if (!createdId || publishedAt || publicationState === "pending") return;
    setPublicationConfirmationOpen(true);
  }
  function cancelPublication() { setPublicationConfirmationOpen(false); }
  async function confirmPublish() {
    if (!createdId || publishedAt || publicationState === "pending") return;
    setPublicationConfirmationOpen(false); setPublicationState("pending"); setPublicationError(null);
    try {
      const result = await publishAction(createdId);
      if (result.id !== createdId) throw new Error("La publication a retourné une action différente.");
      const canonicalAction = await fetchActionById(result.id);
      setPublishedAction(canonicalAction); setForm((current) => sanitizePreActionForm(applyPreparationDataToForm(current, canonicalAction.preparationData))); setCreatedId(canonicalAction.id); setPublishedAt(canonicalAction.publishedAt ?? result.publishedAt); setPublicationState("success");
    } catch (error: unknown) {
      setPublicationState("error"); setPublicationError(error instanceof Error && error.message ? error.message : "Impossible de publier cette action pour le moment.");
    }
  }
  return { requestPublish, cancelPublication, confirmPublish };
}
