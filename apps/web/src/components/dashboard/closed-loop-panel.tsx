"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type ImpactKpi = {
  label: string;
  value: string;
};

type ClosedLoopPanelProps = {
  recommendedHref: string;
  recommendedLabel: string;
  recommendedReason?: string;
  impactKpis: ImpactKpi[];
};

export function ClosedLoopPanel(props: ClosedLoopPanelProps) {
  const [feedback, setFeedback] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = feedback.trim().length >= 10 && state !== "pending";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setState("pending");
    setMessage(null);
    try {
      const response = await fetch("/api/community/bug-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportType: "idea",
          title: "Feedback utilisateur - dashboard",
          description: feedback.trim(),
          pagePath: "/dashboard",
        }),
      });
      if (!response.ok) {
        throw new Error("Envoi impossible.");
      }
      setState("success");
      setFeedback("");
      setMessage("Merci, ton feedback a ete enregistre.");
    } catch {
      setState("error");
      setMessage("Impossible d'envoyer le feedback pour le moment.");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Boucle fermee produit
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Feedback, impact personnalise et recommandation adaptive
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {props.impactKpis.map((kpi) => (
          <article key={kpi.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{kpi.value}</p>
          </article>
        ))}
      </div>

      <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">
          Recommandation adaptive
        </p>
        <p className="mt-1">{props.recommendedReason ?? "Prioriser l'action a plus fort impact local."}</p>
        <Link
          href={props.recommendedHref}
          className="mt-2 inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
        >
          {props.recommendedLabel}
        </Link>
      </article>

      <form onSubmit={onSubmit} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
          Feedback utilisateur
        </label>
        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          rows={3}
          placeholder="Ce qui t'aide, ce qui bloque, ce qu'il faut améliorer."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "pending" ? "Envoi..." : "Envoyer le feedback"}
        </button>
        {message ? (
          <p
            className={`text-xs ${
              state === "error" ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
