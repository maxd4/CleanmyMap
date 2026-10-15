"use client";

import { useEffect, useMemo, useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";

type ObserverProjection = {
  divisions: Array<{ id: string; divisionType: string; divisionKey: string }>;
  teams: Array<{
    id: string;
    divisionId: string | null;
    teamNumber: number;
    publicName: string;
    compositionState: string;
    submissionStatus: string | null;
    submissionVersion: number | null;
    submittedAt: string | null;
    certified: boolean;
  }>;
  participation: { registered: number; present: number };
};

function divisionLabel(value: string): string {
  return value === "world_cup" ? "World Cup" : "Casual";
}

function statusLabel(value: string | null): string {
  if (value === "certified") return "Certifiée";
  if (value === "submitted") return "À arbitrer";
  if (value === "rejected") return "À corriger";
  if (value === "provisional") return "Provisoire";
  return value ?? "Aucune soumission";
}

export function SpogomiObserverCockpitPanel({ eventId, view }: { eventId: string; view: "teams" | "results" }) {
  const [projection, setProjection] = useState<ObserverProjection | null>(null);
  const [divisionId, setDivisionId] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/spogomi/events/${eventId}/observer`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Les données opérationnelles sont indisponibles.");
        if (active) setProjection(body.projection as ObserverProjection);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Les données opérationnelles sont indisponibles.");
      });
    return () => { active = false; };
  }, [eventId]);

  const teams = useMemo(
    () => projection?.teams.filter((team) => divisionId === "all" || team.divisionId === divisionId) ?? [],
    [divisionId, projection],
  );
  const submittedCount = teams.filter((team) => team.submissionStatus === "submitted").length;

  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">{error}</p>;
  if (!projection) return <p className="cmm-text-small">Chargement des données opérationnelles…</p>;

  return <div className="space-y-4" data-testid={`spogomi-observer-${view}`}>
    {projection.divisions.length > 1 ? <div className="flex flex-wrap gap-2" role="group" aria-label="Division affichée">
      <button type="button" className={`min-h-11 rounded-xl px-4 py-2 text-sm font-black ${divisionId === "all" ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-slate-900"}`} aria-pressed={divisionId === "all"} onClick={() => setDivisionId("all")}>Toutes les divisions</button>
      {projection.divisions.map((division) => <button key={division.id} type="button" className={`min-h-11 rounded-xl px-4 py-2 text-sm font-black ${divisionId === division.id ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-slate-900"}`} aria-pressed={divisionId === division.id} onClick={() => setDivisionId(division.id)}>{divisionLabel(division.divisionType)}</button>)}
    </div> : null}
    <div className="grid gap-3 sm:grid-cols-3">
      <CmmCard tone="slate" variant="muted" className="p-4"><p className="cmm-text-small">Participants inscrits</p><p className="text-2xl font-black text-slate-950">{projection.participation.registered}</p></CmmCard>
      <CmmCard tone="slate" variant="muted" className="p-4"><p className="cmm-text-small">Présents</p><p className="text-2xl font-black text-slate-950">{projection.participation.present}</p></CmmCard>
      <CmmCard tone={view === "results" && submittedCount > 0 ? "amber" : "emerald"} variant="muted" className="p-4"><p className="cmm-text-small">{view === "results" ? "Soumissions à suivre" : "Équipes visibles"}</p><p className="text-2xl font-black text-slate-950">{view === "results" ? submittedCount : teams.length}</p></CmmCard>
    </div>
    <CmmCard tone="slate" variant="glass" className="space-y-3 p-5">
      <div><h3 className="cmm-text-h3">{view === "teams" ? "Équipes et composition" : "Suivi des résultats"}</h3><p className="cmm-text-small">Lecture seule · les contrôles serveur conservent les droits et les données sensibles hors de cette vue.</p></div>
      {teams.length ? <div className="grid gap-3 md:grid-cols-2">{teams.map((team) => <article key={team.id} className="rounded-xl border border-black/10 bg-white/75 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-black text-slate-950">Équipe {team.teamNumber} · {team.publicName}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-800">{statusLabel(team.submissionStatus)}</span></div><p className="mt-2 text-sm text-slate-700">Division : {projection.divisions.find((division) => division.id === team.divisionId)?.divisionType ? divisionLabel(projection.divisions.find((division) => division.id === team.divisionId)!.divisionType) : "édition simple"}</p>{view === "teams" ? <p className="mt-1 text-sm text-slate-700">Composition : {team.compositionState}</p> : <p className="mt-1 text-sm text-slate-700">{team.submissionVersion ? `Version ${team.submissionVersion}` : "Aucune version"}{team.certified ? " · certification enregistrée" : ""}</p>}</article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-700">Aucune équipe disponible pour cette sélection.</p>}
      {view === "results" ? <p className="text-sm text-slate-700">Les décisions d’arbitrage et les classements publiés apparaissent dans les sections autorisées correspondantes.</p> : null}
    </CmmCard>
  </div>;
}
