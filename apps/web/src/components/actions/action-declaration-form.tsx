"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { appendEventRefToNotes } from "@/lib/actions/event-link";
import { createAction, fetchActionPrefill } from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import {
  buildEntrepriseAssociationName,
  ENTREPRISE_ASSOCIATION_OPTION,
} from "@/lib/actions/association-options";
import { PLACE_TYPE_OPTIONS } from "@/lib/actions/place-type-options";
import type { ActionDrawing, CreateActionPayload } from "@/lib/actions/types";
import { computeButtsCount } from "@/lib/actions/data-contract";
import {
  ActionDeclarationCompleteModeFields,
  ActionDeclarationMegotsSection,
} from "./action-declaration-form.sections";
import { ActionDeclarationFormHeader } from "./action-declaration-form.header";
import { ActionDeclarationFormFeedback } from "./action-declaration-form.feedback";
import { ActionDeclarationIdentityFields } from "./action-declaration-form.identity-fields";
import {
  DeclarationMode,
  FormState,
  PostActionRetentionLoop,
  ValidationIssue,
  getDrawingCentroid,
  initialState,
  isDrawingValid,
  SubmissionState,
  toOptionalNumber,
  toRequiredNumber,
} from "./action-declaration-form.model";
import {
  ActionDeclarationLocationAssist,
  ActionDeclarationWasteAssist,
  useActionDeclarationSmartAssist,
} from "./action-declaration-form.smart-assist";
const ActionDrawingMap = dynamic(
  () =>
    import("@/components/actions/action-drawing-map").then(
      (mod) => mod.ActionDrawingMap,
    ),
  { ssr: false },
);

type ActionDeclarationFormProps = {
  actorNameOptions: string[];
  defaultActorName: string;
  clerkIdentityLabel: string;
  clerkUserId: string;
  linkedEventId?: string;
  initialMode?: DeclarationMode;
};

export function ActionDeclarationForm({
  actorNameOptions,
  defaultActorName,
  clerkIdentityLabel,
  clerkUserId,
  linkedEventId,
  initialMode = "quick",
}: ActionDeclarationFormProps) {
  const resolvedActorOptions = actorNameOptions;
  const resolvedDefaultActorName = resolvedActorOptions.includes(
    defaultActorName,
  )
    ? defaultActorName
    : (resolvedActorOptions[0] ?? clerkUserId);
  const [form, setForm] = useState<FormState>({
    ...initialState,
    actorName: resolvedDefaultActorName,
  });
  const [manualDrawingEnabled, setManualDrawingEnabled] = useState<boolean>(true);
  const [manualDrawing, setManualDrawing] = useState<ActionDrawing | null>(
    null,
  );
  const [declarationMode, setDeclarationMode] =
    useState<DeclarationMode>(initialMode);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [optimisticLabel, setOptimisticLabel] = useState<string | null>(null);
  const [retentionLoop, setRetentionLoop] =
    useState<PostActionRetentionLoop | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    [],
  );
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [prefillApplied, setPrefillApplied] = useState<boolean>(false);
  const [isWasteManuallyEdited, setIsWasteManuallyEdited] =
    useState<boolean>(false);
  const [hasAppliedInitialEstimate, setHasAppliedInitialEstimate] =
    useState<boolean>(false);
  const hasTrackedStartRef = useRef<boolean>(false);

  const drawingIsValid = isDrawingValid(manualDrawing);
  const isQuickMode = declarationMode === "quick";
  const effectiveManualDrawingEnabled =
    declarationMode === "complete" && manualDrawingEnabled;
  const isEntrepriseMode =
    form.associationName === ENTREPRISE_ASSOCIATION_OPTION;

  const payload = useMemo<CreateActionPayload>(() => {
    const quickMode = declarationMode === "quick";
    const fallbackLatitude = toOptionalNumber(form.latitude);
    const fallbackLongitude = toOptionalNumber(form.longitude);

    let latitude = fallbackLatitude;
    let longitude = fallbackLongitude;

    if (effectiveManualDrawingEnabled && drawingIsValid) {
      const centroid = getDrawingCentroid(manualDrawing);
      latitude = centroid.latitude;
      longitude = centroid.longitude;
    }

    const associationName = isEntrepriseMode
      ? buildEntrepriseAssociationName(form.enterpriseName)
      : form.associationName;

    return {
      actorName: form.actorName.trim() || undefined,
      associationName,
      actionDate: form.actionDate,
      locationLabel: form.locationLabel.trim(),
      latitude: quickMode ? undefined : latitude,
      longitude: quickMode ? undefined : longitude,
      wasteKg: toRequiredNumber(form.wasteKg, 0),
      cigaretteButts: quickMode
        ? 0
        : computeButtsCount(
            toRequiredNumber(form.wasteMegotsKg, 0),
            form.wasteMegotsCondition
          ),
      volunteersCount: Math.max(
        1,
        Math.trunc(toRequiredNumber(form.volunteersCount, 1)),
      ),
      durationMinutes: quickMode
        ? 0
        : Math.max(0, Math.trunc(toRequiredNumber(form.durationMinutes, 0))),
      notes: appendEventRefToNotes(
        quickMode ? undefined : form.notes.trim() || undefined,
        linkedEventId,
      ),
      manualDrawing:
        effectiveManualDrawingEnabled && drawingIsValid
          ? manualDrawing
          : undefined,
      placeType: form.placeType,
      submissionMode: declarationMode,
      wasteBreakdown: quickMode
        ? undefined
        : {
            megotsKg: toOptionalNumber(form.wasteMegotsKg),
            megotsCondition: form.wasteMegotsCondition,
            plastiqueKg: toOptionalNumber(form.wastePlastiqueKg),
            verreKg: toOptionalNumber(form.wasteVerreKg),
            metalKg: toOptionalNumber(form.wasteMetalKg),
            mixteKg: toOptionalNumber(form.wasteMixteKg),
            triQuality: form.triQuality,
          },
    };
  }, [
    declarationMode,
    drawingIsValid,
    effectiveManualDrawingEnabled,
    form,
    isEntrepriseMode,
    linkedEventId,
    manualDrawing,
  ]);

  const {
    gpsStatus,
    gpsMessage,
    estimatedWasteKg,
    applyEstimatedWaste,
    autofillGps,
  } = useActionDeclarationSmartAssist({
    form,
    setForm,
    prefillApplied,
    isWasteManuallyEdited,
    hasAppliedInitialEstimate,
    setHasAppliedInitialEstimate,
  });

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
        setForm((prev) => ({
          ...prev,
          actionDate: result.prefill.actionDate || prev.actionDate,
          actorName: result.prefill.actorName || prev.actorName,
          associationName:
            result.prefill.associationName || prev.associationName,
          locationLabel: result.prefill.locationLabel || prev.locationLabel,
          volunteersCount: String(
            result.prefill.volunteersCount || Number(prev.volunteersCount),
          ),
          durationMinutes: String(
            result.prefill.durationMinutes || Number(prev.durationMinutes),
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

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (!hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      void trackFunnel("start_form", declarationMode);
    }

    if (key === "locationLabel" && typeof value === "string") {
      const lower = value.toLowerCase();
      const isPark = ["luxembourg", "vincennes", "boulogne", "chaumont", "tuileries", "parc", "jardin", "square"].some(k => lower.includes(k));
      if (isPark) {
        setForm(prev => ({ ...prev, [key]: value, placeType: "Bois/Parc/Jardin/Square/Sentier" }));
        return;
      }
    }

    if (key === "wasteKg") {
      setIsWasteManuallyEdited(true);
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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
    setRetentionLoop(null);

    try {
      const result = await createAction(payload);
      void trackFunnel("submit_success", declarationMode, {
        hasDrawing: Boolean(payload.manualDrawing),
      });
      setCreatedId(result.id);
      setRetentionLoop(result.retentionLoop ?? null);
      setSubmissionState("success");
      setOptimisticLabel(null);
      setManualDrawing(null);
      setForm((prev) => ({
        ...initialState,
        actorName: prev.actorName,
        associationName: prev.associationName,
        actionDate: prev.actionDate,
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inconnue est survenue.";
      setSubmissionState("error");
      setErrorMessage(message);
      setOptimisticLabel(null);
      setRetentionLoop(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <ActionDeclarationFormHeader
        clerkIdentityLabel={clerkIdentityLabel}
        clerkUserId={clerkUserId}
        linkedEventId={linkedEventId}
        isQuickMode={isQuickMode}
        onModeChange={setDeclarationMode}
      />

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <ActionDeclarationIdentityFields
          resolvedActorOptions={resolvedActorOptions}
          actorName={form.actorName}
          associationName={form.associationName}
          enterpriseName={form.enterpriseName}
          onActorNameChange={(value) => updateField("actorName", value)}
          onAssociationNameChange={(value) =>
            updateField("associationName", value)
          }
          onEnterpriseNameChange={(value) =>
            updateField("enterpriseName", value)
          }
        />

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Date de l&apos;action *
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.actionDate}
            onChange={(event) => updateField("actionDate", event.target.value)}
          />
        </label>

        <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
          Emplacement (adresse ou libelle) *
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.locationLabel}
            onChange={(event) =>
              updateField("locationLabel", event.target.value)
            }
            placeholder="Ex: Place de la Republique, Paris"
            minLength={2}
            maxLength={200}
          />
          <ActionDeclarationLocationAssist
            gpsStatus={gpsStatus}
            gpsMessage={gpsMessage}
            onAutofillGps={autofillGps}
          />
        </label>

        <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
          Type de lieu *
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.placeType}
            onChange={(event) => updateField("placeType", event.target.value)}
          >
            {PLACE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Cette information permet de mieux classifier la zone et d&apos;ajuster les rapports d&apos;impact.
          </p>
        </label>

        <ActionDeclarationCompleteModeFields
          isQuickMode={isQuickMode}
          effectiveManualDrawingEnabled={effectiveManualDrawingEnabled}
          manualDrawingEnabled={manualDrawingEnabled}
          setManualDrawingEnabled={setManualDrawingEnabled}
          drawingIsValid={drawingIsValid}
          manualDrawing={manualDrawing}
          setManualDrawing={setManualDrawing}
          form={form}
          updateField={updateField}
          drawingMapComponent={ActionDrawingMap}
        />
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Dechets collectes (kg) *
          <input
            type="number"
            step="0.1"
            min="0"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.wasteKg}
            onChange={(event) => updateField("wasteKg", event.target.value)}
          />
          <ActionDeclarationWasteAssist
            estimatedWasteKg={estimatedWasteKg}
            onApplyEstimatedWaste={applyEstimatedWaste}
          />
        </label>

        <ActionDeclarationMegotsSection form={form} updateField={updateField} />
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Nombre de benevoles *
          <input
            type="number"
            min="1"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.volunteersCount}
            onChange={(event) =>
              updateField("volunteersCount", event.target.value)
            }
          />
        </label>

        <ActionDeclarationFormFeedback
          submissionState={submissionState}
          createdId={createdId}
          errorMessage={errorMessage}
          isQuickMode={isQuickMode}
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationIssues={validationIssues}
          optimisticLabel={optimisticLabel}
          retentionLoop={retentionLoop}
        />
      </form>
    </section>
  );
}
