"use client";

import Link from "next/link";
import { useState } from "react";

type ProbeState = "idle" | "pending" | "success" | "error";

export function ReportExportSmokeCard() {
  const [probeState, setProbeState] = useState<ProbeState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function runProbe() {
    setProbeState("pending");
    setMessage(null);
    try {
      const response = await fetch("/api/reports/actions.csv?limit=1&days=30", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Échec du test export.");
      }
      const snippet = (await response.text()).slice(0, 120);
      setProbeState("success");
      setMessage(
        snippet.length > 0
          ? "Endpoint CSV opérationnel."
          : "Endpoint CSV vide mais disponible.",
      );
    } catch (error) {
      setProbeState("error");
      setMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Reporting</h2>
      <p className="mt-2 text-sm text-slate-600">
        Accès direct au module exports + test rapide de disponibilité CSV.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href="/reports"
          className="inline-flex rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Ouvrir le reporting
        </Link>
        <button
          onClick={() => void runProbe()}
          disabled={probeState === "pending"}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          {probeState === "pending"
            ? "Test en cours..."
            : "Tester l'export CSV"}
        </button>
      </div>

      {probeState === "success" && message ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {probeState === "error" && message ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {message}
        </p>
      ) : null}
    </article>
  );
}
