"use client";

import { type FormEvent, useMemo, useState } from "react";
import { createAction } from "@/lib/actions/http";
import type { CreateActionPayload } from "@/lib/actions/types";

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

export function ActionDeclarationForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [optimisticLabel, setOptimisticLabel] = useState<string | null>(null);

  const payload = useMemo<CreateActionPayload>(() => {
    const latitude = toOptionalNumber(form.latitude);
    const longitude = toOptionalNumber(form.longitude);
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
    };
  }, [form]);

  const canSubmit = payload.locationLabel.length >= 2 && payload.actionDate.length === 10;

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
      <h2 className="text-xl font-semibold text-slate-900">Déclarer une action</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enregistrez votre action terrain pour l&apos;historique bénévole. Le statut initial est <span className="font-semibold">pending</span>.
      </p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Votre prénom / pseudo
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.actorName}
            onChange={(event) => updateField("actorName", event.target.value)}
            placeholder="Ex: Sarah"
            maxLength={120}
          />
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
          Emplacement (adresse ou libellé) *
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.locationLabel}
            onChange={(event) => updateField("locationLabel", event.target.value)}
            placeholder="Ex: Place de la République, Paris"
            minLength={2}
            maxLength={200}
            required
          />
        </label>

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

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Déchets collectés (kg) *
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
          Mégots ramassés
          <input
            type="number"
            min="0"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.cigaretteButts}
            onChange={(event) => updateField("cigaretteButts", event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Nombre de bénévoles *
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
          Durée (minutes)
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
            placeholder="Ex: présence de nombreux mégots près des bouches de métro."
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
              Action enregistrée. Référence: <span className="font-mono">{createdId}</span>
            </p>
          ) : null}

          {submissionState === "error" && errorMessage ? (
            <p className="text-sm font-medium text-rose-700">{errorMessage}</p>
          ) : null}
        </div>
      </form>

      {optimisticLabel ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Déclaration en préparation pour <span className="font-semibold">{optimisticLabel}</span>...
        </div>
      ) : null}
    </section>
  );
}
