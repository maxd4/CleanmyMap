"use client";

import { useMemo, useState } from "react";
import type { ActionStatus } from "@/lib/actions/types";
import {
  ModerationClientError,
  postAdminModeration,
  type ModerationActionStatus,
  type ModerationCleanPlaceStatus,
  type ModerationEntityType,
  type ModerationPayload,
} from "@/lib/admin/moderation-client";

function buildExportQuery(params: { status: ActionStatus | "all"; days: number; limit: number }): string {
  const query = new URLSearchParams();
  query.set("days", String(params.days));
  query.set("limit", String(params.limit));
  if (params.status !== "all") {
    query.set("status", params.status);
  }
  return query.toString();
}

type AsyncState = "idle" | "pending" | "success" | "error";
type ModerationJournalEntry = {
  at: string;
  entityType: ModerationEntityType;
  id: string;
  targetStatus: string;
  outcome: "success" | "error";
  message: string;
  sourceTable?: string;
  copiedToLocalValidatedStore?: boolean;
};

async function downloadFromUrl(url: string): Promise<{ filename: string | null; blob: Blob }> {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Echec du telechargement.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const matched = disposition?.match(/filename=\"(.+)\"/);
  const filename = matched?.[1] ?? null;
  return { filename, blob };
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

export function ActionsReportPanel() {
  const [status, setStatus] = useState<ActionStatus | "all">("all");
  const [days, setDays] = useState<number>(90);
  const [limit, setLimit] = useState<number>(250);

  const [csvState, setCsvState] = useState<AsyncState>("idle");
  const [jsonState, setJsonState] = useState<AsyncState>("idle");
  const [importState, setImportState] = useState<AsyncState>("idle");
  const [moderationState, setModerationState] = useState<AsyncState>("idle");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<string>("{\n  \"items\": []\n}");
  const [moderationEntityType, setModerationEntityType] = useState<ModerationEntityType>("action");
  const [moderationId, setModerationId] = useState<string>("");
  const [actionStatus, setActionStatus] = useState<ModerationActionStatus>("approved");
  const [cleanPlaceStatus, setCleanPlaceStatus] = useState<ModerationCleanPlaceStatus>("validated");
  const [moderationResult, setModerationResult] = useState<string | null>(null);
  const [moderationJournal, setModerationJournal] = useState<ModerationJournalEntry[]>([]);

  const query = useMemo(() => buildExportQuery({ status, days, limit }), [status, days, limit]);
  const csvExportUrl = `/api/reports/actions.csv?${query}`;
  const jsonExportUrl = `/api/reports/actions.json?${query}`;

  function pushModerationJournal(entry: ModerationJournalEntry) {
    setModerationJournal((previous) => [entry, ...previous].slice(0, 12));
  }

  async function onDownloadCsv() {
    setCsvState("pending");
    setErrorMessage(null);

    try {
      const result = await downloadFromUrl(csvExportUrl);
      triggerBrowserDownload(result.blob, result.filename ?? "cleanmymap_actions.csv");
      setCsvState("success");
      setLastSuccessMessage(`CSV exporte avec succes (${new Date().toLocaleString("fr-FR")}).`);
    } catch (error) {
      setCsvState("error");
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    }
  }

  async function onDownloadJson() {
    setJsonState("pending");
    setErrorMessage(null);

    try {
      const result = await downloadFromUrl(jsonExportUrl);
      triggerBrowserDownload(result.blob, result.filename ?? "cleanmymap_actions.json");
      setJsonState("success");
      setLastSuccessMessage(`JSON exporte avec succes (${new Date().toLocaleString("fr-FR")}).`);
    } catch (error) {
      setJsonState("error");
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    }
  }

  async function onImportPastActions() {
    setImportState("pending");
    setErrorMessage(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(importPayload);
    } catch {
      setImportState("error");
      setErrorMessage("Le JSON saisi est invalide.");
      return;
    }

    const normalized = Array.isArray(parsed) ? { items: parsed } : parsed;

    try {
      const response = await fetch("/api/actions/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalized),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Import impossible.");
      }

      const data = (await response.json()) as { count?: number };
      setImportState("success");
      setLastSuccessMessage(`Import termine: ${data.count ?? 0} action(s) ajoutee(s).`);
    } catch (error) {
      setImportState("error");
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    }
  }

  async function onModerateEntity() {
    const trimmedId = moderationId.trim();
    if (!trimmedId) {
      setModerationState("error");
      setErrorMessage("Renseigne un identifiant d'entite (UUID/ID).");
      return;
    }

    setModerationState("pending");
    setErrorMessage(null);
    setModerationResult(null);

    const payload: ModerationPayload =
      moderationEntityType === "action"
        ? {
            entityType: "action",
            id: trimmedId,
            status: actionStatus,
          }
        : {
            entityType: "clean_place",
            id: trimmedId,
            status: cleanPlaceStatus,
          };

    try {
      const result = await postAdminModeration(payload);
      setModerationState("success");
      setModerationResult(JSON.stringify(result, null, 2));
      const successMessage = `Moderation appliquee pour ${payload.entityType} (${payload.id}) a ${new Date().toLocaleString("fr-FR")}.`;
      setLastSuccessMessage(successMessage);
      pushModerationJournal({
        at: new Date().toISOString(),
        entityType: payload.entityType,
        id: payload.id,
        targetStatus: payload.status,
        outcome: "success",
        message: successMessage,
        sourceTable: result.sourceTable,
        copiedToLocalValidatedStore: result.copiedToLocalValidatedStore,
      });
    } catch (error) {
      setModerationState("error");
      let message = "Erreur inconnue.";
      if (error instanceof ModerationClientError) {
        if (error.code === "permission_denied") {
          message = `Accès admin requis (${error.message}).`;
        } else if (error.code === "network_error") {
          message = "Erreur reseau pendant la moderation. Reessaie dans quelques secondes.";
        } else {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      setErrorMessage(message);
      pushModerationJournal({
        at: new Date().toISOString(),
        entityType: payload.entityType,
        id: payload.id,
        targetStatus: payload.status,
        outcome: "error",
        message,
      });
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-slate-900">Export et import des actions</h2>
      <p className="mt-2 text-sm text-slate-600">
        Conserve une trace reutilisable meme en cas d&apos;incident: export CSV/JSON, puis import d&apos;actions historiques.
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
          Fenetre temporelle
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
          onClick={() => void onDownloadCsv()}
          disabled={csvState === "pending"}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {csvState === "pending" ? "Preparation CSV..." : "Telecharger CSV"}
        </button>

        <button
          onClick={() => void onDownloadJson()}
          disabled={jsonState === "pending"}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {jsonState === "pending" ? "Preparation JSON..." : "Telecharger JSON"}
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Import d&apos;actions passees</p>
        <p className="mt-1 text-sm text-slate-600">
          Colle un JSON de la forme <code>{'{ "items": [ ... ] }'}</code> ou directement un tableau <code>[...]</code>.
        </p>

        <textarea
          value={importPayload}
          onChange={(event) => setImportPayload(event.target.value)}
          rows={8}
          className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700 outline-none transition focus:border-emerald-500"
          spellCheck={false}
        />

        <div className="mt-3">
          <button
            onClick={() => void onImportPastActions()}
            disabled={importState === "pending"}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {importState === "pending" ? "Import en cours..." : "Importer les actions"}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Moderation admin</p>
        <p className="mt-1 text-sm text-slate-600">
          Declenche <code>POST /api/admin/moderation</code> pour mettre a jour le statut d&apos;une action ou d&apos;un lieu
          propre.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Entite
            <select
              value={moderationEntityType}
              onChange={(event) => setModerationEntityType(event.target.value as ModerationEntityType)}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
            >
              <option value="action">Action</option>
              <option value="clean_place">Lieu propre</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700 md:col-span-2">
            ID de l&apos;entite
            <input
              value={moderationId}
              onChange={(event) => setModerationId(event.target.value)}
              placeholder="UUID/ID (actions.id, submissions.id ou spots.id)"
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none transition focus:border-emerald-500"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {moderationEntityType === "action" ? (
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Statut action
              <select
                value={actionStatus}
                onChange={(event) => setActionStatus(event.target.value as ModerationActionStatus)}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
              >
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Statut lieu propre
              <select
                value={cleanPlaceStatus}
                onChange={(event) => setCleanPlaceStatus(event.target.value as ModerationCleanPlaceStatus)}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
              >
                <option value="new">new</option>
                <option value="validated">validated</option>
                <option value="cleaned">cleaned</option>
              </select>
            </label>
          )}

          <div className="flex items-end">
            <button
              onClick={() => void onModerateEntity()}
              disabled={moderationState === "pending"}
              className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {moderationState === "pending" ? "Application..." : "Appliquer la moderation"}
            </button>
          </div>
        </div>

        {moderationResult ? (
          <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-700">
            {moderationResult}
          </pre>
        ) : null}

        <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Journal moderation (minimal)</p>
          {moderationJournal.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">Aucune action de moderation sur cette session.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {moderationJournal.map((entry, index) => (
                <li key={`${entry.at}-${entry.id}-${index}`} className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
                  <span className="font-mono">{new Date(entry.at).toLocaleString("fr-FR")}</span>{" "}
                  <span className={`font-semibold ${entry.outcome === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                    {entry.outcome === "success" ? "OK" : "ERREUR"}
                  </span>{" "}
                  {entry.entityType}#{entry.id} → {entry.targetStatus}
                  {entry.sourceTable ? ` (table: ${entry.sourceTable})` : ""}
                  {typeof entry.copiedToLocalValidatedStore === "boolean"
                    ? entry.copiedToLocalValidatedStore
                      ? " [copie local validated: oui]"
                      : " [copie local validated: non]"
                    : ""}
                  <div className="text-slate-500">{entry.message}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(csvExportUrl || jsonExportUrl) && (
        <div className="mt-4 space-y-1 text-xs text-slate-500">
          <p>CSV: <code>{csvExportUrl}</code></p>
          <p>JSON: <code>{jsonExportUrl}</code></p>
        </div>
      )}

      {lastSuccessMessage ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{lastSuccessMessage}</p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      ) : null}
    </section>
  );
}
