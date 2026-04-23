"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createAction, fetchActionPrefill } from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import { ENTREPRISE_ASSOCIATION_OPTION } from "@/lib/actions/association-options";
import { PLACE_TYPE_OPTIONS } from "@/lib/actions/place-type-options";
import type {
  ActionDrawing,
  ActionPhotoAsset,
  ActionVisionEstimate,
  CreateActionPayload,
} from "@/lib/actions/types";
import {
  buildCreateActionPayload,
  createInitialFormState,
  getFormResetState,
  isDrawingValid,
  isLocationLikelyPark,
  PARK_PLACE_TYPE,
} from "./action-declaration/payload";
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
  SubmissionState,
  toRequiredNumber,
} from "./action-declaration-form.model";
import {
  ActionDeclarationLocationAssist,
  ActionDeclarationWasteAssist,
  useActionDeclarationSmartAssist,
} from "./action-declaration-form.smart-assist";
import {
  inferActionVisionEstimate,
  normalizeActionPhotos,
} from "@/lib/actions/vision";
import { deriveAutoDrawingFromLocation } from "@/lib/actions/route-geometry";
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
  const [form, setForm] = useState<FormState>(() =>
    createInitialFormState(resolvedDefaultActorName),
  );
  const [manualDrawingEnabled, setManualDrawingEnabled] = useState<boolean>(true);
  const [manualDrawing, setManualDrawing] = useState<ActionDrawing | null>(
    null,
  );
  const [photoAssets, setPhotoAssets] = useState<ActionPhotoAsset[]>([]);
  const [visionEstimate, setVisionEstimate] = useState<ActionVisionEstimate | null>(
    null,
  );
  const [visionStatus, setVisionStatus] =
    useState<"idle" | "processing" | "ready" | "error">("idle");
  const [visionMessage, setVisionMessage] = useState<string | null>(null);
  const [routePreviewDrawing, setRoutePreviewDrawing] = useState<ActionDrawing | null>(null);
  const [routePreviewStatus, setRoutePreviewStatus] =
    useState<"idle" | "processing" | "ready" | "error">("idle");
  const [routePreviewMessage, setRoutePreviewMessage] = useState<string | null>(null);
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
  const hasTrackedStartRef = useRef<boolean>(false);

  const drawingIsValid = isDrawingValid(manualDrawing);
  const isQuickMode = declarationMode === "quick";
  const effectiveManualDrawingEnabled =
    declarationMode === "complete" && manualDrawingEnabled;
  const isEntrepriseMode =
    form.associationName === ENTREPRISE_ASSOCIATION_OPTION;

  const payload = useMemo<CreateActionPayload>(
    () =>
      buildCreateActionPayload({
        form,
        declarationMode,
        effectiveManualDrawingEnabled,
        drawingIsValid,
        manualDrawing,
        isEntrepriseMode,
        linkedEventId,
        photos: photoAssets,
        visionEstimate,
      }),
    [
      declarationMode,
      drawingIsValid,
      effectiveManualDrawingEnabled,
      form,
      isEntrepriseMode,
      linkedEventId,
      manualDrawing,
      photoAssets,
      visionEstimate,
    ],
  );

  const {
    gpsStatus,
    gpsMessage,
    estimatedWasteKg,
    estimatedWasteKgInterval,
    estimatedWasteKgConfidence,
    autofillGps,
  } = useActionDeclarationSmartAssist({
    form,
    setForm,
    visionEstimate,
  });

  useEffect(() => {
    let active = true;
    const departure = form.departureLocationLabel.trim();
    const arrival = form.arrivalLocationLabel.trim();

    if (!departure) {
      setRoutePreviewDrawing(null);
      setRoutePreviewStatus("idle");
      setRoutePreviewMessage(null);
      return () => {
        active = false;
      };
    }

    const timer = window.setTimeout(() => {
      setRoutePreviewStatus("processing");
      setRoutePreviewMessage(
        arrival
          ? form.routeStyle === "direct"
            ? "Aperçu d'un itinéraire direct."
            : "Aperçu d'un itinéraire souple avec petits détours possibles."
          : "Aperçu d'une boucle autour du point de départ.",
      );

      void deriveAutoDrawingFromLocation({
        locationLabel: form.locationLabel,
        departureLocationLabel: departure,
        arrivalLocationLabel: arrival || undefined,
        routeStyle: form.routeStyle,
      })
        .then((drawing) => {
          if (!active) {
            return;
          }
          setRoutePreviewDrawing(drawing);
          setRoutePreviewStatus(drawing ? "ready" : "error");
          setRoutePreviewMessage(
            drawing
              ? arrival
                ? form.routeStyle === "direct"
                  ? "Trajet direct calculé."
                  : "Trajet souple calculé."
                : "Boucle locale calculée."
              : "Impossible de calculer l'aperçu pour le moment.",
          );
        })
        .catch(() => {
          if (!active) {
            return;
          }
          setRoutePreviewDrawing(null);
          setRoutePreviewStatus("error");
          setRoutePreviewMessage(
            "Aperçu indisponible temporairement. La géométrie sera recalculée à la soumission.",
          );
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    form.arrivalLocationLabel,
    form.departureLocationLabel,
    form.locationLabel,
    form.routeStyle,
  ]);

  async function handlePhotoUpload(files: FileList | null) {
    const selected = files ? Array.from(files) : [];
    if (selected.length === 0) {
      clearPhotos();
      return;
    }

    setVisionStatus("processing");
    setVisionMessage("Préparation des photos...");
    try {
      const assets = await normalizeActionPhotos(selected);
      setPhotoAssets(assets);
      setVisionMessage(`Photos chargées: ${assets.length}.`);
    } catch (error) {
      setPhotoAssets([]);
      setVisionEstimate(null);
      setVisionStatus("error");
      setVisionMessage(
        error instanceof Error
          ? error.message
          : "Impossible de préparer les photos.",
      );
    }
  }

  function clearPhotos() {
    setPhotoAssets([]);
    setVisionEstimate(null);
    setVisionStatus("idle");
    setVisionMessage(null);
    setForm((previous) => ({
      ...previous,
      visionBagsCount: "",
      visionFillLevel: "",
      visionDensity: "",
    }));
  }

  useEffect(() => {
    let active = true;
    if (photoAssets.length === 0) {
      setVisionEstimate(null);
      setVisionStatus("idle");
      setVisionMessage(null);
      return () => {
        active = false;
      };
    }

    setVisionStatus("processing");
    setVisionMessage("Analyse visuelle en cours...");

    void inferActionVisionEstimate(photoAssets, {
      locationLabel: form.locationLabel,
      departureLocationLabel: form.departureLocationLabel,
      arrivalLocationLabel: form.arrivalLocationLabel,
      placeType: form.placeType,
      volunteersCount: Number(form.volunteersCount) || undefined,
      durationMinutes: Number(form.durationMinutes) || undefined,
    })
      .then((result) => {
        if (!active) {
          return;
        }
        setVisionEstimate(result);
        setVisionStatus("ready");
        setVisionMessage(
          `Estimation vision prête: ${result.wasteKg.value.toFixed(1)} kg, confiance ${(result.wasteKg.confidence * 100).toFixed(0)} %.`,
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setVisionEstimate(null);
        setVisionStatus("error");
        setVisionMessage("Analyse visuelle indisponible, estimation heuristique activée.");
      });

    return () => {
      active = false;
    };
  }, [
    form.arrivalLocationLabel,
    form.departureLocationLabel,
    form.durationMinutes,
    form.locationLabel,
    form.placeType,
    form.volunteersCount,
    photoAssets,
  ]);

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

    const syncRouteLabel = (
      departureLocationLabel: string,
      arrivalLocationLabel: string,
    ) => {
      const departure = departureLocationLabel.trim();
      const arrival = arrivalLocationLabel.trim();
      if (!departure && !arrival) {
        return "";
      }
      if (!departure) {
        return arrival;
      }
      if (!arrival) {
        return departure;
      }
      return `${departure} → ${arrival}`;
    };

    if (key === "locationLabel" && typeof value === "string") {
      if (isLocationLikelyPark(value)) {
        setForm((prev) => ({
          ...prev,
          [key]: value,
          placeType: PARK_PLACE_TYPE,
        }));
        return;
      }
    }

    if (key === "departureLocationLabel" && typeof value === "string") {
      setForm((prev) => {
        const nextDeparture = value;
        const nextLocationLabel = syncRouteLabel(
          nextDeparture,
          prev.arrivalLocationLabel,
        );
        return {
          ...prev,
          departureLocationLabel: nextDeparture,
          locationLabel: nextLocationLabel || prev.locationLabel,
        };
      });
      return;
    }

    if (key === "arrivalLocationLabel" && typeof value === "string") {
      setForm((prev) => {
        const nextArrival = value;
        const nextLocationLabel = syncRouteLabel(
          prev.departureLocationLabel,
          nextArrival,
        );
        return {
          ...prev,
          arrivalLocationLabel: nextArrival,
          locationLabel: nextLocationLabel || prev.locationLabel,
        };
      });
      return;
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
      setPhotoAssets([]);
      setVisionEstimate(null);
      setVisionStatus("idle");
      setVisionMessage(null);
      setForm((prev) => getFormResetState(prev));
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

  const drawingSummary =
    drawingIsValid && manualDrawing
      ? `Dessin enregistre (${manualDrawing.kind === "polygon" ? "polygone" : "trace"}, ${manualDrawing.coordinates.length} points).`
      : "Aucun dessin valide pour le moment (2 points min pour un trace, 3 pour un polygone).";

  const routeSummary = form.arrivalLocationLabel.trim()
    ? `${form.departureLocationLabel.trim() || "Départ à renseigner"} → ${form.arrivalLocationLabel.trim()}`
    : `${form.departureLocationLabel.trim() || "Départ à renseigner"} (boucle locale)`;
  const advancedPrecisionSummary =
    form.visionBagsCount || form.visionFillLevel || form.visionDensity
      ? "Précisions IA renseignées"
      : "Précisions IA non renseignées";

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-slate-200/60 bg-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl md:rounded-[2.5rem] md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Parcours simple
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
            1. Localiser
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            2. Tracer
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            3. Valider
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200/60 bg-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl md:rounded-[2.5rem] md:p-8">
        <ActionDeclarationFormHeader
          clerkIdentityLabel={clerkIdentityLabel}
          clerkUserId={clerkUserId}
          linkedEventId={linkedEventId}
          isQuickMode={isQuickMode}
          onModeChange={setDeclarationMode}
        />
      </section>

      {!isQuickMode && (
        <section className="relative overflow-hidden rounded-[1.5rem] border-2 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-[0_8px_30px_rgb(16,185,129,0.06)] md:rounded-[2.5rem] md:p-8">
          <h3 className="mb-5 flex items-center gap-3 text-lg font-black text-emerald-950 md:mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl text-emerald-600 shadow-inner">
              📍
            </div>
            Tracer la zone sur la carte
          </h3>

          <label className="mb-5 flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 shadow-sm transition-colors hover:border-emerald-300">
            <input
              type="checkbox"
              checked={manualDrawingEnabled}
              onChange={(event) => setManualDrawingEnabled(event.target.checked)}
              className="mt-1 h-5 w-5 cursor-pointer rounded border-emerald-400 text-emerald-600 transition-all focus:ring-emerald-500"
            />
            <span className="flex-1">
              <span className="mb-1 block font-bold text-emerald-900">
                Tracé manuel recommandé
              </span>
              Tracez ou entourez la zone nettoyée sur la carte. Cela garde la
              saisie simple et plus précise.
            </span>
          </label>

          {effectiveManualDrawingEnabled ? (
            <div className="space-y-3">
              <div className="isolate relative z-0 overflow-hidden rounded-xl border border-emerald-200 bg-white p-2 shadow-inner">
                <ActionDrawingMap
                  value={manualDrawing}
                  onChange={setManualDrawing}
                  wasteKg={toRequiredNumber(form.wasteKg, 0)}
                  butts={Math.max(
                    0,
                    Math.trunc(toRequiredNumber(form.cigaretteButts, 0)),
                  )}
                  isCleanPlace={false}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-100/50 px-3 py-2 text-xs text-emerald-900">
                <span className="opacity-80">État du tracé :</span>
                <span className="font-semibold">{drawingSummary}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-emerald-200 p-6 text-center text-sm text-emerald-800/60">
              Tracé masqué.
              <br />
              Renseignez un départ dans le formulaire ou activez le tracé.
            </div>
          )}
        </section>
      )}

      <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/60 bg-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl md:rounded-[2.5rem] md:p-8">
        {/* Background Decor */}
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-400 opacity-[0.03] blur-3xl" />

        <form className="relative z-10 mt-2 grid gap-4 md:grid-cols-2 md:gap-6" onSubmit={onSubmit}>
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

        <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
          Date de l&apos;action <span className="text-emerald-500">*</span>
          <input
            type="date"
            className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
            value={form.actionDate}
            onChange={(event) => updateField("actionDate", event.target.value)}
          />
        </label>

        <section className="md:col-span-2 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-bold text-sky-900">
                Lieu / tracé <span className="text-emerald-500">*</span>
              </p>
              <p className="text-xs text-sky-800">
              Départ obligatoire. Arrivée vide = boucle locale.
            </p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-900">
              {form.departureLocationLabel.trim() || "Départ à renseigner"}
              {form.arrivalLocationLabel.trim()
                ? ` → ${form.arrivalLocationLabel.trim()}`
                : " (boucle locale)"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-sky-950">
              Départ du tracé <span className="text-emerald-500">*</span>
              <input
                type="text"
                className="rounded-xl border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
                value={form.departureLocationLabel}
                onChange={(event) =>
                  updateField("departureLocationLabel", event.target.value)
                }
                placeholder="Ex: Place de la République"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-sky-950">
              Arrivée du tracé
              <input
                type="text"
                className="rounded-xl border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
                value={form.arrivalLocationLabel}
                onChange={(event) =>
                  updateField("arrivalLocationLabel", event.target.value)
                }
                placeholder="Vide = boucle"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <ActionDeclarationLocationAssist
              gpsStatus={gpsStatus}
              gpsMessage={gpsMessage}
              onAutofillGps={autofillGps}
            />

            <label className="flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-900">
              Style de parcours
              <select
                value={form.routeStyle}
                onChange={(event) =>
                  updateField(
                    "routeStyle",
                    event.target.value as "direct" | "souple",
                  )
                }
                className="bg-transparent outline-none"
              >
                <option value="souple">Souple</option>
                <option value="direct">Direct</option>
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-sky-200 bg-white">
            {routePreviewDrawing ? (
              <ActionDrawingMap
                value={routePreviewDrawing}
                onChange={() => undefined}
                readOnly
              />
            ) : (
              <div className="flex min-h-[220px] items-center justify-center px-4 text-center text-sm text-sky-900">
                {routePreviewStatus === "processing"
                  ? "Calcul..."
                  : "Saisis un départ pour voir l’aperçu."}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white px-3 py-1 font-semibold text-sky-900">
              {routePreviewStatus === "processing"
                ? "calcul..."
                : routePreviewStatus === "ready"
                  ? "prêt"
                  : routePreviewStatus === "error"
                    ? "partiel"
                    : "en attente"}
            </span>
            {routePreviewMessage ? (
              <span className="text-sky-800">{routePreviewMessage}</span>
            ) : null}
          </div>

          <details className="mt-4 rounded-xl border border-sky-200 bg-white px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-sky-950">
              Détails avancés
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                Latitude
                <input
                  type="number"
                  step="any"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-sky-400"
                  value={form.latitude}
                  onChange={(event) => updateField("latitude", event.target.value)}
                  placeholder="48.8566"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                Longitude
                <input
                  type="number"
                  step="any"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-sky-400"
                  value={form.longitude}
                  onChange={(event) =>
                    updateField("longitude", event.target.value)
                  }
                  placeholder="2.3522"
                />
              </label>

              <label className="md:col-span-2 flex flex-col gap-2 text-sm font-semibold text-sky-950">
                Message pour ajuster le trajet
                <textarea
                  value={form.routeAdjustmentMessage}
                  onChange={(event) =>
                    updateField("routeAdjustmentMessage", event.target.value)
                  }
                  placeholder="Ex: éviter l'avenue principale, passer par la rue latérale, garder la boucle compacte..."
                  className="min-h-[96px] rounded-xl border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
                  maxLength={500}
                />
                <span className="text-xs font-normal text-sky-800">
                  Transmis avec l&apos;action si besoin.
                </span>
              </label>
            </div>
          </details>
        </section>

        <label className="md:col-span-2 flex flex-col gap-2 text-sm font-bold text-slate-700">
          Type de lieu <span className="text-emerald-500">*</span>
          <select
            className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm appearance-none"
            value={form.placeType}
            onChange={(event) => updateField("placeType", event.target.value)}
          >
            {PLACE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Sert au classement et aux rapports.
          </p>
        </label>

        <label className="md:col-span-2 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm font-bold text-slate-700 shadow-sm">
          <span className="flex items-center justify-between gap-3">
            <span>
              Déchets collectés (kg) <span className="text-emerald-500">*</span>
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              valeur réelle
            </span>
          </span>
          <input
            type="number"
            step="0.1"
            min="0"
            className="rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
            value={form.wasteKg}
            onChange={(event) => updateField("wasteKg", event.target.value)}
            placeholder="Ex: 12.5"
          />
          <p className="text-xs font-normal text-emerald-900/80">
            La vision aide, la saisie reste manuelle.
          </p>
          <ActionDeclarationWasteAssist
            estimatedWasteKg={estimatedWasteKg}
            estimatedWasteKgInterval={estimatedWasteKgInterval}
            estimatedWasteKgConfidence={estimatedWasteKgConfidence}
            currentWasteKg={form.wasteKg}
            visionEstimate={visionEstimate}
          />
        </label>

        <ActionDeclarationCompleteModeFields
          isQuickMode={isQuickMode}
          form={form}
          updateField={updateField}
          photoAssets={photoAssets}
          visionEstimate={visionEstimate}
          visionStatus={visionStatus}
          visionMessage={visionMessage}
          onPhotoUpload={handlePhotoUpload}
          onClearPhotos={clearPhotos}
        />

        <ActionDeclarationMegotsSection form={form} updateField={updateField} />
        <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
          Nombre de bénévoles <span className="text-emerald-500">*</span>
          <input
            type="number"
            min="1"
            className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
            value={form.volunteersCount}
            onChange={(event) =>
              updateField("volunteersCount", event.target.value)
            }
          />
        </label>

        <section className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Valider
              </p>
              <p className="text-sm text-slate-600">
                Relis les informations avant l&apos;envoi.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              prêt
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/70 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Parcours
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{routeSummary}</p>
              <p className="mt-1 text-xs text-slate-500">
                {form.routeStyle === "direct" ? "Direct" : "Souple"}
              </p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Quantité
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {form.wasteKg || "0"} kg collectés
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Bénévoles: {form.volunteersCount || "1"} · {form.durationMinutes || "0"} min
              </p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Entraînement IA
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {photoAssets.length} photo(s)
              </p>
              <p className="mt-1 text-xs text-slate-500">{advancedPrecisionSummary}</p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Mégots
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {form.wasteMegotsKg || "0"} {Number(form.wasteMegotsKg) > 1 ? "kg" : "kg"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {form.wasteMegotsCondition}
              </p>
            </div>
          </div>
        </section>

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
    </div>
  );
}
