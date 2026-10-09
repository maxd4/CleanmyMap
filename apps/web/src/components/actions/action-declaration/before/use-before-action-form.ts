import { useMemo, useState } from "react";
import type { ActionEditorRecord } from "@/lib/actions/http";
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
  useBeforeActionFieldUpdates,
  useBeforeActionHydration,
  useBeforeActionPublication,
  useBeforeActionSubmission,
} from "./use-before-action-workflow";

export { persistBeforeAction } from "./use-before-action-workflow";

function continueToComplete(
  form: FormState,
  createdId: string | null,
  onPassToComplete: (actionId: string) => void | Promise<void>,
): void | Promise<void> {
  if (!createdId) return;
  saveDraft(sanitizePreActionForm(form));
  return onPassToComplete(createdId);
}

export function useBeforeActionForm({
  actorNameOptions,
  defaultActorName,
  isAuthenticated,
  userMetadata,
  linkedEventId,
  initialActionId,
  initialRecordType = "action",
  onPassToComplete,
  onFormChange,
  onActionPersisted,
  preparationContext,
}: ActionBeforeDeclarationFormProps) {
  const resolvedDefaultActorName = actorNameOptions.includes(defaultActorName) ? defaultActorName : actorNameOptions[0] ?? userMetadata.userId;
  const [form, setForm] = useState<FormState>(() => buildBeforeActionFallbackForm(actorNameOptions, resolvedDefaultActorName, initialRecordType));
  const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [publishedAction, setPublishedAction] = useState<ActionEditorRecord | null>(null);
  const [terminalActionStatus, setTerminalActionStatus] = useState<TerminalPreActionStatus | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publicationState, setPublicationState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [publicationConfirmationOpen, setPublicationConfirmationOpen] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [validationIssueFields, setValidationIssueFields] = useState<Array<"actionTitle" | "actionDate" | "associationName" | "organizerType" | "departureLocationLabel" | "arrivalLocationLabel" | "meetingTime" | "departureTime" | "durationMinutes" | "eventStartTime" | "eventEndTime" | "volunteersCount" | "volunteerParticipation">>([]);
  const [showGroupJoinHelp, setShowGroupJoinHelp] = useState(false);

  const isHydratingAction = useBeforeActionHydration({ resolvedDefaultActorName, initialActionId, initialRecordType, form, setForm, onFormChange, setCreatedId, setPublishedAction, setPublishedAt, setTerminalActionStatus, setSubmissionState, setErrorMessage, preparationContext });
  const { updateField, updateFields } = useBeforeActionFieldUpdates({ form, linkedEventId, submissionState, setForm, onFormChange, setSubmissionState, setErrorMessage, setValidationIssues, setValidationIssueFields });
  const handleSubmit = useBeforeActionSubmission({ form, submissionState, initialActionId, linkedEventId, userMetadata, isAuthenticated, setSubmissionState, setErrorMessage, setValidationIssues, setValidationIssueFields, setCreatedId, setPublishedAction, setPublishedAt, onActionPersisted });
  const { requestPublish, cancelPublication, confirmPublish } = useBeforeActionPublication({ createdId, publishedAt, publicationState, setForm, setPublishedAction, setCreatedId, setPublishedAt, setPublicationState, setPublicationError, setPublicationConfirmationOpen });
  const shareLink = createdId ? `/sections/rejoindre-une-action?actionId=${encodeURIComponent(createdId)}` : null;
  const summaryNote = useMemo(() => buildPreActionSummaryNote(form), [form]);
  const onContinueComplete = () => continueToComplete(form, createdId, onPassToComplete);

  return { form, submissionState, errorMessage, createdId, publishedAction, terminalActionStatus, publishedAt, publicationState, publicationError, publicationConfirmationOpen, isHydratingAction, validationIssues, validationIssueFields, showGroupJoinHelp, setShowGroupJoinHelp, shareLink, summaryNote, updateField, updateFields, handleSubmit, requestPublish, cancelPublication, confirmPublish, onContinueComplete };
}
