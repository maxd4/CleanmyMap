"use client";

import { Search } from "lucide-react";
import type { ReportGenerationHistoryPage, ReportGenerationHistorySort, ReportGenerationHistoryTheme } from "@/lib/reports/report-generation-history-contract";

const PERIOD_OPTIONS = [
  ["all", "Toutes les périodes"], ["thirty_days", "30 jours"], ["three_months", "3 mois"], ["six_months", "6 mois"], ["twelve_months", "12 mois"], ["current_year", "Année courante"], ["full_history", "Historique complet"],
] as const;

export function ReportsFilesFilterForm(props: {
  search: string;
  period: string;
  theme: "all" | ReportGenerationHistoryTheme;
  sort: ReportGenerationHistorySort;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onThemeChange: (value: "all" | ReportGenerationHistoryTheme) => void;
  onSortChange: (value: ReportGenerationHistorySort) => void;
  onSubmit: () => void;
}) {
  return <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))_auto]" onSubmit={(event) => { event.preventDefault(); props.onSubmit(); }}>
    <label className="block text-sm font-semibold text-slate-700">Rechercher par titre<span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3"><Search size={16} aria-hidden="true" className="text-slate-400" /><input className="min-h-11 min-w-0 flex-1 outline-none" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} /></span></label>
    <label className="text-sm font-semibold text-slate-700">Période<select className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" value={props.period} onChange={(event) => props.onPeriodChange(event.target.value)}>{PERIOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="text-sm font-semibold text-slate-700">Thème<select className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" value={props.theme} onChange={(event) => props.onThemeChange(event.target.value as typeof props.theme)}><option value="all">Tous les thèmes</option><option value="impact">Impact</option><option value="scientific">Scientifique</option></select></label>
    <label className="text-sm font-semibold text-slate-700">Tri<select className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" value={props.sort} onChange={(event) => props.onSortChange(event.target.value as ReportGenerationHistorySort)}><option value="desc">Plus récent</option><option value="asc">Plus ancien</option></select></label>
    <button type="submit" className="min-h-11 self-end rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700" disabled={props.loading}>{props.loading ? "Chargement…" : "Filtrer"}</button>
  </form>;
}

export function ReportsFilesPagination(props: { page: ReportGenerationHistoryPage; loading: boolean; onPageChange: (page: number) => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"><span>{props.page.total} fichier{props.page.total === 1 ? "" : "s"} · Page {props.page.page}</span><div className="flex gap-2"><button type="button" className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-50" disabled={!props.page.hasPreviousPage || props.loading} onClick={() => props.onPageChange(props.page.page - 1)}>Précédent</button><button type="button" className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-50" disabled={!props.page.hasNextPage || props.loading} onClick={() => props.onPageChange(props.page.page + 1)}>Suivant</button></div></div>;
}
