"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportsWebDocumentDeliveryHistory } from "@/components/reports/web-document/reports-web-document-delivery";
import { createReportsWebDocumentHistoryActions } from "@/components/reports/reports-web-document-history-actions";
import { ReportsFilesFilterForm, ReportsFilesPagination } from "@/components/reports/reports-files-controls";
import { isReportGenerationHistoryRow, REPORT_GENERATION_HISTORY_LIMIT, type ReportGenerationHistoryPage, type ReportGenerationHistorySort, type ReportGenerationHistoryTheme } from "@/lib/reports/report-generation-history-contract";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import type { ReportPdfTheme } from "./web-document/reports-web-document.shared";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import type { ReportGenerationHistoryActionState } from "@/components/reports/web-document/reports-web-document-delivery";
import type { ReportPublicLibraryTheme } from "@/lib/reports/report-publication-contract";

type ReportsFilesProps = { initialPage: ReportGenerationHistoryPage; initialAvailability?: "available" | "unavailable" };
type PublicationPreview = { title: string; period: string; scope: string; theme: ReportPdfTheme; artifactReady: boolean; documentUrl: string; communicatedContent: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseHistoryPage(value: unknown): ReportGenerationHistoryPage | null {
  if (!isRecord(value) || !Array.isArray(value.rows) || typeof value.page !== "number" || typeof value.pageSize !== "number" || typeof value.total !== "number" || typeof value.hasNextPage !== "boolean" || typeof value.hasPreviousPage !== "boolean") return null;
  if (!value.rows.every(isReportGenerationHistoryRow)) return null;
  return { rows: value.rows, page: value.page, pageSize: value.pageSize, total: value.total, hasNextPage: value.hasNextPage, hasPreviousPage: value.hasPreviousPage };
}

function parsePublicationPreview(value: unknown): PublicationPreview | null {
  if (!isRecord(value) || typeof value.title !== "string" || typeof value.period !== "string" || typeof value.scope !== "string" || typeof value.artifactReady !== "boolean" || typeof value.documentUrl !== "string" || typeof value.communicatedContent !== "string" || (value.theme !== "impact" && value.theme !== "scientific")) return null;
  return { title: value.title, period: value.period, scope: value.scope, theme: value.theme as ReportPublicLibraryTheme, artifactReady: value.artifactReady, documentUrl: value.documentUrl, communicatedContent: value.communicatedContent };
}

async function readJsonRecord(response: Response): Promise<Record<string, unknown>> {
  let raw: unknown;
  try { raw = await response.json(); } catch { throw new Error("Le serveur a renvoyé une réponse illisible."); }
  if (!isRecord(raw)) throw new Error("Le serveur a renvoyé une réponse invalide.");
  return raw;
}

function themeForRow(theme: ReportGenerationHistoryTheme | null | undefined): ReportPdfTheme {
  return theme ?? "impact";
}

export function ReportsFiles({ initialPage, initialAvailability = "available" }: ReportsFilesProps) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [theme, setTheme] = useState<"all" | ReportGenerationHistoryTheme>("all");
  const [sort, setSort] = useState<ReportGenerationHistorySort>("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyAvailability, setHistoryAvailability] = useState<"available" | "unavailable">(initialAvailability);
  const historyRequestAbortRef = useRef<AbortController | null>(null);
  const historyRequestSequenceRef = useRef(0);
  const historicalReplayRef = useRef<{ reportWindow: Window; payload: PdfReportPayload } | null>(null);
  const [, setDailyExportAvailability] = useState<ReportExportAvailability>("unavailable");
  const [historyActionStateById, setHistoryActionStateById] = useState<Record<string, ReportGenerationHistoryActionState>>({});
  const [publicationPreviewById, setPublicationPreviewById] = useState<Record<string, { title: string; period: string; scope: string; theme: ReportPdfTheme; artifactReady: boolean; documentUrl: string; communicatedContent: string }>>({});

  useEffect(() => () => {
    historyRequestSequenceRef.current += 1;
    historyRequestAbortRef.current?.abort();
  }, []);

  async function loadPage(nextPage: number): Promise<boolean> {
    const requestSequence = historyRequestSequenceRef.current + 1;
    historyRequestSequenceRef.current = requestSequence;
    historyRequestAbortRef.current?.abort();
    const controller = new AbortController();
    historyRequestAbortRef.current = controller;
    setLoading(true); setError(null);
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(page.pageSize || REPORT_GENERATION_HISTORY_LIMIT), search: search.trim(), period, theme, sort });
    try {
      const response = await fetch(`/api/reports/generations?${params.toString()}`, { cache: "no-store", signal: controller.signal });
      const rawBody = await readJsonRecord(response);
      if (!response.ok) throw new Error(typeof rawBody.error === "string" ? rawBody.error : "Historique temporairement indisponible.");
      const body = parseHistoryPage(rawBody);
      if (!body) throw new Error("Historique temporairement indisponible.");
      if (historyRequestSequenceRef.current !== requestSequence || controller.signal.aborted) return false;
      setPage(body); setHistoryAvailability("available"); return true;
    } catch (loadError) {
      if (historyRequestSequenceRef.current !== requestSequence || controller.signal.aborted) return false;
      setError(loadError instanceof Error ? loadError.message : "Historique temporairement indisponible."); setHistoryAvailability("unavailable"); return false;
    } finally {
      if (historyRequestSequenceRef.current === requestSequence) {
        historyRequestAbortRef.current = null;
        setLoading(false);
      }
    }
  }
  function getHistoryActions() {
    return createReportsWebDocumentHistoryActions({ reportTheme: "impact", refreshHistory: () => loadPage(page.page), setHistoryAvailability, setDailyExportAvailability, setHistoryActionStateById });
  }
  function runAsync(action: () => Promise<void>): void { void action().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "L’opération sur les rapports a échoué.")); }
  function action(id: string, kind: "view" | "reexport" | "derive" | "reference" | "json" | "csv"): void { const row = page.rows.find((candidate) => candidate.id === id); runAsync(() => getHistoryActions().handleHistoricalAction(id, kind, historicalReplayRef, themeForRow(row?.theme))); }
  async function preparePublication(id: string): Promise<void> { setError(null); const row = page.rows.find((candidate) => candidate.id === id); if (!row) return; const response = await fetch(`/api/reports/generations/${encodeURIComponent(id)}/publication?theme=${themeForRow(row.theme)}`, { cache: "no-store" }); const rawBody = await readJsonRecord(response); if (!response.ok) throw new Error(typeof rawBody.error === "string" ? rawBody.error : "La publication est temporairement indisponible."); const preview = parsePublicationPreview(rawBody.preview); if (!preview) throw new Error("La publication a renvoyé un aperçu invalide."); setPublicationPreviewById((current) => ({ ...current, [id]: preview })); }
  async function confirmPublication(id: string): Promise<void> { const preview = publicationPreviewById[id]; if (!preview?.artifactReady) return; setError(null); const response = await fetch(`/api/reports/generations/${encodeURIComponent(id)}/publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: preview.theme }) }); const rawBody = await readJsonRecord(response); if (!response.ok) throw new Error(typeof rawBody.error === "string" ? rawBody.error : "La publication n'a pas pu être enregistrée."); setPublicationPreviewById((current) => { const next = { ...current }; delete next[id]; return next; }); await loadPage(page.page); }
  async function revokePublication(id: string): Promise<void> { setError(null); const response = await fetch(`/api/reports/generations/${encodeURIComponent(id)}/publication`, { method: "DELETE" }); const rawBody = await readJsonRecord(response); if (!response.ok) throw new Error(typeof rawBody.error === "string" ? rawBody.error : "La révocation n'a pas pu être enregistrée."); await loadPage(page.page); }

  return <section data-testid="reports-files" className="space-y-5">
    <header><h2 className="text-xl font-bold tracking-tight text-slate-950">Mes fichiers</h2><p className="mt-1 text-sm leading-6 text-slate-900">Retrouvez toutes vos générations. Les consultations et téléchargements historiques ne consomment pas le quota quotidien.</p></header>
    <ReportsFilesFilterForm search={search} period={period} theme={theme} sort={sort} loading={loading} onSearchChange={setSearch} onPeriodChange={setPeriod} onThemeChange={setTheme} onSortChange={setSort} onSubmit={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ loadPage(1); }} />
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
    <ReportsWebDocumentDeliveryHistory recentRows={page.rows} historyAvailability={historyAvailability} actionStateById={historyActionStateById} onView={(id) => action(id, "view")} onReexport={(id) => action(id, "reexport")} onPrint={(id) => { const row = page.rows.find((candidate) => candidate.id === id); runAsync(() => getHistoryActions().handleHistoricalPrint(id, themeForRow(row?.theme))); }} onDerive={(id) => action(id, "derive")} onCopyReference={(id) => action(id, "reference")} onExportJson={(id) => action(id, "json")} onExportCsv={(id) => action(id, "csv")} onResume={(id) => router.push(`/reports?tab=generation&resumeId=${encodeURIComponent(id)}`)} publicationPreviewById={publicationPreviewById} onPublish={(id) => runAsync(() => preparePublication(id))} onConfirmPublication={(id) => runAsync(() => confirmPublication(id))} onCancelPublication={(id) => setPublicationPreviewById((current) => { const next = { ...current }; delete next[id]; return next; })} onRevokePublication={(id) => runAsync(() => revokePublication(id))} />
    <ReportsFilesPagination page={page} loading={loading} onPageChange={(nextPage) => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ loadPage(nextPage); }} />
    <p className="text-xs leading-5 text-slate-500">La publication est volontaire et réversible. Seule une projection sûre du PDF est exposée ; les lignes historiques sans thème affichent « Non enregistré ».</p>
  </section>;
}
