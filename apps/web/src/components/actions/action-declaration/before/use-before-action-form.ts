import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  createAction,
  fetchActionById,
  publishAction,
  type ActionEditorRecord,
} from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import {
  createInitialFormState,
  buildCreateActionPayload,
  applyPreparationDataToForm,
} from "../payload";
import { saveDraft, loadDraftSnapshot } from "../draft-storage";
import { consumePlannerActionHandoff } from "@/lib/route/route-action-handoff";
import type { FormState } from "../form/model";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import {
  buildPreActionSummaryNote,
  isResumablePreAction,
  sanitizePreActionForm,
  type ActionBeforeDeclarationFormProps,
  type BeforeActionFieldUpdater,
  type TerminalPreActionStatus,
} from "./model";
import { ENTREPRISE_ASSOCIATION_OPTION } from "@/lib/actions/association-options";
import { getTimeContractValidationMessage } from "@/lib/actions/time-contract";

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
  userMetadata,
  linkedEventId,
  initialActionId,
  initialRecordType = "action",
  onPassToComplete,
}: ActionBeforeDeclarationFormProps) {
  const resolvedDefaultActorName = actorNameOptions.includes(defaultActorName)
    ? defaultActorName
    : (actorNameOptions[0] ?? userMetadata.userId);
  const [form, setForm] = useState<FormState>(() =>
    buildPrefillForm(actorNameOptions, resolvedDefaultActorName, initialRecordType),
  );
  const plannerHandoffHydratedRef = useRef(false);
  const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [publishedAction, setPublishedAction] = useState<ActionEditorRecord | null>(null);
  const [terminalActionStatus, setTerminalActionStatus] =
    useState<TerminalPreActionStatus | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publicationState, setPublicationState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [publicationConfirmationOpen, setPublicationConfirmationOpen] = useState(false);
  const [isHydratingAction, setIsHydratingAction] = useState(Boolean(initialActionId));
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [showGroupJoinHelp, setShowGroupJoinHelp] = useState(false);
  const hasTrackedStartRef = useRef(false);

  useEffect(() => {
    if (!initialActionId) {
      return;
    }

    let active = true;
    fetchActionById(initialActionId)
      .then((action) => {
        if (!active) return;
        if (action.actionPhase !== "pre_action") {
          throw new Error("Cette action n'est plus une pré-action publiable.");
        }
        if (!isResumablePreAction(action)) {
          if (action.status !== "rejected" && action.status !== "cancelled") {
            throw new Error("Cette pré-action ne peut pas être reprise dans ce parcours.");
          }
          setCreatedId(action.id);
          setPublishedAction(action);
          setPublishedAt(null);
          setTerminalActionStatus(action.status);
          setSubmissionState("success");
          setIsHydratingAction(false);
          return;
        }
        const hydrated = sanitizePreActionForm(
          applyPreparationDataToForm(
            createInitialFormState(resolvedDefaultActorName, initialRecordType),
            action.preparationData,
          ),
        );
        setForm({
          ...hydrated,
          actorName: action.actorName ?? hydrated.actorName,
          associationName: action.associationName ?? hydrated.associationName,
          organizerType: action.organizerType ?? hydrated.organizerType,
          actionDate: action.actionDate,
          locationLabel: action.locationLabel,
          departureLocationLabel:
            action.departureLocationLabel ?? hydrated.departureLocationLabel,
          arrivalLocationLabel:
            action.arrivalLocationLabel ?? hydrated.arrivalLocationLabel,
          eventStartTime: action.eventStartTime ?? hydrated.eventStartTime,
          eventEndTime: action.eventEndTime ?? hydrated.eventEndTime,
          volunteersCount: String(action.volunteersCount),
          durationMinutes: String(action.durationMinutes),
          groupJoinEnabled: action.groupJoinEnabled,
          participantAccounts: action.participantAccounts,
        });
        setCreatedId(action.id);
        setPublishedAction(action);
        setPublishedAt(action.publishedAt ?? null);
        setTerminalActionStatus(null);
        setSubmissionState("success");
        setIsHydratingAction(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Impossible de reprendre cette pré-action pour le moment.",
        );
        setSubmissionState("error");
        setIsHydratingAction(false);
      });

    return () => {
      active = false;
    };
  }, [initialActionId, initialRecordType, resolvedDefaultActorName]);

  useEffect(() => {
    if (initialActionId || plannerHandoffHydratedRef.current) return;
    plannerHandoffHydratedRef.current = true;
    const handoff = consumePlannerActionHandoff();
    if (!handoff) return;

    const handoffPreparationData = handoff.preparationData
      ? {
          ...handoff.preparationData,
          operationalRoute: handoff.operationalRoute,
          routeCalibrationContext: handoff.routeCalibrationContext ?? undefined,
        }
      : {
          operationalRoute: handoff.operationalRoute,
          routeCalibrationContext: handoff.routeCalibrationContext ?? undefined,
        };
    const prepared = sanitizePreActionForm(
      applyPreparationDataToForm(form, handoffPreparationData),
    );
    if (
      handoff.preparationData?.volunteersExpected !== undefined &&
      !handoff.preparationData.volunteerParticipation
    ) {
      prepared.childrenCount = "";
      prepared.adultCount = "";
      prepared.retiredCount = "";
    }

    // Hydrate after the client boundary so sessionStorage never changes SSR markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional external handoff hydration
    setForm(prepared);
    saveDraft(prepared);
  // The handoff is intentionally consumed once on mount; the current form is the merge base.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActionId]);

  const shareLink = createdId
    ? `/sections/rejoindre-une-action?actionId=${encodeURIComponent(createdId)}`
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
    if (initialActionId || submissionState === "pending") {
      return;
    }

    const issues: string[] = [];
    if (!form.actionTitle.trim()) {
      issues.push("Indiquez un titre pour enregistrer le pré-formulaire.");
    }
    if (!form.actionDate.trim()) {
      issues.push("Indiquez la date prévue avant d'enregistrer le pré-formulaire.");
    }
    if (!form.associationName.trim()) {
      issues.push("Sélectionnez une structure ou un cadre d'engagement.");
    }
    if (!form.organizerType) {
      issues.push("Sélectionnez un type de structure avant d'enregistrer le pré-formulaire.");
    }
    if (!form.departureLocationLabel.trim()) {
      issues.push("Indiquez le point de rendez-vous avant d'enregistrer.");
    }
    const timeMessage = getTimeContractValidationMessage({
      actionDurationMinutes: Number(form.durationMinutes),
      startTime: form.eventStartTime,
      endTime: form.eventEndTime,
    });
    if (timeMessage) {
      issues.push(timeMessage);
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
      });
    } catch (error: unknown) {
      setSubmissionState("error");
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Impossible d'enregistrer le pré-formulaire pour le moment.",
      );
    }
  }

  function requestPublish() {
    if (!createdId || publishedAt || publicationState === "pending") return;
    setPublicationConfirmationOpen(true);
  }

  function cancelPublication() {
    setPublicationConfirmationOpen(false);
  }

  async function confirmPublish() {
    if (!createdId || publishedAt || publicationState === "pending") return;
    setPublicationConfirmationOpen(false);
    setPublicationState("pending");
    setPublicationError(null);
    try {
      const result = await publishAction(createdId);
      if (result.id !== createdId) {
        throw new Error("La publication a retourné une action différente.");
      }
      const canonicalAction = await fetchActionById(result.id);
      setPublishedAction(canonicalAction);
      setForm((current) =>
        sanitizePreActionForm(
          applyPreparationDataToForm(current, canonicalAction.preparationData),
        ),
      );
      setCreatedId(canonicalAction.id);
      setPublishedAt(canonicalAction.publishedAt ?? result.publishedAt);
      setPublicationState("success");
    } catch (error: unknown) {
      setPublicationState("error");
      setPublicationError(
        error instanceof Error && error.message
          ? error.message
          : "Impossible de publier cette action pour le moment.",
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
    publishedAction,
    terminalActionStatus,
    publishedAt,
    publicationState,
    publicationError,
    publicationConfirmationOpen,
    isHydratingAction,
    validationIssues,
    showGroupJoinHelp,
    setShowGroupJoinHelp,
    shareLink,
    summaryNote,
    updateField,
    handleSubmit,
    requestPublish,
    cancelPublication,
    confirmPublish,
    onContinueComplete,
  };
}
