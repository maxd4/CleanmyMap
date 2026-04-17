"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { evaluateActionQuality } from "@/lib/actions/quality";
import { fetchActions } from "@/lib/actions/http";
import type { ActionStatus } from "@/lib/actions/types";
import {
  ModerationClientError,
  postAdminModeration,
  type ModerationActionStatus,
  type ModerationCleanPlaceStatus,
  type ModerationEntityType,
  type ModerationPayload,
} from "@/lib/admin/moderation-client";
import { buildDeliverableFilename } from "@/lib/reports/deliverable-name";
import { swrRecentViewOptions } from "@/lib/swr-config";

function buildExportQuery(params: {
  status: ActionStatus | "all";
  days: number;
  limit: number;
  association: string | "all";
}): string {
  const query = new URLSearchParams();
  query.set("days", String(params.days));
  query.set("limit", String(params.limit));
  query.set("types", "all");
  if (params.status !== "all") {
    query.set("status", params.status);
  }
  if (params.association !== "all") {
    query.set("association", params.association);
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

type ImportDryRunSummary = {
  status: "dry_run";
  count: number;
  dryRunProof?: {
    token: string;
    expiresAt: string;
    payloadHash: string;
  };
  stats: {
    withCoordinates: number;
    missingCoordinates: number;
    totalWasteKg: number;
    totalButts: number;
    totalVolunteers: number;
    dateMin: string | null;
    dateMax: string | null;
  };
};

type AdminOperationAuditItem = {
  operationId: string;
  at: string;
  actorUserId: string;
  operationType: "moderation" | "import_dry_run" | "import_confirm";
  outcome: "success" | "error";
  targetId?: string;
  details: Record<string, unknown>;
};

async function downloadFromUrl(
  url: string,
): Promise<{ filename: string | null; blob: Blob }> {
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

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseAdminApiError(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") {
    return fallback;
  }
  const normalized = body as {
    error?: unknown;
    message?: unknown;
    code?: unknown;
    hint?: unknown;
    operationId?: unknown;
  };
  const message =
    typeof normalized.error === "string"
      ? normalized.error
      : typeof normalized.message === "string"
        ? normalized.message
        : fallback;
  const code = typeof normalized.code === "string" ? normalized.code : null;
  const hint = typeof normalized.hint === "string" ? normalized.hint : null;
  const operationId =
    typeof normalized.operationId === "string" ? normalized.operationId : null;

  const parts = [message];
  if (code) parts.push(`[${code}]`);
  if (hint) parts.push(`Conseil: ${hint}`);
  if (operationId) parts.push(`Op: ${operationId}`);
  return parts.join(" | ");
}

function qualityTone(grade: "A" | "B" | "C"): string {
  if (grade === "A") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (grade === "B") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function ActionsReportPanel() {
  const [status, setStatus] = useState<ActionStatus | "all">("all");
  const [days, setDays] = useState<number>(90);
  const [limit, setLimit] = useState<number>(250);
  const [association, setAssociation] = useState<string | "all">("all");

  const [csvState, setCsvState] = useState<AsyncState>("idle");
  const [jsonState, setJsonState] = useState<AsyncState>("idle");
  const [importState, setImportState] = useState<AsyncState>("idle");
  const [importDryRunState, setImportDryRunState] =
    useState<AsyncState>("idle");
  const [moderationState, setModerationState] = useState<AsyncState>("idle");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(
    null,
  );
  const [importPayload, setImportPayload] = useState<string>(
    '{\n  "items": []\n}',
  );
  const [importPreview, setImportPreview] =
    useState<ImportDryRunSummary | null>(null);
  const [importPreviewSignature, setImportPreviewSignature] = useState<
    string | null
  >(null);
  const [importConfirmationText, setImportConfirmationText] =
    useState<string>("");

  const [moderationEntityType, setModerationEntityType] =
    useState<ModerationEntityType>("action");
  const [moderationId, setModerationId] = useState<string>("");
  const [actionStatus, setActionStatus] =
    useState<ModerationActionStatus>("approved");
  const [cleanPlaceStatus, setCleanPlaceStatus] =
    useState<ModerationCleanPlaceStatus>("validated");
  const [moderationResult, setModerationResult] = useState<string | null>(null);
  const [moderationJournal, setModerationJournal] = useState<
    ModerationJournalEntry[]
  >([]);
  const [moderationConfirmed, setModerationConfirmed] =
    useState<boolean>(false);
  const [moderationConfirmationText, setModerationConfirmationText] =
    useState<string>("");

  const query = useMemo(
    () => buildExportQuery({ status, days, limit, association }),
    [status, days, limit, association],
  );
  const csvExportUrl = `/api/reports/actions.csv?${query}`;
  const jsonExportUrl = `/api/reports/actions.json?${query}`;

  const preview = useSWR(
    [
      "admin-workflow-preview",
      status,
      String(days),
      String(limit),
      association,
    ],
    () => fetchActions({ status, days, limit, types: "all", association }),
    swrRecentViewOptions,
  );
  const audit = useSWR(
    ["admin-operation-audit"],
    async () => {
      const response = await fetch("/api/admin/operations?limit=25", {
        method: "GET",
        cache: "no-store",
      });
      const body = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(parseAdminApiError(body, "Audit indisponible."));
      }
      return body as { items?: AdminOperationAuditItem[] };
    },
    swrRecentViewOptions,
  );

  const previewRows = useMemo(() => {
    return (preview.data?.items ?? []).slice(0, 12).map((item) => ({
      item,
      quality: evaluateActionQuality(item),
    }));
  }, [preview.data?.items]);

  const associationOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of preview.data?.items ?? []) {
      const value = item.association_name?.trim();
      if (value) {
        names.add(value);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b, "fr"));
  }, [preview.data?.items]);

  const canConfirmImport =
    importPreview !== null &&
    Boolean(importPreview.dryRunProof?.token) &&
    importPreviewSignature === importPayload &&
    importConfirmationText.trim().toUpperCase() === "CONFIRMER IMPORT";

  function pushModerationJournal(entry: ModerationJournalEntry) {
    setModerationJournal((previous) => [entry, ...previous].slice(0, 12));
  }

  async function onDownloadCsv() {
    setCsvState("pending");
    setErrorMessage(null);
    try {
      const result = await downloadFromUrl(csvExportUrl);
      triggerBrowserDownload(
        result.blob,
        result.filename ??
          buildDeliverableFilename({
            rubrique: "export_actions",
            extension: "csv",
            date: new Date(),
          }),
      );
      setCsvState("success");
      setLastSuccessMessage(
        `CSV exporte avec succes (${new Date().toLocaleString("fr-FR")}).`,
      );
    } catch (error) {
      setCsvState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur inconnue.",
      );
    }
  }

  async function onDownloadJson() {
    setJsonState("pending");
    setErrorMessage(null);
    try {
      const result = await downloadFromUrl(jsonExportUrl);
      triggerBrowserDownload(
        result.blob,
        result.filename ??
          buildDeliverableFilename({
            rubrique: "export_actions",
            extension: "json",
            date: new Date(),
          }),
      );
      setJsonState("success");
      setLastSuccessMessage(
        `JSON exporte avec succes (${new Date().toLocaleString("fr-FR")}).`,
      );
    } catch (error) {
      setJsonState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur inconnue.",
      );
    }
  }

  async function onImportDryRun() {
    setImportDryRunState("pending");
    setErrorMessage(null);
    setImportPreview(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(importPayload);
    } catch {
      setImportDryRunState("error");
      setErrorMessage("Le JSON saisi est invalide.");
      return;
    }

    const normalized = Array.isArray(parsed) ? { items: parsed } : parsed;

    try {
      const response = await fetch("/api/actions/import?dryRun=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });
      const body = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(parseAdminApiError(body, "Dry-run invalide."));
      }
      const summary = body as ImportDryRunSummary;
      setImportPreview(summary);
      setImportPreviewSignature(importPayload);
      setImportConfirmationText("");
      setImportDryRunState("success");
      setLastSuccessMessage("Dry-run valide. Importable apres confirmation.");
    } catch (error) {
      setImportDryRunState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur inconnue.",
      );
    }
  }

  async function onImportPastActions() {
    if (!canConfirmImport) {
      setImportState("error");
      setErrorMessage(
        "Lance d'abord un dry-run valide avant de confirmer l'import.",
      );
      return;
    }

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
      const dryRunProof = importPreview?.dryRunProof?.token;
      const response = await fetch("/api/actions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(normalized as Record<string, unknown>),
          dryRunProof,
          confirmPhrase: importConfirmationText,
        }),
      });
      const body = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(parseAdminApiError(body, "Import impossible."));
      }
      const data = body as { count?: number; operationId?: string };
      setImportState("success");
      const op = data.operationId ? ` (op ${data.operationId})` : "";
      setLastSuccessMessage(
        `Import confirme: ${data.count ?? 0} action(s) ajoutee(s).${op}`,
      );
      void preview.mutate();
    } catch (error) {
      setImportState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur inconnue.",
      );
    }
  }

  async function onModerateEntity() {
    const trimmedId = moderationId.trim();
    if (!trimmedId) {
      setModerationState("error");
      setErrorMessage("Renseigne un identifiant d'entite (UUID/ID).");
      return;
    }
    if (!moderationConfirmed) {
      setModerationState("error");
      setErrorMessage("Confirme explicitement la moderation avant execution.");
      return;
    }
    if (
      moderationConfirmationText.trim().toUpperCase() !== "CONFIRMER MODERATION"
    ) {
      setModerationState("error");
      setErrorMessage("Saisis la phrase CONFIRMER MODERATION avant execution.");
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
            confirmPhrase: moderationConfirmationText,
          }
        : {
            entityType: "clean_place",
            id: trimmedId,
            status: cleanPlaceStatus,
            confirmPhrase: moderationConfirmationText,
          };

    try {
      const result = await postAdminModeration(payload);
      setModerationState("success");
      setModerationResult(JSON.stringify(result, null, 2));
      const successMessage = `Moderation appliquee pour ${payload.entityType} (${payload.id}) a ${new Date().toLocaleString("fr-FR")}.`;
      setLastSuccessMessage(successMessage);
      setModerationConfirmed(false);
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
      void preview.mutate();
    } catch (error) {
      setModerationState("error");
      let message = "Erreur inconnue.";
      if (error instanceof ModerationClientError) {
        if (error.code === "permission_denied") {
          message = `Acces admin requis (${error.message}).`;
        } else if (error.code === "network_error") {
          message =
            "Erreur reseau pendant la moderation. Reessaie dans quelques secondes.";
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
      <h2 className="text-xl font-semibold text-slate-900">
        Workflow admin guide: moderation / import / export
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Parcours en 4 etapes: filtrer -&gt; previsualiser -&gt; confirmer -&gt;
        journaliser.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Etape 1 - Filtrer
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Statut
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ActionStatus | "all")
              }
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
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Association
            <select
              value={association}
              onChange={(event) => setAssociation(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
            >
              <option value="all">Global (toutes associations)</option>
              {associationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Etape 2 - Previsualiser
          </p>
          <button
            onClick={() => void preview.mutate()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Rafraichir preview
          </button>
        </div>
        {preview.isLoading ? (
          <p className="mt-2 text-sm text-slate-500">
            Chargement de la preview...
          </p>
        ) : null}
        {preview.error ? (
          <p className="mt-2 text-sm text-rose-700">Preview indisponible.</p>
        ) : null}
        {!preview.isLoading && !preview.error ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Lieu</th>
                  <th className="px-2 py-2">Statut</th>
                  <th className="px-2 py-2">Qualite</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr
                    key={row.item.id}
                    className="border-t border-slate-100 text-slate-700"
                  >
                    <td className="px-2 py-2 font-mono">
                      {row.item.id.slice(0, 8)}...
                    </td>
                    <td className="px-2 py-2">{row.item.action_date}</td>
                    <td className="px-2 py-2">{row.item.location_label}</td>
                    <td className="px-2 py-2">{row.item.status}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 ${qualityTone(row.quality.grade)}`}
                      >
                        {row.quality.grade} ({row.quality.score})
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => {
                          setModerationEntityType("action");
                          setModerationId(row.item.id);
                          setModerationConfirmed(false);
                          setModerationConfirmationText("");
                        }}
                        className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100"
                      >
                        Moderer
                      </button>
                    </td>
                  </tr>
                ))}
                {previewRows.length === 0 ? (
                  <tr className="border-t border-slate-100">
                    <td className="px-2 py-3 text-slate-500" colSpan={6}>
                      Aucun element correspondant au filtre.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Etape 3 - Confirmer
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void onDownloadCsv()}
            disabled={csvState === "pending"}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {csvState === "pending"
              ? "Preparation CSV..."
              : "Confirmer export CSV"}
          </button>
          <button
            onClick={() => void onDownloadJson()}
            disabled={jsonState === "pending"}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {jsonState === "pending"
              ? "Preparation JSON..."
              : "Confirmer export JSON"}
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Import: dry-run obligatoire
          </p>
          <p className="mt-1 text-sm text-slate-600">
            1) Previsualiser (dry-run) 2) Verifier le resume 3) Confirmer
            l&apos;import.
          </p>
          <textarea
            value={importPayload}
            onChange={(event) => {
              setImportPayload(event.target.value);
              setImportPreview(null);
              setImportConfirmationText("");
            }}
            rows={8}
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700 outline-none transition focus:border-emerald-500"
            spellCheck={false}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => void onImportDryRun()}
              disabled={importDryRunState === "pending"}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed"
            >
              {importDryRunState === "pending"
                ? "Dry-run..."
                : "Previsualiser (dry-run)"}
            </button>
            <button
              onClick={() => void onImportPastActions()}
              disabled={importState === "pending" || !canConfirmImport}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {importState === "pending" ? "Import..." : "Confirmer import"}
            </button>
          </div>
          <label className="mt-3 flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Confirmation explicite
            <input
              value={importConfirmationText}
              onChange={(event) =>
                setImportConfirmationText(event.target.value)
              }
              placeholder="Taper: CONFIRMER IMPORT"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>

          {importPreview ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              <p className="font-semibold">Dry-run valide</p>
              <p>
                {importPreview.count} ligne(s) | Geo ok:{" "}
                {importPreview.stats.withCoordinates} | Geo manquante:{" "}
                {importPreview.stats.missingCoordinates}
              </p>
              <p>
                Volume: {importPreview.stats.totalWasteKg.toFixed(1)} kg |
                Megots: {importPreview.stats.totalButts} | Benevoles:{" "}
                {importPreview.stats.totalVolunteers}
              </p>
              <p>
                Periode: {importPreview.stats.dateMin ?? "n/a"} -&gt;{" "}
                {importPreview.stats.dateMax ?? "n/a"}
              </p>
              {importPreview.dryRunProof ? (
                <p>
                  Jeton dry-run valable jusqu&apos;a{" "}
                  {new Date(importPreview.dryRunProof.expiresAt).toLocaleString(
                    "fr-FR",
                  )}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Moderation: confirmation
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Entite
              <select
                value={moderationEntityType}
                onChange={(event) => {
                  setModerationEntityType(
                    event.target.value as ModerationEntityType,
                  );
                  setModerationConfirmed(false);
                  setModerationConfirmationText("");
                }}
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
                onChange={(event) => {
                  setModerationId(event.target.value);
                  setModerationConfirmed(false);
                  setModerationConfirmationText("");
                }}
                placeholder="UUID/ID"
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
                  onChange={(event) => {
                    setActionStatus(
                      event.target.value as ModerationActionStatus,
                    );
                    setModerationConfirmed(false);
                    setModerationConfirmationText("");
                  }}
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
                  onChange={(event) => {
                    setCleanPlaceStatus(
                      event.target.value as ModerationCleanPlaceStatus,
                    );
                    setModerationConfirmed(false);
                    setModerationConfirmationText("");
                  }}
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
                disabled={
                  moderationState === "pending" ||
                  !moderationConfirmed ||
                  moderationConfirmationText.trim().toUpperCase() !==
                    "CONFIRMER MODERATION"
                }
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {moderationState === "pending"
                  ? "Application..."
                  : "Confirmer moderation"}
              </button>
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={moderationConfirmed}
              onChange={(event) => setModerationConfirmed(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Je confirme la moderation de cette entite.
          </label>
          <label className="mt-3 flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Phrase de confirmation
            <input
              value={moderationConfirmationText}
              onChange={(event) =>
                setModerationConfirmationText(event.target.value)
              }
              placeholder="Taper: CONFIRMER MODERATION"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>
          {moderationResult ? (
            <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-700">
              {moderationResult}
            </pre>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Etape 4 - Journaliser
        </p>
        <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
          {moderationJournal.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aucune action de moderation sur cette session.
            </p>
          ) : (
            <ul className="space-y-2">
              {moderationJournal.map((entry, index) => (
                <li
                  key={`${entry.at}-${entry.id}-${index}`}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
                >
                  <span className="font-mono">
                    {new Date(entry.at).toLocaleString("fr-FR")}
                  </span>{" "}
                  <span
                    className={`font-semibold ${entry.outcome === "success" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {entry.outcome === "success" ? "OK" : "ERREUR"}
                  </span>{" "}
                  {entry.entityType}#{entry.id} -&gt; {entry.targetStatus}
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
        <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Journal persistant (audit)
          </p>
          {audit.isLoading ? (
            <p className="mt-2 text-xs text-slate-500">Chargement...</p>
          ) : null}
          {audit.error ? (
            <p className="mt-2 text-xs text-rose-700">Audit indisponible.</p>
          ) : null}
          {!audit.isLoading && !audit.error ? (
            <ul className="mt-2 space-y-2">
              {(audit.data?.items ?? []).map((entry) => (
                <li
                  key={`${entry.operationId}-${entry.at}`}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
                >
                  <span className="font-mono">
                    {new Date(entry.at).toLocaleString("fr-FR")}
                  </span>{" "}
                  <span
                    className={`font-semibold ${entry.outcome === "success" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {entry.outcome === "success" ? "OK" : "ERREUR"}
                  </span>{" "}
                  {entry.operationType}
                  {entry.targetId ? ` #${entry.targetId}` : ""}
                  <div className="text-slate-500">Op: {entry.operationId}</div>
                </li>
              ))}
              {(audit.data?.items ?? []).length === 0 ? (
                <li className="text-xs text-slate-500">
                  Aucune operation enregistree.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>

      {(csvExportUrl || jsonExportUrl) && (
        <div className="mt-4 space-y-1 text-xs text-slate-500">
          <p>
            CSV: <code>{csvExportUrl}</code>
          </p>
          <p>
            JSON: <code>{jsonExportUrl}</code>
          </p>
        </div>
      )}

      {lastSuccessMessage ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {lastSuccessMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
