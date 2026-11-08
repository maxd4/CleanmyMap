"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { SpogomiClosureSummary, SpogomiClosureTeamSummary, SpogomiEnvironmentalEligibility, SpogomiTeamClosureStatus } from "@/lib/spogomi/closure";

const statusLabels: Record<SpogomiTeamClosureStatus, string> = {
  present_measured: "Présence mesurée",
  absent: "Absence",
  forfeit: "Forfait",
  excluded: "Exclusion",
  disqualified: "Disqualification",
  result_missing: "Résultat manquant",
  contested: "Contestation",
};

const environmentalLabels: Record<SpogomiEnvironmentalEligibility, string> = {
  eligible: "Éligible environnementalement",
  excluded: "Exclue de l’environnement",
  unknown: "Éligibilité environnementale inconnue",
};

function responseError(value: unknown, fallback: string): string {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string" ? value.error : fallback;
}

function divisionLabel(type: SpogomiClosureSummary["divisions"][number]["type"]): string {
  return type === "world_cup" ? "World Cup" : "Casual";
}

function TeamDecisionCard({ eventId, team, onSaved }: { eventId: string; team: SpogomiClosureTeamSummary; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<SpogomiTeamClosureStatus>(team.decision?.status ?? (team.certifiedSubmission ? "present_measured" : "result_missing"));
  const [sportEligible, setSportEligible] = useState(team.decision?.sportEligible ?? team.certifiedSubmission);
  const [environmentalEligibility, setEnvironmentalEligibility] = useState<SpogomiEnvironmentalEligibility>(team.decision?.environmentalEligibility ?? (team.certifiedSubmission ? "eligible" : "unknown"));
  const [reason, setReason] = useState(team.decision?.reason ?? "");
  const [currentDecisionVersion, setCurrentDecisionVersion] = useState(team.decision?.decisionVersion ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextVersion = currentDecisionVersion + 1;
  const teamLabel = team.teamNumber === null ? team.publicName : `Équipe ${team.teamNumber} · ${team.publicName}`;

  async function save() {
    if (!reason.trim()) {
      setError("Un motif est obligatoire pour enregistrer la décision.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/closure`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "decide",
          divisionId: team.divisionId,
          teamId: team.teamId,
          status,
          sportEligible,
          environmentalEligibility,
          reason: reason.trim(),
          decisionVersion: nextVersion,
        }),
      });
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(responseError(body, "La décision de clôture a été refusée."));
      setCurrentDecisionVersion(nextVersion);
      try {
        await onSaved();
        setError(null);
      } catch {
        setError("Décision enregistrée, mais le récapitulatif n’a pas pu être actualisé. Vos valeurs restent conservées.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La décision de clôture a été refusée.");
    } finally {
      setBusy(false);
    }
  }

  return <CmmCard tone="slate" variant="muted" className="space-y-3 border border-slate-200 p-4" data-testid={`spogomi-closure-team-${team.teamId}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 className="font-black text-slate-900">{teamLabel}</h4>
        <p className="text-sm text-slate-700">{team.certifiedSubmission ? `Soumission certifiée · version ${team.certifiedSubmissionVersion ?? "inconnue"}` : "Aucune soumission certifiée"}</p>
      </div>
      <p className="text-sm font-bold text-slate-700">{team.decision ? `Décision courante · version ${team.decision.decisionVersion}` : "Aucune décision courante"}</p>
    </div>
    <fieldset disabled={busy} className="contents">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-800">Décision<select disabled={busy} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal" value={status} onChange={(event) => setStatus(event.target.value as SpogomiTeamClosureStatus)} aria-label={`Décision de clôture pour ${teamLabel}`}>{(Object.keys(statusLabels) as SpogomiTeamClosureStatus[]).map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-800">Éligibilité environnementale<select disabled={busy} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal" value={environmentalEligibility} onChange={(event) => setEnvironmentalEligibility(event.target.value as SpogomiEnvironmentalEligibility)}>{(Object.keys(environmentalLabels) as SpogomiEnvironmentalEligibility[]).map((value) => <option key={value} value={value}>{environmentalLabels[value]}</option>)}</select></label>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-800"><input disabled={busy} type="checkbox" checked={sportEligible} onChange={(event) => setSportEligible(event.target.checked)} /> Éligible sportivement</label>
      <label className="block text-sm font-bold text-slate-800">Motif obligatoire<textarea disabled={busy} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" required aria-required="true" maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Expliquez la décision et sa source vérifiable." /></label>
    </fieldset>
    <div className="flex flex-wrap items-center gap-3"><CmmButton type="button" tone="primary" disabled={busy || !reason.trim()} loading={busy} onClick={() => { void save(); }}>Enregistrer la décision · v{nextVersion}</CmmButton>{error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}</div>
  </CmmCard>;
}

export function SpogomiClosureDecisionsPanel({ eventId, summary, onSaved }: { eventId: string; summary: SpogomiClosureSummary; onSaved: () => Promise<void> }) {
  return <CmmCard tone="slate" variant="glass" className="space-y-5 p-5" data-testid="spogomi-closure-decisions-panel">
    <div><h2 className="cmm-text-h3">Décisions de clôture par équipe</h2><p className="cmm-text-small">Choisissez explicitement le statut de chaque équipe. Les éligibilités sportive et environnementale sont séparées ; chaque correction conserve sa version et son motif.</p></div>
    {summary.divisions.map((division) => <section key={division.id} className="space-y-3" aria-labelledby={`spogomi-closure-division-${division.id}`}><div><h3 id={`spogomi-closure-division-${division.id}`} className="font-black text-slate-900">Division {divisionLabel(division.type)}</h3><p className="text-sm text-slate-700">{division.teams.length} équipe(s) · {division.certifiedTeams} soumission(s) certifiée(s)</p></div>{division.teams.length ? <div className="space-y-3">{division.teams.map((team) => <TeamDecisionCard key={`${team.teamId}:${team.decision?.decisionVersion ?? 0}`} eventId={eventId} team={team} onSaved={onSaved} />)}</div> : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Aucune équipe dans cette division.</p>}</section>)}
    {!summary.divisions.length ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Aucune division à clôturer.</p> : null}
  </CmmCard>;
}
