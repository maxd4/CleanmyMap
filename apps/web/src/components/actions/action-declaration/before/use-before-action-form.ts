import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ActionEditorRecord } from "@/lib/actions/http";
import type { ActionManualInvitationStatusRecord } from "@/lib/actions/participation/registration-records";
import type { FormState } from "../model";
import { createActionCreationRequestId, loadDraftSnapshot, saveDraft } from "../draft-storage";
import {
  buildPreActionSummaryNote,
  sanitizePreActionForm,
  type ActionBeforeDeclarationFormProps,
  type TerminalPreActionStatus,
} from "./model";
import {
  buildBeforeActionFallbackForm,
  useBeforeActionFieldUpdates,
  useBeforeActionHydration,
  useBeforeActionPublication,
  useBeforeActionSubmission,
  mergeBeforeActionHydrationWithLocalChanges,
  resolveBeforeActionMutationId,
} from "./use-before-action-workflow";
import { useBeforeActionPersistence } from "./use-before-action-persistence";
import { fetchActionDuplicatePrefill } from "@/lib/actions/http-action-editor";
import { applyDuplicatePrefillPreservingLocalChanges } from "./duplicate-prefill";

export { persistBeforeAction } from "./use-before-action-workflow";

function useBeforeActionDraftHydration({
  initialActionId,
  initialRecordType,
  duplicateFromActionId,
  fallbackForm,
  form,
  setForm,
  onFormChange,
}: {
  initialActionId?: string | null;
  initialRecordType: "action";
  duplicateFromActionId?: string | null;
  fallbackForm: FormState;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  onFormChange?: (form: FormState) => void;
}) {
  const fallbackFormRef = useRef(fallbackForm);
  const currentFormRef = useRef(form);
  const onFormChangeRef = useRef(onFormChange);
  const hydratedRef = useRef(false);
  // A new form has no remote record to await. Keep its first server render
  // useful while the effect still restores a local draft after mount.
  const [hydrationReady, setHydrationReady] = useState(
    !initialActionId && !duplicateFromActionId,
  );

  useEffect(() => {
    currentFormRef.current = form;
    onFormChangeRef.current = onFormChange;
  }, [form, onFormChange]);

  useEffect(() => {
    if (initialActionId || duplicateFromActionId || hydratedRef.current) {
      setHydrationReady(true);
      return;
    }
    hydratedRef.current = true;
    const snapshot = loadDraftSnapshot(fallbackFormRef.current, initialRecordType, null);
    if (snapshot) {
      const nextForm = mergeBeforeActionHydrationWithLocalChanges(
        fallbackFormRef.current,
        currentFormRef.current,
        snapshot.form,
      );
      setForm(nextForm);
      onFormChangeRef.current?.(nextForm);
    }
    setHydrationReady(true);
  }, [duplicateFromActionId, initialActionId, initialRecordType, setForm]);

  return hydrationReady;
}

function continueToComplete(
  form: FormState,
  createdId: string | null,
  actionId: string | null | undefined,
  creationRequestId: string | null,
  onPassToComplete: (actionId: string) => void | Promise<void>,
): void | Promise<void> {
  if (!createdId) return;
  saveDraft(sanitizePreActionForm(form), undefined, null, actionId ?? createdId, creationRequestId);
  return onPassToComplete(createdId);
}

type UseBeforeActionFormProps = ActionBeforeDeclarationFormProps;

export function useBeforeActionForm(props: UseBeforeActionFormProps) {
  return useBeforeActionFormRuntime(props);
}

function useBeforeActionFormRuntime({
  actorNameOptions,
  defaultActorName,
  isAuthenticated,
  userMetadata,
  linkedEventId,
  initialActionId,
  duplicateFromActionId,
  initialRecordType = "action",
  onPassToComplete,
  onFormChange,
  onActionPersisted,
  preparationContext,
}: UseBeforeActionFormProps) {
  const resolvedDefaultActorName = actorNameOptions.includes(defaultActorName) ? defaultActorName : actorNameOptions[0] ?? userMetadata.userId;
  const fallbackForm = buildBeforeActionFallbackForm(actorNameOptions, resolvedDefaultActorName, initialRecordType);
  const initialDraft = loadDraftSnapshot(fallbackForm, initialRecordType, initialActionId ?? null);
  const [creationRequestId] = useState<string | null>(
    () => initialDraft?.creationRequestId ?? createActionCreationRequestId(),
  );
  const [form, setForm] = useState<FormState>(() => fallbackForm);
  const { persistenceStatus, setPersistenceStatus, retryDraftPersistence } = useBeforeActionPersistence({ fallbackForm, initialActionId });
  const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [publishedAction, setPublishedAction] = useState<ActionEditorRecord | null>(null);
  const [invitationStatuses, setInvitationStatuses] = useState<ActionManualInvitationStatusRecord[]>([]);
  const [terminalActionStatus, setTerminalActionStatus] = useState<TerminalPreActionStatus | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publicationState, setPublicationState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [publicationConfirmationOpen, setPublicationConfirmationOpen] = useState(false);
  const [duplicateLoadedFor, setDuplicateLoadedFor] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [validationIssueFields, setValidationIssueFields] = useState<Array<"actionTitle" | "actionDate" | "associationName" | "organizerType" | "departureLocationLabel" | "arrivalLocationLabel" | "meetingTime" | "departureTime" | "durationMinutes" | "eventStartTime" | "eventEndTime" | "volunteersCount" | "volunteerParticipation">>([]);
  const [showGroupJoinHelp, setShowGroupJoinHelp] = useState(false);
  const persistedActionId = resolveBeforeActionMutationId(initialActionId, createdId);
  const currentFormRef = useRef(form);
  const onFormChangeRef = useRef(onFormChange);
  const duplicateRequestRef = useRef<{
    sourceId: string;
    requestForm: FormState;
    promise: ReturnType<typeof fetchActionDuplicatePrefill>;
  } | null>(null);
  const duplicateSyncSourceRef = useRef<string | null>(null);

  useEffect(() => {
    currentFormRef.current = form;
    onFormChangeRef.current = onFormChange;
  }, [form, onFormChange]);

  const draftHydrationReady = useBeforeActionDraftHydration({ initialActionId, initialRecordType, duplicateFromActionId, fallbackForm, form, setForm, onFormChange });
  const isHydratingAction = useBeforeActionHydration({ resolvedDefaultActorName, initialActionId, initialRecordType, form, setForm, onFormChange, setCreatedId, createdId, setPublishedAction, setInvitationStatuses, setPublishedAt, setTerminalActionStatus, setSubmissionState, errorMessage, setErrorMessage, setPersistenceStatus, preparationContext });
  useEffect(() => {
    if (!duplicateFromActionId || initialActionId) {
      duplicateRequestRef.current = null;
      duplicateSyncSourceRef.current = null;
      return;
    }

    const existingRequest = duplicateRequestRef.current;
    if (existingRequest?.sourceId === duplicateFromActionId) return;

    const request = {
      sourceId: duplicateFromActionId,
      requestForm: currentFormRef.current,
      promise: fetchActionDuplicatePrefill(duplicateFromActionId),
    };
    duplicateRequestRef.current = request;

    void request.promise.then((prefill) => {
      if (duplicateRequestRef.current !== request) return;
      setForm((current) => applyDuplicatePrefillPreservingLocalChanges(request.requestForm, current, prefill));
      setDuplicateLoadedFor(request.sourceId);
    }).catch((error: unknown) => {
      if (duplicateRequestRef.current !== request) return;
      setErrorMessage(error instanceof Error ? error.message : "Impossible de réutiliser cette action.");
      setDuplicateLoadedFor(request.sourceId);
    });
  }, [duplicateFromActionId, initialActionId, setErrorMessage, setForm]);

  useEffect(() => {
    if (!duplicateFromActionId || initialActionId || duplicateLoadedFor !== duplicateFromActionId) return;
    if (duplicateSyncSourceRef.current === duplicateFromActionId) return;
    duplicateSyncSourceRef.current = duplicateFromActionId;
    onFormChangeRef.current?.(form);
  }, [duplicateFromActionId, duplicateLoadedFor, form, initialActionId]);
  const { updateField, updateFields } = useBeforeActionFieldUpdates({ form, draftActionId: persistedActionId, creationRequestId, linkedEventId, submissionState, isAuthenticated, setForm, onFormChange, setPersistenceStatus, setSubmissionState, setErrorMessage, setValidationIssues, setValidationIssueFields });
  const handleSubmit = useBeforeActionSubmission({ form, submissionState, actionId: persistedActionId, creationRequestId, linkedEventId, userMetadata, isAuthenticated, setSubmissionState, setPersistenceStatus, setErrorMessage, setValidationIssues, setValidationIssueFields, setCreatedId, setPublishedAction, setPublishedAt, onActionPersisted });
  const { requestPublish, cancelPublication, confirmPublish } = useBeforeActionPublication({ createdId, publishedAt, publicationState, setForm, setPublishedAction, setCreatedId, setPublishedAt, setPublicationState, setPublicationError, setPublicationConfirmationOpen });
  const shareLink = createdId ? `/sections/rejoindre-une-action?actionId=${encodeURIComponent(createdId)}` : null;
  const summaryNote = useMemo(() => buildPreActionSummaryNote(form), [form]);
  const onContinueComplete = () => continueToComplete(form, createdId, persistedActionId, creationRequestId, onPassToComplete);

  return { form, submissionState, errorMessage, createdId, publishedAction, invitationStatuses, terminalActionStatus, publishedAt, publicationState, publicationError, publicationConfirmationOpen, isHydratingAction: !draftHydrationReady || isHydratingAction || Boolean(duplicateFromActionId && duplicateLoadedFor !== duplicateFromActionId), validationIssues, validationIssueFields, showGroupJoinHelp, setShowGroupJoinHelp, shareLink, summaryNote, updateField, updateFields, handleSubmit, requestPublish, cancelPublication, confirmPublish, onContinueComplete, persistenceStatus, retryDraftPersistence };
}
