"use client";

import { useMemo, useState } from "react";
import type { ActionStatus } from "@/lib/actions/types";

function buildExportQuery(params: { status: ActionStatus | "all"; days: number; limit: number }): string {
  const query = new URLSearchParams();
  query.set("days", String(params.days));
  query.set("limit", String(params.limit));
  if (params.status !== "all") {
    query.set("status", params.status);
  }
  return query.toString();
}

type DownloadState = "idle" | "pending" | "success" | "error";

export function ActionsReportPanel() {
  const [status, setStatus] = useState<ActionStatus | "all">("all");
  const [days, setDays] = useState<number>(90);
  const [limit, setLimit] = useState<number>(250);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastDownloadAt, setLastDownloadAt] = useState<string | null>(null);

  const exportUrl = useMemo(() => {
    const query = buildExportQuery({ status, days, limit });
    return `/api/reports/actions.csv?${query}`;
  }, [status, days, limit]);

  async function onDownload() {
    setDownloadState("pending");
    setErrorMessage(null);

    try {
      const response = await fetch(exportUrl, { method: "GET", cache: "no-store" });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Échec du téléchargement CSV.");
      }

      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;

      const disposition = response.headers.get("Content-Disposition");
      const matched = disposition?.match(/filename="(.+)"/);
      const filename = matched?.[1] ?? "cleanmymap_actions.csv";
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);

      setDownloadState("success");
      setLastDownloadAt(new Date().toLocaleString("fr-FR"));
    } catch (error) {
      setDownloadState("error");
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Export CSV des actions</h2>
      <p className="mt-2 text-sm text-slate-600">
        Exportez le jeu de données actions pour reporting externe (tableur, BI, partenaires).
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Statut
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ActionStatus | "all")}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Tous</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Fenêtre temporelle
          <select
            value={String(days)}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="180">180 jours</option>
            <option value="365">365 jours</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Volume max
          <select
            value={String(limit)}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => void onDownload()}
          disabled={downloadState === "pending"}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {downloadState === "pending" ? "Préparation de l'export..." : "Télécharger le CSV"}
        </button>

        <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{exportUrl}</code>
      </div>

      {downloadState === "success" && lastDownloadAt ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Export généré avec succès ({lastDownloadAt}).
        </p>
      ) : null}

      {downloadState === "error" && errorMessage ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      ) : null}
    </section>
  );
}
