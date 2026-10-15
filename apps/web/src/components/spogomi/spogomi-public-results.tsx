"use client";

import { useCallback, useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { SpogomiPublicResults } from "@/lib/spogomi/results-projection";

function formatNumber(value: number | null, maximumFractionDigits = 2) {
  return value === null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits }).format(value);
}

function Ranking({ title, description, ranking }: { title: string; description: string; ranking: SpogomiPublicResults["sport"] | SpogomiPublicResults["butts"] }) {
  return <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
    <div className="text-slate-900"><h2 className="text-xl font-black text-emerald-950">{title}</h2><p className="text-sm text-slate-800">{description}</p></div>
    {ranking.reason && ranking.entries.length === 0 ? <p className="rounded-xl border border-dashed border-emerald-200 p-4 text-sm text-slate-700">{ranking.reason}</p> : null}
    {ranking.entries.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-black/10 text-xs uppercase tracking-wide text-slate-600"><th className="px-2 py-2">Rang</th><th className="px-2 py-2">Équipe</th><th className="px-2 py-2">Valeur</th><th className="px-2 py-2">Présents</th><th className="px-2 py-2">Statut</th></tr></thead><tbody>{ranking.entries.map((entry) => <tr key={`${title}-${entry.teamNumber}`} className="border-b border-black/5"><td className="px-2 py-3 font-black">{entry.rank ?? "—"}</td><td className="px-2 py-3"><span className="font-bold">{entry.publicName}</span><span className="ml-2 text-xs text-slate-500">#{entry.teamNumber}</span></td><td className="px-2 py-3">{entry.valueUnit === "points" ? `${formatNumber(entry.score ?? null)} points` : entry.numerator !== null && entry.numerator !== undefined && typeof entry.denominator === "number" && entry.denominator > 0 ? `${formatNumber(entry.numerator, 0)} / ${formatNumber(entry.denominator, 0)} = ${formatNumber(entry.ratio ?? null, 2)}` : "Non comparable"}</td><td className="px-2 py-3">{formatNumber(entry.presentParticipants ?? null, 0)}</td><td className="px-2 py-3"><span className={entry.status === "certified" ? "font-bold text-emerald-700" : entry.status === "provisional" ? "font-bold text-amber-700" : "text-slate-600"}>{entry.status === "certified" ? "Certifié" : entry.status === "provisional" ? "Provisoire" : entry.reason ?? "Indisponible"}</span></td></tr>)}</tbody></table></div> : null}
  </CmmCard>;
}

export function SpogomiPublicResults({ eventSlug, initial }: { eventSlug: string; initial: SpogomiPublicResults | null }) {
  const [results, setResults] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [divisionId, setDivisionId] = useState<string | null>(initial?.divisions?.[0]?.id ?? null);
  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/spogomi/public/events/${encodeURIComponent(eventSlug)}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Résultats indisponibles.");
      setResults(body.results as SpogomiPublicResults);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Résultats indisponibles.");
    } finally {
      setBusy(false);
    }
  }, [eventSlug]);
  // Justification polling: public provisional results may change after arbitration; pause while hidden or inactive to avoid background traffic.
  useEffect(() => {
    if (document.visibilityState === "hidden" || results?.visibility === "hidden") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") void refresh();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [refresh, results?.visibility]);
  if (!results || results.visibility === "hidden") return <CmmCard tone="slate" variant="glass" className="border-dashed p-5"><h2 className="font-black text-slate-900">Classements et résultats</h2><p className="mt-2 text-sm text-slate-700">Les résultats restent masqués jusqu’à publication par l’organisateur.</p></CmmCard>;
  const activeDivision = results.divisions?.find((division) => division.id === divisionId) ?? results.divisions?.[0] ?? null;
  const sport = activeDivision?.sport ?? results.sport;
  const butts = activeDivision?.butts ?? results.butts;
  return <section className="space-y-5" aria-labelledby="spogomi-results-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="spogomi-results-title" className="text-2xl font-black text-slate-950">Classements et résultats</h2><p className="text-sm text-slate-700">Règlement {activeDivision?.regulationVersion ?? results.regulationVersion} · dernière lecture {new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(new Date(results.refreshedAt))}</p></div><CmmButton type="button" tone="secondary" size="sm" disabled={busy} onClick={() => void refresh()}>{busy ? "Actualisation…" : "Actualiser"}</CmmButton></div>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}{results.divisions?.length ? <div className="flex flex-wrap gap-2" role="tablist" aria-label="Classements par division">{results.divisions.map((division) => <button key={division.id} type="button" role="tab" aria-selected={division.id === activeDivision?.id} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-black ${division.id === activeDivision?.id ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-slate-800"}`} onClick={() => setDivisionId(division.id)}>{division.type === "world_cup" ? "World Cup" : "Casual"}</button>)}</div> : null}<Ranking title="Classement sportif" description="Points calculés avec la version du règlement publiée pour cette division. Les équipes de l’autre division ne sont pas incluses." ranking={sport} /><Ranking title="Mégots par participant" description="Mégots directement comptés / participants présents et vérifiés dans cette division." ranking={butts} />{results.environmental.status === "available" ? <CmmCard tone="amber" variant="glass" className="space-y-3 p-5"><h2 className="text-xl font-black text-amber-950">Bilan environnemental global</h2><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white/70 p-3"><p className="text-xs uppercase tracking-wide text-slate-600">Déchets hors mégots</p><p className="text-xl font-black text-slate-950">{formatNumber(results.environmental.totalWasteMassGrams === null ? null : results.environmental.totalWasteMassGrams / 1000)} kg</p></div><div className="rounded-xl bg-white/70 p-3"><p className="text-xs uppercase tracking-wide text-slate-600">Mégots comptés</p><p className="text-xl font-black text-slate-950">{formatNumber(results.environmental.cigaretteButtsCount, 0)}</p></div><div className="rounded-xl bg-white/70 p-3"><p className="text-xs uppercase tracking-wide text-slate-600">Présents vérifiés</p><p className="text-xl font-black text-slate-950">{formatNumber(results.environmental.participantsPresent, 0)}</p></div></div><p className="text-xs text-slate-700">Projection CleanMyMap {results.environmental.projectionVersion ?? "—"}. Les mesures certifiées des divisions sont consolidées une seule fois dans l’action parent.</p></CmmCard> : <CmmCard tone="slate" variant="glass" className="border-dashed p-5"><h2 className="font-black text-slate-900">Bilan environnemental global</h2><p className="mt-2 text-sm text-slate-700">Le bilan certifié CleanMyMap n’est pas encore publié.</p></CmmCard>}</section>;
}
