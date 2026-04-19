"use client";

import { useMemo, useState, type FormEvent } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function DiscussionBugReportForm() {
  const [reportType, setReportType] = useState<"bug" | "idea">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pagePath = useMemo(() => {
    if (typeof window === "undefined") {
      return "/sections/annuaire";
    }
    return window.location.pathname;
  }, []);

  const canSubmit =
    title.trim().length >= 4 &&
    description.trim().length >= 10 &&
    submitState !== "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSubmitState("submitting");
    setErrorMessage(null);
    try {
      const response = await fetch("/api/community/bug-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportType,
          title: title.trim(),
          description: description.trim(),
          pagePath,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Impossible d'envoyer la demande.");
      }

      setSubmitState("success");
      setTitle("");
      setDescription("");
    } catch (error) {
      setSubmitState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur inattendue.",
      );
    }
  }

  return (
    <section
      id="discussion-bug-report-form"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-amber-900">
        Remonter un bug ou une idee produit
      </h3>
      <p className="mt-1 text-xs text-amber-900">
        Les bugs et idees de developpement ne passent pas par le canal commun:
        utilisez ce formulaire dedie.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700">Type</span>
          <select
            value={reportType}
            onChange={(event) => setReportType(event.target.value as "bug" | "idea")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
          >
            <option value="bug">Bug</option>
            <option value="idea">Idee de developpement</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700">Sujet</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex: Carte qui ne charge pas sur mobile"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
            maxLength={160}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Contexte, etapes, resultat observe, resultat attendu."
            className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
            maxLength={3000}
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-600">
            Page concernee: <span className="font-semibold">{pagePath}</span>
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitState === "submitting" ? "Envoi..." : "Envoyer"}
          </button>
        </div>

        {submitState === "success" ? (
          <p className="text-xs font-medium text-emerald-700">
            Merci, ta remontée a bien ete envoyee.
          </p>
        ) : null}
        {submitState === "error" ? (
          <p className="text-xs font-medium text-rose-700">
            {errorMessage ?? "Impossible d'envoyer la demande."}
          </p>
        ) : null}
      </form>
    </section>
  );
}
