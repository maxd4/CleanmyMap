"use client";

import { useEffect, useState } from "react";
import { useBeforeActionForm } from "./use-before-action-form";
import type { ActionBeforeDeclarationFormProps } from "./model";
import {
  ActionBeforeHydrationView,
  ActionBeforePublicationView,
  ActionBeforeTerminalView,
} from "./form-status-views";
import { ActionBeforeFormView } from "./action-before-form-view";
import { ActionBeforePersistenceStatus } from "./persistence-status";

const BEFORE_VALIDATION_FIELD_IDS: Record<string, string> = {
  actionTitle: "before-action-title",
  actionDate: "before-action-date",
  associationName: "before-organizer-structure",
  organizerType: "before-organizer-type",
  departureLocationLabel: "before-departure-location",
  arrivalLocationLabel: "before-arrival-location",
  meetingTime: "before-meeting-time",
  departureTime: "before-departure-time",
  durationMinutes: "before-duration-minutes",
  eventStartTime: "before-action-event-start",
  eventEndTime: "before-action-event-end",
  volunteersCount: "before-volunteers-count",
  volunteerParticipation: "before-volunteer-participation",
};

export function ActionBeforeDeclarationForm({
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
  signInHref,
  signUpHref,
  guidedWorkflow = false,
  guidedReadiness = "unknown",
  preparationContext,
  activeSection = "all",
}: ActionBeforeDeclarationFormProps) {
  const [shareActionId, setShareActionId] = useState<string | null>(null);
  const {
    form,
    submissionState,
    errorMessage,
    createdId,
    publishedAction,
    terminalActionStatus,
    publishedAt,
    publicationState,
    publicationError,
    publicationConfirmationOpen,
    isHydratingAction,
    validationIssues,
    validationIssueFields = [],
    showGroupJoinHelp,
    setShowGroupJoinHelp,
    updateField,
    updateFields,
    handleSubmit,
    requestPublish,
    cancelPublication,
    confirmPublish,
    onContinueComplete,
    persistenceStatus = "clean",
  } = useBeforeActionForm({ actorNameOptions, defaultActorName, isAuthenticated, userMetadata, linkedEventId, initialActionId, initialRecordType, onPassToComplete, onFormChange, onActionPersisted, preparationContext });

  useEffect(() => {
    if (validationIssueFields.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(BEFORE_VALIDATION_FIELD_IDS[validationIssueFields[0]] ?? "");
      if (target instanceof HTMLElement) target.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [validationIssueFields]);

  useEffect(() => {
    if (!publishedAt || !createdId || initialActionId) return;
    window.history.replaceState(null, "", `/actions/new?from=before&actionId=${encodeURIComponent(createdId)}`);
  }, [createdId, initialActionId, publishedAt]);

  if (isHydratingAction) return <ActionBeforeHydrationView />;
  if (terminalActionStatus) return <ActionBeforeTerminalView status={terminalActionStatus} createdId={createdId} />;
  if (submissionState === "success") {
    return <><ActionBeforePersistenceStatus status={persistenceStatus} /><ActionBeforePublicationView form={form} publishedAction={publishedAction} createdId={createdId} publishedAt={publishedAt} publicationState={publicationState} publicationError={publicationError} publicationConfirmationOpen={publicationConfirmationOpen} guidedWorkflow={guidedWorkflow} guidedReadiness={guidedReadiness} shareActionId={shareActionId} onRequestPublish={requestPublish} onCancelPublication={cancelPublication} onConfirmPublish={confirmPublish} onContinueComplete={onContinueComplete} onShare={setShareActionId} /></>;
  }

  return <ActionBeforeFormView activeSection={activeSection} form={form} submissionState={submissionState} validationIssues={validationIssues} validationIssueFields={validationIssueFields} errorMessage={errorMessage} userMetadata={userMetadata} updateField={updateField} updateFields={updateFields} showGroupJoinHelp={showGroupJoinHelp} onToggleGroupJoinHelp={() => setShowGroupJoinHelp((current) => !current)} handleSubmit={handleSubmit} guidedReadiness={guidedReadiness} isAuthenticated={isAuthenticated} signInHref={signInHref} signUpHref={signUpHref} persistenceStatus={persistenceStatus} />;
}
