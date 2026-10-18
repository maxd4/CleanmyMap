"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { ReportsWebDocumentDeliveryHistory } from "@/components/reports/web-document/reports-web-document-delivery";
import { createReportsWebDocumentHistoryActions } from "@/components/reports/reports-web-document-history-actions";
import {
  REPORT_GENERATION_HISTORY_PAGE_SIZE,
  type ReportGenerationHistoryPage,
  type ReportGenerationHistorySort,
  type ReportGenerationHistoryTheme,
} from "@/lib/reports/report-generation-history-contract";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import type { ReportPdfTheme } from "./web-document/reports-web-document.shared";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import type { ReportGenerationHistoryActionState } from "@/components/reports/web-document/reports-web-document-delivery";

type ReportsFilesProps = {
  initialPage: ReportGenerationHistoryPage;
  initialAvailability?: "available" | "unavailable";
};

const PERIOD_OPTIONS = [
  ["all", "Toutes les périodes"],
  ["thirty_days", "30 jours"],
  ["three_months", "3 mois"],
  ["six_months", "6 mois"],
  ["twelve_months", "12 mois"],
  ["current_year", "Année courante"],
  ["full_history", "Historique complet"],
] as const;

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

  async function loadPage(nextPage: number): Promise<void> {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(page.pageSize || REPORT_GENERATION_HISTORY_PAGE_SIZE),
      search: search.trim(),
      period,
      theme,
      sort,
    });
    try {
      const response = await fetch(`/api/reports/generations?${params.toString()}`, { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as ReportGenerationHistoryPage | { error?: string } | null;
      if (!response.ok || !body || !("rows" in body)) {
        throw new Error(body && "error" in body && body.error ? body.error : "Historique temporairement indisponible.");
      }
      setPage(body);
      setHistoryAvailability("available");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Historique temporairement indisponible.");
      setHistoryAvailability("unavailable");
    } finally {
      setLoading(false);
    }
  }

  const historyActions = createReportsWebDocumentHistoryActions({
    reportTheme: "impact",
    refreshHistory: () => loadPage(page.page),
    setHistoryAvailability,
    setDailyExportAvailability,
    setHistoryActionStateById,
  });

  function resume(id: string): void {
    router.push(`/reports?tab=generation&resumeId=${encodeURIComponent(id)}`);
  }

  function action(id: string, kind: "view" | "reexport" | "derive" | "reference" | "json" | "csv"): void {
    const row = page.rows.find((candidate) => candidate.id === id);
    const rowTheme = themeForRow(row?.theme);
    void historyActions.handleHistoricalAction(id, kind, historicalReplayRef, rowTheme);
  }

  return (
    <section data-testid="reports-files" className="space-y-5">
      <header>
        <h2 className="text-xl font-bold tracking-tight text-slate-950">Mes fichiers</h2>
        <p className="mt-1 text-sm leading-6 text-slate-900">
          Retrouvez toutes vos générations. Les consultations et téléchargements historiques ne consomment pas le quota quotidien.
        </p>
      </header>

      <form
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void loadPage(1);
        }}
      >
        <label className="block text-sm font-semibold text-slate-700">
          Rechercher par titre
          <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
            <Search size={16} aria-hidden="true" className="text-slate-400" />
            <input className="min-h-11 min-w-0 flex-1 outline-none" value={search} onChange={(event) => setSearch(event.target.value)} />
          </span>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Période
          <select className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" value={period} onChange={(event) => setPeriod(event.target.value)}>
            {PERIOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Thème
          <select className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}>
            <option value="all">Tous les thèmes</option>
            <option value="impact">Impact</option>
            <option value="scientific">Scientifique</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Tri
          <select className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" value={sort} onChange={(event) => setSort(event.target.value as ReportGenerationHistorySort)}>
            <option value="desc">Plus récent</option>
            <option value="asc">Plus ancien</option>
          </select>
        </label>
        <button type="submit" className="min-h-11 self-end rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700" disabled={loading}>
          {loading ? "Chargement…" : "Filtrer"}
        </button>
      </form>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}

      <ReportsWebDocumentDeliveryHistory
        recentRows={page.rows}
        historyAvailability={historyAvailability}
        actionStateById={historyActionStateById}
        onView={(id) => action(id, "view")}
        onReexport={(id) => action(id, "reexport")}
        onPrint={(id) => void historyActions.handleHistoricalPrint(id, themeForRow(page.rows.find((row) => row.id === id)?.theme))}
        onDerive={(id) => action(id, "derive")}
        onCopyReference={(id) => action(id, "reference")}
        onExportJson={(id) => action(id, "json")}
        onExportCsv={(id) => action(id, "csv")}
        onResume={resume}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span>{page.total} fichier{page.total === 1 ? "" : "s"} · Page {page.page}</span>
        <div className="flex gap-2">
          <button type="button" className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-50" disabled={!page.hasPreviousPage || loading} onClick={() => void loadPage(page.page - 1)}>Précédent</button>
          <button type="button" className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-50" disabled={!page.hasNextPage || loading} onClick={() => void loadPage(page.page + 1)}>Suivant</button>
        </div>
      </div>
      <p className="text-xs leading-5 text-slate-500">La publication dans « Tous les fichiers » sera proposée lorsque cette fonctionnalité sera activée. Les lignes historiques sans thème affichent « Non enregistré ».</p>
    </section>
  );
}
