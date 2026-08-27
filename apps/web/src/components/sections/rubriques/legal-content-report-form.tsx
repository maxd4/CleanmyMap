"use client";

import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export function LegalContentReportForm() {
  const [state, setState] = useState<FormState>("idle");
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identityException, setIdentityException] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState("submitting");
    setError(null);
    const form = new FormData(formElement);
    const payload = {
      notifierName: String(form.get("notifierName") ?? ""),
      notifierEmail: String(form.get("notifierEmail") ?? ""),
      identityException,
      identityExceptionReason: String(form.get("identityExceptionReason") ?? ""),
      contentUrl: String(form.get("contentUrl") ?? ""),
      contentType: String(form.get("contentType") ?? ""),
      contentId: String(form.get("contentId") ?? ""),
      allegationReason: String(form.get("allegationReason") ?? ""),
      goodFaithConfirmed: form.get("goodFaithConfirmed") === "on",
      honeypot: String(form.get("website") ?? ""),
      submittedAt: Date.now(),
    };

    try {
      const response = await fetch("/api/legal-content-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { trackingId?: string; error?: string };
      if (!response.ok || !body.trackingId) {
        throw new Error(body.error ?? "Impossible d'envoyer la notification.");
      }
      setTrackingId(body.trackingId);
      setState("success");
      formElement.reset();
      setIdentityException(false);
    } catch (submissionError) {
      setState("error");
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Impossible d'envoyer la notification.",
      );
    }
  }

  if (state === "success") {
    return (
      <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="font-semibold">Notification reçue.</p>
        <p>
          Votre identifiant de suivi est <strong>{trackingId}</strong>. Conservez-le pour toute
          question ultérieure.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="font-semibold text-emerald-700 underline"
        >
          Envoyer une autre notification
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm leading-6 text-slate-600">
        Décrivez les faits concrètement : vous n&apos;avez pas à qualifier juridiquement l&apos;infraction.
        Les champs marqués d&apos;un astérisque sont obligatoires, sauf identité et email lorsque
        l&apos;exception prévue ci-dessous est invoquée.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Nom *</span>
          <input name="notifierName" disabled={identityException} required={!identityException} maxLength={160} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Email *</span>
          <input name="notifierEmail" type="email" disabled={identityException} required={!identityException} maxLength={254} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
      </div>

      <label className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={identityException}
          onChange={(event) => setIdentityException(event.target.checked)}
          className="mt-1"
        />
        <span>
          Le signalement concerne des faits susceptibles de relever des articles 3 à 7 de la directive
          2011/93/UE et je demande à ne pas fournir mon identité ou mon email. Cette case est une
          exception de transmission, pas une qualification juridique obligatoire.
        </span>
      </label>

      {identityException ? (
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Contexte de l&apos;exception (facultatif)</span>
          <textarea name="identityExceptionReason" maxLength={1000} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
      ) : null}

      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span>URL exacte du contenu *</span>
        <input name="contentUrl" type="url" required maxLength={2048} placeholder="https://..." className="w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Type de contenu (facultatif)</span>
          <input name="contentType" maxLength={120} placeholder="Publication, commentaire..." className="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Identifiant technique (facultatif)</span>
          <input name="contentId" maxLength={160} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
      </div>

      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span>Pourquoi ce contenu vous paraît-il illicite ? *</span>
        <textarea name="allegationReason" required minLength={20} maxLength={5000} rows={7} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>

      <label className="flex gap-3 text-sm text-slate-700">
        <input name="goodFaithConfirmed" type="checkbox" required className="mt-1" />
        <span>Je confirme de bonne foi que les informations fournies sont exactes et complètes.</span>
      </label>

      <label className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
        <span>Website</span>
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      {state === "error" ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <button
        type="submit"
        disabled={state === "submitting"}
        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "submitting" ? "Envoi en cours..." : "Envoyer la notification"}
      </button>
    </form>
  );
}
