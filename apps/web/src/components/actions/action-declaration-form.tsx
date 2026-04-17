"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { appendEventRefToNotes } from "@/lib/actions/event-link";
import { createAction, fetchActionPrefill } from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import {
  ASSOCIATION_SELECTION_OPTIONS,
  buildEntrepriseAssociationName,
  ENTREPRISE_ASSOCIATION_OPTION,
} from "@/lib/actions/association-options";
import { PLACE_TYPE_OPTIONS } from "@/lib/actions/place-type-options";
import type { ActionDrawing, CreateActionPayload, ActionMegotsCondition } from "@/lib/actions/types";
import { computeButtsCount } from "@/lib/actions/data-contract";

const ActionDrawingMap = dynamic(
  () =>
    import("@/components/actions/action-drawing-map").then(
      (mod) => mod.ActionDrawingMap,
    ),
  { ssr: false },
);

const associationOptionLabels: Record<string, string> = {
  "Action spontanee":
    "Action spontanee - benevole non rattache a une association",
  Entreprise: "Entreprise - participation dans un cadre RSE",
};

type FormState = {
  actorName: string;
  associationName: string;
  enterpriseName: string;
  actionDate: string;
  locationLabel: string;
  latitude: string;
  longitude: string;
  wasteKg: string;
  cigaretteButts: string;
  volunteersCount: string;
  durationMinutes: string;
  notes: string;
  wasteMegotsKg: string;
  wasteMegotsCondition: ActionMegotsCondition;
  wastePlastiqueKg: string;
  wasteVerreKg: string;
  wasteMetalKg: string;
  wasteMixteKg: string;
  triQuality: "faible" | "moyenne" | "elevee";
  placeType: string;
};

const initialState: FormState = {
  actorName: "",
  associationName: ASSOCIATION_SELECTION_OPTIONS[0],
  enterpriseName: "",
  actionDate: new Date().toISOString().slice(0, 10),
  locationLabel: "",
  latitude: "",
  longitude: "",
  wasteKg: "0",
  cigaretteButts: "0",
  volunteersCount: "1",
  durationMinutes: "60",
  notes: "",
  wasteMegotsKg: "0",
  wasteMegotsCondition: "propre",
  wastePlastiqueKg: "",
  wasteVerreKg: "",
  wasteMetalKg: "",
  wasteMixteKg: "",
  triQuality: "moyenne",
  placeType: PLACE_TYPE_OPTIONS[0],
};

type SubmissionState = "idle" | "pending" | "success" | "error";
type DeclarationMode = "quick" | "complete";

function toOptionalNumber(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toRequiredNumber(input: string, fallback: number): number {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDrawingCentroid(drawing: ActionDrawing): {
  latitude: number;
  longitude: number;
} {
  const points = drawing.coordinates;
  const total = points.reduce(
    (acc, [lat, lng]) => ({
      latitude: acc.latitude + lat,
      longitude: acc.longitude + lng,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: Number((total.latitude / points.length).toFixed(6)),
    longitude: Number((total.longitude / points.length).toFixed(6)),
  };
}

function isDrawingValid(
  drawing: ActionDrawing | null,
): drawing is ActionDrawing {
  if (!drawing) {
    return false;
  }
  const minPoints = drawing.kind === "polygon" ? 3 : 2;
  return drawing.coordinates.length >= minPoints;
}

type ValidationIssue = {
  field:
    | "associationName"
    | "enterpriseName"
    | "actionDate"
    | "locationLabel"
    | "wasteKg"
    | "volunteersCount";
  message: string;
};

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
  const [manualDrawingEnabled, setManualDrawingEnabled] =
    useState<boolean>(true);
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

    try {
      const result = await createAction(payload);
      void trackFunnel("submit_success", declarationMode, {
        hasDrawing: Boolean(payload.manualDrawing),
      });
      setCreatedId(result.id);
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
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Declarer une action
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Enregistrez votre action terrain pour l&apos;historique benevole. Le
        statut initial est <span className="font-semibold">pending</span>.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Compte Clerk actif:{" "}
        <span className="font-semibold">{clerkIdentityLabel}</span> (
        <span className="font-mono">{clerkUserId}</span>)
      </p>
      {linkedEventId ? (
        <p className="mt-2 text-xs text-emerald-700">
          Declaration liee a l&apos;evenement:{" "}
          <span className="font-mono">{linkedEventId}</span>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDeclarationMode("quick")}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            isQuickMode
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Rapide &lt;60s
        </button>
        <button
          type="button"
          onClick={() => setDeclarationMode("complete")}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            !isQuickMode
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Complet avec preuve
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {isQuickMode
          ? "Mode rapide: champs essentiels, validation souple pendant la saisie."
          : "Mode complet: geolocalisation detaillee, trace/polygone et informations additionnelles."}
      </p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Identite benevole (compte)
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.actorName}
            onChange={(event) => updateField("actorName", event.target.value)}
          >
            {resolvedActorOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Selection issue du compte Clerk (prenom/pseudo). Aucune saisie libre
            non tracee.
          </p>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Association / cadre d&apos;engagement *
          <select
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.associationName}
            onChange={(event) =>
              updateField("associationName", event.target.value)
            }
          >
            {ASSOCIATION_SELECTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {associationOptionLabels[option] ?? option}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Liste normalisee issue de l&apos;historique Cleanwalk Paris, pour
            des exports et classements homogenes.
          </p>
        </label>

        {isEntrepriseMode ? (
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Nom de l&apos;entreprise *
            <input
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
              value={form.enterpriseName}
              onChange={(event) =>
                updateField("enterpriseName", event.target.value)
              }
              placeholder="Ex: Veolia, BNP Paribas, SNCF..."
              minLength={2}
              maxLength={100}
            />
            <p className="text-xs text-slate-500">
              Le rapport enregistrera cette valeur comme: Entreprise - Nom.
            </p>
          </label>
        ) : null}

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

        {!isQuickMode ? (
          <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <label className="flex items-start gap-3 text-sm text-emerald-900">
              <input
                type="checkbox"
                checked={manualDrawingEnabled}
                onChange={(event) =>
                  setManualDrawingEnabled(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600"
              />
              <span>
                <span className="font-semibold">Option recommandee:</span>{" "}
                tracer a la main le parcours ou le polygone nettoye. Cela evite
                les hypotheses sur la distance reellement parcourue.
              </span>
            </label>

            {effectiveManualDrawingEnabled ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-700">
                  Carte de Paris (fond blanc): utilisez l&apos;outil ligne pour
                  le trace ou polygone pour la zone nettoyee.
                </p>
                <ActionDrawingMap
                  value={manualDrawing}
                  onChange={setManualDrawing}
                  wasteKg={toRequiredNumber(form.wasteKg, 0)}
                  butts={Math.max(0, Math.trunc(toRequiredNumber(form.cigaretteButts, 0)))}
                  isCleanPlace={false} // Le formulaire principal est pour les actions
                />
                <p className="text-xs text-slate-700">
                  {drawingIsValid
                    ? `Dessin enregistre (${manualDrawing.kind === "polygon" ? "polygone" : "trace"}, ${manualDrawing.coordinates.length} points).`
                    : "Aucun dessin valide pour le moment (2 points min pour un trace, 3 pour un polygone)."}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isQuickMode && !effectiveManualDrawingEnabled ? (
          <>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Latitude (optionnel)
              <input
                type="number"
                step="any"
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
                value={form.latitude}
                onChange={(event) =>
                  updateField("latitude", event.target.value)
                }
                placeholder="48.8566"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Longitude (optionnel)
              <input
                type="number"
                step="any"
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
                value={form.longitude}
                onChange={(event) =>
                  updateField("longitude", event.target.value)
                }
                placeholder="2.3522"
              />
            </label>
          </>
        ) : null}

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
        </label>

        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Extraction de Mégots</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Masse de mégots (kg ou g)
              <input
                type="number"
                step="0.01"
                min="0"
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
                value={form.wasteMegotsKg}
                onChange={(event) => updateField("wasteMegotsKg", event.target.value)}
                placeholder="Ex: 0.5"
              />
              <p className="text-[10px] text-slate-500 italic">Entrez 0.05 pour 50g</p>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Qualité / État des mégots
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
                value={form.wasteMegotsCondition}
                onChange={(event) => updateField("wasteMegotsCondition", event.target.value as ActionMegotsCondition)}
              >
                <option value="propre">Propre (Sec, facile à recycler)</option>
                <option value="humide">Humide / Avec impuretés (Terre, sable)</option>
                <option value="mouille">Mouillé (Saturé d&apos;eau, après pluie)</option>
              </select>
            </label>
          </div>
          
          {toRequiredNumber(form.wasteMegotsKg, 0) > 0 && (
            <div className="mt-2 text-xs font-medium text-emerald-700 bg-white border border-emerald-100 p-2 rounded inline-block">
              Estimation : ~{computeButtsCount(toRequiredNumber(form.wasteMegotsKg, 0), form.wasteMegotsCondition)} mégots estimés
            </div>
          )}
        </div>

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

        {!isQuickMode ? (
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Duree (minutes)
            <input
              type="number"
              min="0"
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
              value={form.durationMinutes}
              onChange={(event) =>
                updateField("durationMinutes", event.target.value)
              }
            />
          </label>
        ) : null}

        {!isQuickMode ? (
          <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
            Commentaire (optionnel)
            <textarea
              className="min-h-[110px] rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              maxLength={1000}
              placeholder="Ex: presence de nombreux megots pres des bouches de metro."
            />
          </label>
        ) : null}

        {!isQuickMode ? (
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tri par filiere (optionnel)
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {/* Champs Tri détaillés pour le mode complet uniquement */}
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.wastePlastiqueKg}
                onChange={(event) =>
                  updateField("wastePlastiqueKg", event.target.value)
                }
                placeholder="Plastique kg"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
              />
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.wasteVerreKg}
                onChange={(event) =>
                  updateField("wasteVerreKg", event.target.value)
                }
                placeholder="Verre kg"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
              />
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.wasteMetalKg}
                onChange={(event) =>
                  updateField("wasteMetalKg", event.target.value)
                }
                placeholder="Metal kg"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
              />
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.wasteMixteKg}
                onChange={(event) =>
                  updateField("wasteMixteKg", event.target.value)
                }
                placeholder="Mixte kg"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
              />
              <select
                value={form.triQuality}
                onChange={(event) =>
                  updateField(
                    "triQuality",
                    event.target.value as "faible" | "moyenne" | "elevee",
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
              >
                <option value="faible">Tri faible</option>
                <option value="moyenne">Tri moyen</option>
                <option value="elevee">Tri eleve</option>
              </select>
            </div>
          </div>
        ) : null}

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submissionState === "pending"}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submissionState === "pending"
              ? "Envoi en cours..."
              : isQuickMode
                ? "Envoyer rapidement"
                : "Partager mon action"}
          </button>

          {submissionState === "success" && createdId ? (
            <p className="text-sm font-medium text-emerald-700">
              Action enregistree. Reference:{" "}
              <span className="font-mono">{createdId}</span>
            </p>
          ) : null}

          {submissionState === "error" && errorMessage ? (
            <p className="text-sm font-medium text-rose-700">{errorMessage}</p>
          ) : null}
        </div>
      </form>

      {hasAttemptedSubmit && validationIssues.length > 0 ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p className="font-semibold">Correction requise avant envoi:</p>
          <ul className="mt-1 list-disc pl-5">
            {validationIssues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {optimisticLabel ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Declaration en preparation pour{" "}
          <span className="font-semibold">{optimisticLabel}</span>...
        </div>
      ) : null}
    </section>
  );
}
