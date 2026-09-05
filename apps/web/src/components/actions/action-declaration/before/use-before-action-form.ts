import { type FormEvent, useMemo, useRef, useState } from "react";
import { createAction } from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import {
  createInitialFormState,
  buildCreateActionPayload,
} from "../payload";
import { saveDraft, loadDraftSnapshot } from "../draft-storage";
import type { FormState } from "../form/model";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import {
  buildPreActionSummaryNote,
  sanitizePreActionForm,
  type ActionBeforeDeclarationFormProps,
  type BeforeActionFieldUpdater,
} from "./model";
import { ENTREPRISE_ASSOCIATION_OPTION } from "@/lib/actions/association-options";

function buildPrefillForm(
  actorNameOptions: string[],
  defaultActorName: string,
  initialRecordType: "action",
): FormState {
  const fallback = createInitialFormState(
    actorNameOptions.includes(defaultActorName)
      ? defaultActorName
      : actorNameOptions[0] ?? defaultActorName,
    initialRecordType,
  );

  const snapshot = loadDraftSnapshot(fallback, initialRecordType);
  return sanitizePreActionForm(snapshot?.form ?? fallback);
}

export function useBeforeActionForm({
  actorNameOptions,
  defaultActorName,
  isAuthenticated,
  isAutoApprovedSubmission = false,
  userMetadata,
  linkedEventId,
  initialRecordType = "action",
  onPassToComplete,
}: ActionBeforeDeclarationFormProps) {
  const resolvedDefaultActorName = actorNameOptions.includes(defaultActorName)
    ? defaultActorName
    : (actorNameOptions[0] ?? userMetadata.userId);
  const [form, setForm] = useState<FormState>(() =>
    buildPrefillForm(actorNameOptions, resolvedDefaultActorName, initialRecordType),
  );
  const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [showGroupJoinHelp, setShowGroupJoinHelp] = useState(false);
  const hasTrackedStartRef = useRef(false);

  const shareLink = createdId
    ? `/sections/rejoindre-un-formulaire?actionId=${encodeURIComponent(createdId)}`
    : null;
  const summaryNote = useMemo(() => buildPreActionSummaryNote(form), [form]);

  const updateField: BeforeActionFieldUpdater = (key, value) => {
    if (!hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      trackFunnel("start_form", "quick", {
        source: "action_before_declaration_form",
        recordType: form.recordType,
        routePath: typeof window !== "undefined" ? window.location.pathname : null,
        formVariant: "quick",
        linkedEventId: linkedEventId ?? null,
      }).catch(() => undefined);
    }

    const nextForm = sanitizePreActionForm({ ...form, [key]: value } as FormState);
    if (key === "routeStyle") {
      nextForm.routeStyle = "souple";
    }
    if (key === "associationName" && value !== ENTREPRISE_ASSOCIATION_OPTION) {
      nextForm.enterpriseName = "";
    }

    setForm(nextForm);
    saveDraft(nextForm);
    if (submissionState === "error") {
      setSubmissionState("idle");
      setErrorMessage(null);
      setValidationIssues([]);
    }
  };

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (submissionState === "pending") {
      return;
    }

    const issues: string[] = [];
    if (!form.actionTitle.trim()) {
      issues.push("Indiquez un titre pour publier le pré-formulaire.");
    }
    if (!form.actionDate.trim()) {
      issues.push("Indiquez la date prévue avant de publier le pré-formulaire.");
    }
    if (!form.associationName.trim()) {
      issues.push("Sélectionnez une structure ou un cadre d'engagement.");
    }
    if (!form.departureLocationLabel.trim()) {
      issues.push("Indiquez le point de rendez-vous avant de publier.");
    }

    if (issues.length > 0) {
      setValidationIssues(issues);
      setErrorMessage(issues[0] ?? "Complétez les informations connues avant de continuer.");
      setSubmissionState("error");
      return;
    }

    const normalizedForm = sanitizePreActionForm(form);
    const payload = buildCreateActionPayload({
      form: normalizedForm,
      declarationMode: "quick",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: normalizedForm.associationName === ENTREPRISE_ASSOCIATION_OPTION,
      linkedEventId,
      photos: [] as ActionPhotoAsset[],
      visionEstimate: null as ActionVisionEstimate | null,
      userMetadata,
    });

    setSubmissionState("pending");
    setErrorMessage(null);
    setValidationIssues([]);

    try {
      const result = await createAction(payload);
      setCreatedId(result.id);
      setSubmissionState("success");
      saveDraft(normalizedForm);
      await trackFunnel("submit_success", "quick", {
        source: "action_before_declaration_form",
        createdId: result.id,
        isAuthenticated,
        isAdminLikeSubmission: isAutoApprovedSubmission,
      });
    } catch (error: unknown) {
      setSubmissionState("error");
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Impossible de publier le pré-formulaire pour le moment.",
      );
    }
  }

  const onContinueComplete = () => {
    if (!createdId) {
      return;
    }
    saveDraft(sanitizePreActionForm(form));
    void onPassToComplete(createdId);
  };

  return {
    form,
    submissionState,
    errorMessage,
    createdId,
    validationIssues,
    showGroupJoinHelp,
    setShowGroupJoinHelp,
    shareLink,
    summaryNote,
    updateField,
    handleSubmit,
    onContinueComplete,
  };
}
