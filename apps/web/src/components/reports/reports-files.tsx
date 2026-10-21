"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportsWebDocumentDeliveryHistory } from "@/components/reports/web-document/reports-web-document-delivery";
import { createReportsWebDocumentHistoryActions } from "@/components/reports/reports-web-document-history-actions";
import { ReportsFilesFilterForm, ReportsFilesPagination } from "@/components/reports/reports-files-controls";
import { REPORT_GENERATION_HISTORY_LIMIT, type ReportGenerationHistoryPage, type ReportGenerationHistorySort, type ReportGenerationHistoryTheme } from "@/lib/reports/report-generation-history-contract";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import type { ReportPdfTheme } from "./web-document/reports-web-document.shared";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import type { ReportGenerationHistoryActionState } from "@/components/reports/web-document/reports-web-document-delivery";

type ReportsFilesProps = { initialPage: ReportGenerationHistoryPage; initialAvailability?: "available" | "unavailable" };

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
  const historicalReplayRef = useRef<{ reportWindow: Window; payload: PdfReportPayload } | null>(null);
  const [, setDailyExportAvailability] = useState<ReportExportAvailability>("unavailable");
  const [historyActionStateById, setHistoryActionStateById] = useState<Record<string, ReportGenerationHistoryActionState>>({});
  const [publicationPreviewById, setPublicationPreviewById] = useState<Record<string, { title: string; period: string; scope: string; theme: ReportPdfTheme; artifactReady: boolean; documentUrl: string; communicatedContent: string }>>({});

  async function loadPage(nextPage: number): Promise<boolean> {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(page.pageSize || REPORT_GENERATION_HISTORY_LIMIT), search: search.trim(), period, theme, sort });
    try {
      const response = await fetch(`/api/reports/generations?${params.toString()}`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as ReportGenerationHistoryPage | { error?: string } | null;
      if (!response.ok || !body || !("rows" in body)) throw new Error(body && "error" in body && body.error ? body.error : "Historique temporairement indisponible.");
      setPage(body); setHistoryAvailability("available"); return true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Historique temporairement indisponible."); setHistoryAvailability("unavailable"); return false;
    } finally { setLoading(false); }
  }
  const historyActions = createReportsWebDocumentHistoryActions({ reportTheme: "impact", refreshHistory: () => loadPage(page.page), setHistoryAvailability, setDailyExportAvailability, setHistoryActionStateById });
  function action(id: string, kind: "view" | "reexport" | "derive" | "reference" | "json" | "csv"): void { const row = page.rows.find((candidate) => candidate.id === id); void historyActions.handleHistoricalAction(id, kind, historicalReplayRef, themeForRow(row?.theme)); }
  async function preparePublication(id: string): Promise<void> { setError(null); const row = page.rows.find((candidate) => candidate.id === id); if (!row) return; const response = await fetch(`/api/reports/generations/${encodeURIComponent(id)}/publication?theme=${themeForRow(row.theme)}`, { cache: "no-store" }); const body = await response.json().catch(() => null); if (!response.ok || !body?.preview) { setError(body?.error ?? "La publication est temporairement indisponible."); return; } setPublicationPreviewById((current) => ({ ...current, [id]: body.preview })); }
  async function confirmPublication(id: string): Promise<void> { const preview = publicationPreviewById[id]; if (!preview?.artifactReady) return; setError(null); const response = await fetch(`/api/reports/generations/${encodeURIComponent(id)}/publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: preview.theme }) }); const body = await response.json().catch(() => null); if (!response.ok) { setError(body?.error ?? "La publication n'a pas pu être enregistrée."); return; } setPublicationPreviewById((current) => { const next = { ...current }; delete next[id]; return next; }); await loadPage(page.page); }
  async function revokePublication(id: string): Promise<void> { setError(null); const response = await fetch(`/api/reports/generations/${encodeURIComponent(id)}/publication`, { method: "DELETE" }); const body = await response.json().catch(() => null); if (!response.ok) { setError(body?.error ?? "La révocation n'a pas pu être enregistrée."); return; } await loadPage(page.page); }

  return <section data-testid="reports-files" className="space-y-5">
    <header><h2 className="text-xl font-bold tracking-tight text-slate-950">Mes fichiers</h2><p className="mt-1 text-sm leading-6 text-slate-900">Retrouvez toutes vos générations. Les consultations et téléchargements historiques ne consomment pas le quota quotidien.</p></header>
    <ReportsFilesFilterForm search={search} period={period} theme={theme} sort={sort} loading={loading} onSearchChange={setSearch} onPeriodChange={setPeriod} onThemeChange={setTheme} onSortChange={setSort} onSubmit={() => void loadPage(1)} />
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
    <ReportsWebDocumentDeliveryHistory recentRows={page.rows} historyAvailability={historyAvailability} actionStateById={historyActionStateById} onView={(id) => action(id, "view")} onReexport={(id) => action(id, "reexport")} onPrint={(id) => void historyActions.handleHistoricalPrint(id, themeForRow(page.rows.find((row) => row.id === id)?.theme))} onDerive={(id) => action(id, "derive")} onCopyReference={(id) => action(id, "reference")} onExportJson={(id) => action(id, "json")} onExportCsv={(id) => action(id, "csv")} onResume={(id) => router.push(`/reports?tab=generation&resumeId=${encodeURIComponent(id)}`)} publicationPreviewById={publicationPreviewById} onPublish={(id) => void preparePublication(id)} onConfirmPublication={(id) => void confirmPublication(id)} onCancelPublication={(id) => setPublicationPreviewById((current) => { const next = { ...current }; delete next[id]; return next; })} onRevokePublication={(id) => void revokePublication(id)} />
    <ReportsFilesPagination page={page} loading={loading} onPageChange={(nextPage) => void loadPage(nextPage)} />
    <p className="text-xs leading-5 text-slate-500">La publication est volontaire et réversible. Seule une projection sûre du PDF est exposée ; les lignes historiques sans thème affichent « Non enregistré ».</p>
  </section>;
}
