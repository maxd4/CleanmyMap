"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type {
  ReportPublicLibraryPage,
  ReportPublicLibrarySort,
  ReportPublicLibraryTheme,
} from "@/lib/reports/report-publication-contract";
import { parseJsonSafely } from "@/lib/actions/http-errors";

type ReportsLibraryProps = {
  initialPage: ReportPublicLibraryPage;
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
  ["custom_range", "Période personnalisée"],
] as const;

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date)
    : "Date indisponible";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseLibraryPage(value: unknown): ReportPublicLibraryPage | null {
  if (!isRecord(value) || !Array.isArray(value.rows) || typeof value.page !== "number" || typeof value.pageSize !== "number" || typeof value.total !== "number" || typeof value.hasNextPage !== "boolean" || typeof value.hasPreviousPage !== "boolean") return null;
  const rows = value.rows.filter((row): row is ReportPublicLibraryPage["rows"][number] => {
    if (!isRecord(row) || typeof row.id !== "string" || typeof row.title !== "string" || typeof row.period !== "string" || typeof row.scope !== "string" || typeof row.publishedAt !== "string" || typeof row.viewUrl !== "string" || typeof row.downloadUrl !== "string") return false;
    return (row.theme === "impact" || row.theme === "scientific") && (row.authorLabel === null || typeof row.authorLabel === "string");
  });
  return rows.length === value.rows.length ? { rows, page: value.page, pageSize: value.pageSize, total: value.total, hasNextPage: value.hasNextPage, hasPreviousPage: value.hasPreviousPage } : null;
}

export function ReportsLibrary({ initialPage, initialAvailability = "available" }: ReportsLibraryProps) {
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [theme, setTheme] = useState<"all" | ReportPublicLibraryTheme>("all");
  const [sort, setSort] = useState<ReportPublicLibrarySort>("desc");
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState(initialAvailability);
  const [error, setError] = useState<string | null>(null);
  const libraryRequestAbortRef = useRef<AbortController | null>(null);
  const libraryRequestSequenceRef = useRef(0);

  useEffect(() => () => {
    libraryRequestSequenceRef.current += 1;
    libraryRequestAbortRef.current?.abort();
  }, []);

  async function loadPage(nextPage: number): Promise<void> {
    const requestSequence = libraryRequestSequenceRef.current + 1;
    libraryRequestSequenceRef.current = requestSequence;
    libraryRequestAbortRef.current?.abort();
    const controller = new AbortController();
    libraryRequestAbortRef.current = controller;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(page.pageSize || 12), search: search.trim(), period, theme, sort });
    try {
      const response = await fetch(`/api/reports/library?${params.toString()}`, { cache: "no-store", signal: controller.signal });
      const body = await parseJsonSafely(response);
      const parsedPage = parseLibraryPage(body);
      if (!response.ok || !parsedPage) throw new Error(isRecord(body) && typeof body.error === "string" ? body.error : "Bibliothèque temporairement indisponible.");
      if (libraryRequestSequenceRef.current !== requestSequence || controller.signal.aborted) return;
      setPage(parsedPage);
      setAvailability("available");
    } catch (loadError) {
      if (libraryRequestSequenceRef.current !== requestSequence || controller.signal.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Bibliothèque temporairement indisponible.");
      setAvailability("unavailable");
    } finally {
      if (libraryRequestSequenceRef.current === requestSequence) {
        libraryRequestAbortRef.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <section data-testid="reports-library" className="space-y-5">
      <header>
        <h2 className="text-xl font-bold tracking-tight text-slate-950">Tous les fichiers</h2>
        <p className="mt-1 text-sm leading-6 text-slate-900">Découvrez les PDF volontairement publiés par la communauté. Les rapports privés et leurs métadonnées restent invisibles.</p>
      </header>
      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))_auto]" onSubmit={(event) => { event.preventDefault(); void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ loadPage(1); }}>
        <label className="block text-sm font-semibold text-slate-900">Rechercher par titre<span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3"><Search size={16} aria-hidden="true" className="text-slate-400" /><input className="min-h-11 min-w-0 flex-1 outline-none" value={search} onChange={(event) => setSearch(event.target.value)} /></span></label>
        <label className="text-sm font-semibold text-slate-900">Période<select className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" value={period} onChange={(event) => setPeriod(event.target.value)}>{PERIOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-900">Thème<select className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}><option value="all">Tous les thèmes</option><option value="impact">Impact</option><option value="scientific">Scientifique</option></select></label>
        <label className="text-sm font-semibold text-slate-900">Tri<select className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" value={sort} onChange={(event) => setSort(event.target.value as ReportPublicLibrarySort)}><option value="desc">Plus récent</option><option value="asc">Plus ancien</option></select></label>
        <button type="submit" className="min-h-11 self-end rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700" disabled={loading}>{loading ? "Chargement…" : "Filtrer"}</button>
      </form>
      {availability === "unavailable" || error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error ?? "Bibliothèque temporairement indisponible."}</p> : null}
      {availability === "available" && page.rows.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Aucun fichier publié ne correspond à ces critères.</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {page.rows.map((row) => <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">{row.title}</h3><dl className="cmm-text-body mt-3 grid gap-2 text-slate-900"><div><dt className="inline font-semibold">Période : </dt><dd className="inline">{row.period}</dd></div><div><dt className="inline font-semibold">Périmètre : </dt><dd className="inline">{row.scope}</dd></div><div><dt className="inline font-semibold">Thème : </dt><dd className="inline">{row.theme === "scientific" ? "Scientifique" : "Impact"}</dd></div><div><dt className="inline font-semibold">Publié le : </dt><dd className="inline">{dateLabel(row.publishedAt)}</dd></div>{row.authorLabel ? <div><dt className="inline font-semibold">Auteur : </dt><dd className="inline">{row.authorLabel}</dd></div> : null}</dl><div className="mt-4 flex flex-wrap gap-2"><a className="inline-flex min-h-11 items-center rounded-xl bg-red-600 px-4 text-sm font-bold text-white" href={row.viewUrl} target="_blank" rel="noreferrer">Consulter</a><a className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800" href={row.downloadUrl}>Télécharger PDF</a></div></article>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"><span>{page.total} fichier{page.total === 1 ? "" : "s"} · Page {page.page}</span><div className="flex gap-2"><button type="button" className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-50" disabled={!page.hasPreviousPage || loading} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ loadPage(page.page - 1).catch(() => undefined); }}>Précédent</button><button type="button" className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-50" disabled={!page.hasNextPage || loading} onClick={() => void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ loadPage(page.page + 1).catch(() => undefined)}>Suivant</button></div></div>
    </section>
  );
}
