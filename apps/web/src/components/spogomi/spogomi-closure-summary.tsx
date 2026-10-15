"use client";

import { useEffect, useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";

type Summary = {
  fieldCompetition: string;
  arbitration: string;
  rankings: string;
  environmental: string;
  action: string;
  individualRequests: string;
  blockers: string[];
  certificationsRemaining: number;
};

const labels: Record<keyof Pick<Summary, "fieldCompetition" | "arbitration" | "rankings" | "environmental" | "action" | "individualRequests">, string> = {
  fieldCompetition: "Terrain",
  arbitration: "Arbitrage",
  rankings: "Classements",
  environmental: "Bilan environnemental",
  action: "Action CleanMyMap",
  individualRequests: "Demandes individuelles",
};

export function SpogomiClosureSummary({ eventId }: { eventId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void fetch(`/api/spogomi/events/${eventId}/closure`, { cache: "no-store" }).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Récapitulatif de clôture indisponible.");
      if (active) setSummary(body.summary as Summary);
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Récapitulatif de clôture indisponible."); });
    return () => { active = false; };
  }, [eventId]);
  if (error) return <p role="alert" className="text-sm text-red-800">{error}</p>;
  if (!summary) return <p className="cmm-text-small">Chargement du récapitulatif de clôture…</p>;
  return <CmmCard tone="slate" variant="glass" className="space-y-3 p-5" data-testid="spogomi-closure-summary">
    <div><h2 className="cmm-text-h3">Récapitulatif de clôture</h2><p className="cmm-text-small">Les décisions sportives, environnementales et de publication restent indépendantes.</p></div>
    <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(labels) as Array<keyof typeof labels>).map((key) => <div key={key} className="rounded-xl bg-white/75 p-3"><dt className="font-bold text-slate-700">{labels[key]}</dt><dd className="font-black text-slate-950">{summary[key]}</dd></div>)}</dl>
    <p className={summary.blockers.length ? "rounded-xl bg-amber-50 p-3 text-sm text-amber-950" : "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"}>{summary.blockers.length ? `Clôture bloquée : ${summary.blockers.length} point(s) à traiter.` : "Aucun blocage de clôture détecté."}</p>
    {summary.certificationsRemaining > 0 ? <p className="text-sm text-slate-700">Certifications restantes : {summary.certificationsRemaining}</p> : null}
  </CmmCard>;
}
