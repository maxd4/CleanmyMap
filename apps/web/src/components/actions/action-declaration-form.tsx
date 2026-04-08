"use client";

import { type FormEvent, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createAction } from "@/lib/actions/http";
import type { ActionDrawing, CreateActionPayload } from "@/lib/actions/types";

const ActionDrawingMap = dynamic(
  () => import("@/components/actions/action-drawing-map").then((mod) => mod.ActionDrawingMap),
  { ssr: false },
);

type FormState = {
  actorName: string;
  actionDate: string;
  locationLabel: string;
  latitude: string;
  longitude: string;
  wasteKg: string;
  cigaretteButts: string;
  volunteersCount: string;
  durationMinutes: string;
  notes: string;
};

const initialState: FormState = {
  actorName: "",
  actionDate: new Date().toISOString().slice(0, 10),
  locationLabel: "",
  latitude: "",
  longitude: "",
  wasteKg: "0",
  cigaretteButts: "0",
  volunteersCount: "1",
  durationMinutes: "60",
  notes: "",
};

type SubmissionState = "idle" | "pending" | "success" | "error";

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

function getDrawingCentroid(drawing: ActionDrawing): { latitude: number; longitude: number } {
  const points = drawing.coordinates;
  const total = points.reduce(
    (acc, [lat, lng]) => ({ latitude: acc.latitude + lat, longitude: acc.longitude + lng }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: Number((total.latitude / points.length).toFixed(6)),
    longitude: Number((total.longitude / points.length).toFixed(6)),
  };
}

function isDrawingValid(drawing: ActionDrawing | null): drawing is ActionDrawing {
  if (!drawing) {
    return false;
  }
  const minPoints = drawing.kind === "polygon" ? 3 : 2;
  return drawing.coordinates.length >= minPoints;
}

type ActionDeclarationFormProps = {
  actorNameOptions: string[];
  defaultActorName: string;
  clerkIdentityLabel: string;
  clerkUserId: string;
};

export function ActionDeclarationForm({
  actorNameOptions,
  defaultActorName,
  clerkIdentityLabel,
  clerkUserId,
}: ActionDeclarationFormProps) {
  const resolvedActorOptions = actorNameOptions;
  const resolvedDefaultActorName = resolvedActorOptions.includes(defaultActorName)
    ? defaultActorName
    : resolvedActorOptions[0] ?? clerkUserId;
  const [form, setForm] = useState<FormState>({
    ...initialState,
    actorName: resolvedDefaultActorName,
  });
  const [manualDrawingEnabled, setManualDrawingEnabled] = useState<boolean>(true);
  const [manualDrawing, setManualDrawing] = useState<ActionDrawing | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [optimisticLabel, setOptimisticLabel] = useState<string | null>(null);

  const drawingIsValid = isDrawingValid(manualDrawing);

  const payload = useMemo<CreateActionPayload>(() => {
    const fallbackLatitude = toOptionalNumber(form.latitude);
    const fallbackLongitude = toOptionalNumber(form.longitude);

    let latitude = fallbackLatitude;
    let longitude = fallbackLongitude;

    if (manualDrawingEnabled && drawingIsValid) {
      const centroid = getDrawingCentroid(manualDrawing);
      latitude = centroid.latitude;
      longitude = centroid.longitude;
    }

    return {
      actorName: form.actorName.trim() || undefined,
      actionDate: form.actionDate,
      locationLabel: form.locationLabel.trim(),
      latitude,
      longitude,
      wasteKg: toRequiredNumber(form.wasteKg, 0),
      cigaretteButts: Math.max(0, Math.trunc(toRequiredNumber(form.cigaretteButts, 0))),
      volunteersCount: Math.max(1, Math.trunc(toRequiredNumber(form.volunteersCount, 1))),
      durationMinutes: Math.max(0, Math.trunc(toRequiredNumber(form.durationMinutes, 0))),
      notes: form.notes.trim() || undefined,
      manualDrawing: manualDrawingEnabled && drawingIsValid ? manualDrawing : undefined,
    };
  }, [drawingIsValid, form, manualDrawing, manualDrawingEnabled]);

  const canSubmit =
    payload.locationLabel.length >= 2 &&
    payload.actionDate.length === 10 &&
    (!manualDrawingEnabled || drawingIsValid);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submissionState === "pending") {
      return;
    }

    setSubmissionState("pending");
    setErrorMessage(null);
    setCreatedId(null);
    setOptimisticLabel(payload.locationLabel);

    try {
      const result = await createAction(payload);
      setCreatedId(result.id);
      setSubmissionState("success");
      setOptimisticLabel(null);
      setManualDrawing(null);
      setForm((prev) => ({
        ...initialState,
        actorName: prev.actorName,
        actionDate: prev.actionDate,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
      setSubmissionState("error");
      setErrorMessage(message);
      setOptimisticLabel(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Declarer une action</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enregistrez votre action terrain pour l&apos;historique benevole. Le statut initial est{" "}
        <span className="font-semibold">pending</span>.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Compte Clerk actif: <span className="font-semibold">{clerkIdentityLabel}</span> (<span className="font-mono">{clerkUserId}</span>)
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
            Selection issue du compte Clerk (prenom/pseudo). Aucune saisie libre non tracee.
          </p>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Date de l&apos;action *
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.actionDate}
            onChange={(event) => updateField("actionDate", event.target.value)}
            required
          />
        </label>

        <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
          Emplacement (adresse ou libelle) *
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.locationLabel}
            onChange={(event) => updateField("locationLabel", event.target.value)}
            placeholder="Ex: Place de la Republique, Paris"
            minLength={2}
            maxLength={200}
            required
          />
        </label>

        <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <label className="flex items-start gap-3 text-sm text-emerald-900">
            <input
              type="checkbox"
              checked={manualDrawingEnabled}
              onChange={(event) => setManualDrawingEnabled(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600"
            />
            <span>
              <span className="font-semibold">Option recommandee:</span> tracer a la main le parcours ou le polygone
              nettoye. Cela evite les hypotheses sur la distance reellement parcourue.
            </span>
          </label>

          {manualDrawingEnabled ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-700">
                Carte de Paris (fond blanc): utilisez l&apos;outil ligne pour le trace ou polygone pour la zone
                nettoyee.
              </p>
              <ActionDrawingMap value={manualDrawing} onChange={setManualDrawing} />
              <p className="text-xs text-slate-700">
                {drawingIsValid
                  ? `Dessin enregistre (${manualDrawing.kind === "polygon" ? "polygone" : "trace"}, ${manualDrawing.coordinates.length} points).`
                  : "Aucun dessin valide pour le moment (2 points min pour un trace, 3 pour un polygone)."}
              </p>
            </div>
          ) : null}
        </div>

        {!manualDrawingEnabled ? (
          <>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Latitude (optionnel)
              <input
                type="number"
                step="any"
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
                value={form.latitude}
                onChange={(event) => updateField("latitude", event.target.value)}
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
                onChange={(event) => updateField("longitude", event.target.value)}
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
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Megots ramasses
          <input
            type="number"
            min="0"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.cigaretteButts}
            onChange={(event) => updateField("cigaretteButts", event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Nombre de benevoles *
          <input
            type="number"
            min="1"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.volunteersCount}
            onChange={(event) => updateField("volunteersCount", event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Duree (minutes)
          <input
            type="number"
            min="0"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.durationMinutes}
            onChange={(event) => updateField("durationMinutes", event.target.value)}
          />
        </label>

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

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit || submissionState === "pending"}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submissionState === "pending" ? "Envoi en cours..." : "Partager mon action"}
          </button>

          {submissionState === "success" && createdId ? (
            <p className="text-sm font-medium text-emerald-700">
              Action enregistree. Reference: <span className="font-mono">{createdId}</span>
            </p>
          ) : null}

          {submissionState === "error" && errorMessage ? (
            <p className="text-sm font-medium text-rose-700">{errorMessage}</p>
          ) : null}
        </div>
      </form>

      {optimisticLabel ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Declaration en preparation pour <span className="font-semibold">{optimisticLabel}</span>...
        </div>
      ) : null}
    </section>
  );
}
