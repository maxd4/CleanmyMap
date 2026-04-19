"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createAction, fetchActionPrefill } from "@/lib/actions/http";
import { ENTREPRISE_ASSOCIATION_OPTION } from "@/lib/actions/association-options";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import {
  buildCreateActionPayload,
  createInitialFormState,
  getFormResetState,
  isDrawingValid,
  isLocationLikelyPark,
  PARK_PLACE_TYPE,
} from "./payload";
import type {
  ActionDeclarationFormProps,
  DeclarationMode,
  FormState,
  SubmissionState,
  UpdateFormField,
  ValidationIssue,
} from "./types";

export type ActionDeclarationFormController = {
  resolvedActorOptions: string[];
  form: FormState;
  declarationMode: DeclarationMode;
  submissionState: SubmissionState;
  errorMessage: string | null;
  createdId: string | null;
  optimisticLabel: string | null;
  validationIssues: ValidationIssue[];
  hasAttemptedSubmit: boolean;

  isQuickMode: boolean;
  isEntrepriseMode: boolean;
  drawingIsValid: boolean;
  manualDrawingEnabled: boolean;
  effectiveManualDrawingEnabled: boolean;
  manualDrawing: import("@/lib/actions/types").ActionDrawing | null;

  setDeclarationMode: (value: DeclarationMode) => void;
  setManualDrawingEnabled: (value: boolean) => void;
  setManualDrawing: (
    value: import("@/lib/actions/types").ActionDrawing | null,
  ) => void;
  updateField: UpdateFormField;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function useActionDeclarationForm(
  params: Pick<
    ActionDeclarationFormProps,
    | "actorNameOptions"
    | "defaultActorName"
    | "clerkUserId"
    | "linkedEventId"
    | "initialMode"
  >,
): ActionDeclarationFormController {
  const {
    actorNameOptions,
    defaultActorName,
    clerkUserId,
    linkedEventId,
    initialMode = "quick",
  } = params;

  const resolvedActorOptions = actorNameOptions;
  const resolvedDefaultActorName = resolvedActorOptions.includes(defaultActorName)
    ? defaultActorName
    : (resolvedActorOptions[0] ?? clerkUserId);

  const [form, setForm] = useState<FormState>(() =>
    createInitialFormState(resolvedDefaultActorName),
  );
  const [manualDrawingEnabled, setManualDrawingEnabled] =
    useState<boolean>(true);
  const [manualDrawing, setManualDrawing] =
    useState<import("@/lib/actions/types").ActionDrawing | null>(null);
  const [declarationMode, setDeclarationMode] =
    useState<DeclarationMode>(initialMode);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [optimisticLabel, setOptimisticLabel] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    [],
  );
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [prefillApplied, setPrefillApplied] = useState<boolean>(false);
  const hasTrackedStartRef = useRef<boolean>(false);

  const drawingIsValid = isDrawingValid(manualDrawing);
  const isQuickMode = declarationMode === "quick";
  const effectiveManualDrawingEnabled =
    declarationMode === "complete" && manualDrawingEnabled;
  const isEntrepriseMode =
    form.associationName === ENTREPRISE_ASSOCIATION_OPTION;

  const payload = useMemo(
    () =>
      buildCreateActionPayload({
        form,
        declarationMode,
        effectiveManualDrawingEnabled,
        drawingIsValid,
        manualDrawing,
        isEntrepriseMode,
        linkedEventId,
      }),
    [
      declarationMode,
      drawingIsValid,
      effectiveManualDrawingEnabled,
      form,
      isEntrepriseMode,
      linkedEventId,
      manualDrawing,
    ],
  );

  function validateEssentials(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!form.associationName) {
      issues.push({
        field: "associationName",
        message: "L'association est obligatoire.",
      });
    }
    if (isEntrepriseMode && form.enterpriseName.trim().length < 2) {
      issues.push({
        field: "enterpriseName",
        message:
          "Le nom de l'entreprise est obligatoire (2 caracteres minimum).",
      });
    }
    if (payload.actionDate.length !== 10) {
      issues.push({ field: "actionDate", message: "La date est obligatoire." });
    }
    if (payload.locationLabel.length < 2) {
      issues.push({
        field: "locationLabel",
        message: "Le lieu est obligatoire (2 caracteres minimum).",
      });
    }
    if (!Number.isFinite(payload.wasteKg) || payload.wasteKg < 0) {
      issues.push({
        field: "wasteKg",
        message: "Le poids doit etre un nombre >= 0.",
      });
    }
    if (
      !Number.isFinite(payload.volunteersCount) ||
      payload.volunteersCount < 1
    ) {
      issues.push({
        field: "volunteersCount",
        message: "Le nombre de benevoles doit etre >= 1.",
      });
    }
    if (effectiveManualDrawingEnabled && !drawingIsValid) {
      issues.push({
        field: "locationLabel",
        message: "Le trace/polygone est incomplet.",
      });
    }
    return issues;
  }

  useEffect(() => {
    void trackFunnel("view_new", declarationMode, {
      linkedEventId: linkedEventId ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    if (prefillApplied) {
      return () => {
        active = false;
      };
    }

    void fetchActionPrefill()
      .then((result) => {
        if (!active) {
          return;
        }
        setForm((previous) => ({
          ...previous,
          actionDate: result.prefill.actionDate || previous.actionDate,
          actorName: result.prefill.actorName || previous.actorName,
          associationName:
            result.prefill.associationName || previous.associationName,
          locationLabel: result.prefill.locationLabel || previous.locationLabel,
          volunteersCount: String(
            result.prefill.volunteersCount || Number(previous.volunteersCount),
          ),
          durationMinutes: String(
            result.prefill.durationMinutes || Number(previous.durationMinutes),
          ),
        }));
        setPrefillApplied(true);
      })
      .catch(() => {
        if (active) {
          setPrefillApplied(true);
        }
      });
    return () => {
      active = false;
    };
  }, [prefillApplied]);

  const updateField: UpdateFormField = (key, value) => {
    if (!hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      void trackFunnel("start_form", declarationMode);
    }

    if (key === "locationLabel" && typeof value === "string") {
      if (isLocationLikelyPark(value)) {
        setForm((previous) => ({
          ...previous,
          [key]: value,
          placeType: PARK_PLACE_TYPE,
        }));
        return;
      }
    }

    setForm((previous) => ({ ...previous, [key]: value }));
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionState === "pending") {
      return;
    }

    setHasAttemptedSubmit(true);
    const issues = validateEssentials();
    setValidationIssues(issues);
    if (issues.length > 0) {
      return;
    }

    setSubmissionState("pending");
    setErrorMessage(null);
    setCreatedId(null);
    setOptimisticLabel(payload.locationLabel);

    try {
      const result = await createAction(payload);
      void trackFunnel("submit_success", declarationMode, {
        hasDrawing: Boolean(payload.manualDrawing),
      });
      setCreatedId(result.id);
      setSubmissionState("success");
      setOptimisticLabel(null);
      setManualDrawing(null);
      setForm((previous) => getFormResetState(previous));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inconnue est survenue.";
      setSubmissionState("error");
      setErrorMessage(message);
      setOptimisticLabel(null);
    }
  }

  return {
    resolvedActorOptions,
    form,
    declarationMode,
    submissionState,
    errorMessage,
    createdId,
    optimisticLabel,
    validationIssues,
    hasAttemptedSubmit,
    isQuickMode,
    isEntrepriseMode,
    drawingIsValid,
    manualDrawingEnabled,
    effectiveManualDrawingEnabled,
    manualDrawing,
    setDeclarationMode,
    setManualDrawingEnabled,
    setManualDrawing,
    updateField,
    onSubmit,
  };
}
