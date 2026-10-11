import { useEffect, useMemo, useState } from "react";
import type { ActionEditorRecord } from "@/lib/actions/http";
import type { ActionManualInvitationStatusRecord } from "@/lib/actions/participation/registration-records";
import type { FormState } from "../model";
import { saveDraft } from "../draft-storage";
import {
  buildPreActionSummaryNote,
  sanitizePreActionForm,
  type ActionBeforeDeclarationFormProps,
  type TerminalPreActionStatus,
} from "./model";
import {
  buildBeforeActionFallbackForm,
  buildBeforeActionInitialForm,
  useBeforeActionFieldUpdates,
  useBeforeActionHydration,
  useBeforeActionPublication,
  useBeforeActionSubmission,
  resolveBeforeActionMutationId,
} from "./use-before-action-workflow";
import { useBeforeActionPersistence } from "./use-before-action-persistence";
import { fetchActionDuplicatePrefill } from "@/lib/actions/http-action-editor";
import { applyDuplicatePrefillToForm } from "./duplicate-prefill";

export { persistBeforeAction } from "./use-before-action-workflow";

function buildInitialBeforeFormState(
  actorNameOptions: string[],
  defaultActorName: string,
  initialRecordType: "action",
  initialActionId: string | null | undefined,
  fallbackForm: FormState,
): FormState {
  return initialActionId
    ? fallbackForm
    : buildBeforeActionInitialForm(actorNameOptions, defaultActorName, initialRecordType);
}

function continueToComplete(
  form: FormState,
  createdId: string | null,
  actionId: string | null | undefined,
  onPassToComplete: (actionId: string) => void | Promise<void>,
): void | Promise<void> {
  if (!createdId) return;
  saveDraft(sanitizePreActionForm(form), undefined, null, actionId ?? createdId);
  return onPassToComplete(createdId);
}

export function useBeforeActionForm({
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
}: ActionBeforeDeclarationFormProps) {
  const resolvedDefaultActorName = actorNameOptions.includes(defaultActorName) ? defaultActorName : actorNameOptions[0] ?? userMetadata.userId;
  const fallbackForm = buildBeforeActionFallbackForm(actorNameOptions, resolvedDefaultActorName, initialRecordType);
  const [form, setForm] = useState<FormState>(() => buildInitialBeforeFormState(actorNameOptions, resolvedDefaultActorName, initialRecordType, initialActionId, fallbackForm));
  const { persistenceStatus, setPersistenceStatus } = useBeforeActionPersistence({ fallbackForm, initialActionId });
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

  const isHydratingAction = useBeforeActionHydration({ resolvedDefaultActorName, initialActionId, initialRecordType, form, setForm, onFormChange, setCreatedId, createdId, setPublishedAction, setInvitationStatuses, setPublishedAt, setTerminalActionStatus, setSubmissionState, errorMessage, setErrorMessage, setPersistenceStatus, preparationContext });
  useEffect(() => {
    if (!duplicateFromActionId || initialActionId) return;
    let active = true;
    void fetchActionDuplicatePrefill(duplicateFromActionId).then((prefill) => {
      if (!active) return;
      setForm((current) => {
        const hydrated = applyDuplicatePrefillToForm(current, prefill);
        onFormChange?.(hydrated);
        return hydrated;
      });
      setDuplicateLoadedFor(duplicateFromActionId);
    }).catch((error: unknown) => {
      if (!active) return;
      setErrorMessage(error instanceof Error ? error.message : "Impossible de réutiliser cette action.");
      setDuplicateLoadedFor(duplicateFromActionId);
    });
    return () => { active = false; };
  }, [duplicateFromActionId, initialActionId, onFormChange, setErrorMessage]);
  const { updateField, updateFields } = useBeforeActionFieldUpdates({ form, draftActionId: persistedActionId, linkedEventId, submissionState, isAuthenticated, setForm, onFormChange, setPersistenceStatus, setSubmissionState, setErrorMessage, setValidationIssues, setValidationIssueFields });
  const handleSubmit = useBeforeActionSubmission({ form, submissionState, actionId: persistedActionId, linkedEventId, userMetadata, isAuthenticated, setSubmissionState, setPersistenceStatus, setErrorMessage, setValidationIssues, setValidationIssueFields, setCreatedId, setPublishedAction, setPublishedAt, onActionPersisted });
  const { requestPublish, cancelPublication, confirmPublish } = useBeforeActionPublication({ createdId, publishedAt, publicationState, setForm, setPublishedAction, setCreatedId, setPublishedAt, setPublicationState, setPublicationError, setPublicationConfirmationOpen });
  const shareLink = createdId ? `/sections/rejoindre-une-action?actionId=${encodeURIComponent(createdId)}` : null;
  const summaryNote = useMemo(() => buildPreActionSummaryNote(form), [form]);
  const onContinueComplete = () => continueToComplete(form, createdId, persistedActionId, onPassToComplete);

  return { form, submissionState, errorMessage, createdId, publishedAction, invitationStatuses, terminalActionStatus, publishedAt, publicationState, publicationError, publicationConfirmationOpen, isHydratingAction: isHydratingAction || Boolean(duplicateFromActionId && duplicateLoadedFor !== duplicateFromActionId), validationIssues, validationIssueFields, showGroupJoinHelp, setShowGroupJoinHelp, shareLink, summaryNote, updateField, updateFields, handleSubmit, requestPublish, cancelPublication, confirmPublish, onContinueComplete, persistenceStatus };
}
