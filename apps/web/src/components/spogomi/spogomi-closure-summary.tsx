"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import type { SpogomiClosureSummary as SpogomiClosureSummaryData } from "@/lib/spogomi/closure";
import { SpogomiClosureDecisionsPanel } from "./spogomi-closure-decisions-panel";

type Summary = SpogomiClosureSummaryData;

const labels: Record<keyof Pick<Summary, "fieldCompetition" | "arbitration" | "rankings" | "environmental" | "action" | "individualRequests">, string> = {
  fieldCompetition: "Terrain",
  arbitration: "Arbitrage",
  rankings: "Classements",
  environmental: "Bilan environnemental",
  action: "Action CleanMyMap",
  individualRequests: "Demandes individuelles",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSummary(value: unknown): value is Summary {
  const isDecision = (decision: unknown): boolean => isRecord(decision)
    && typeof decision.teamId === "string"
    && typeof decision.divisionId === "string"
    && typeof decision.status === "string"
    && typeof decision.sportEligible === "boolean"
    && typeof decision.environmentalEligibility === "string"
    && typeof decision.decisionVersion === "number"
    && typeof decision.reason === "string";
  const isDivision = (division: unknown): boolean => isRecord(division)
    && typeof division.id === "string"
    && (division.type === "casual" || division.type === "world_cup")
    && typeof division.regulationComplete === "boolean"
    && typeof division.sportEligibleTeams === "number"
    && typeof division.certifiedTeams === "number"
    && typeof division.officialRankingCount === "number"
    && Array.isArray(division.blockers)
    && division.blockers.every((blocker): blocker is string => typeof blocker === "string")
    && Array.isArray(division.teams)
    && division.teams.every((team) => isRecord(team)
      && typeof team.teamId === "string"
      && typeof team.divisionId === "string"
      && (team.teamNumber === null || typeof team.teamNumber === "number")
      && typeof team.publicName === "string"
      && typeof team.certifiedSubmission === "boolean"
      && (team.certifiedSubmissionVersion === null || typeof team.certifiedSubmissionVersion === "number")
      && (team.decision === null || isDecision(team.decision)));
  return isRecord(value)
    && typeof value.fieldCompetition === "string"
    && typeof value.arbitration === "string"
    && typeof value.rankings === "string"
    && typeof value.environmental === "string"
    && typeof value.action === "string"
    && typeof value.individualRequests === "string"
    && Array.isArray(value.blockers)
    && value.blockers.every((blocker): blocker is string => typeof blocker === "string")
    && typeof value.certificationsRemaining === "number"
    && Array.isArray(value.divisions)
    && value.divisions.every(isDivision);
}

function errorMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === "string" ? value.error : fallback;
}

async function fetchClosureSummary(eventId: string): Promise<Summary> {
  const response = await fetch(`/api/spogomi/events/${eventId}/closure`, { cache: "no-store" });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorMessage(body, "Récapitulatif de clôture indisponible."));
  if (!isRecord(body) || !isSummary(body.summary)) throw new Error("Le récapitulatif de clôture est invalide.");
  return body.summary;
}

export function SpogomiClosureSummary({ eventId }: { eventId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);
  const hasSummaryRef = useRef(false);
  const loadSummary = useCallback(async (): Promise<void> => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    try {
      const nextSummary = await fetchClosureSummary(eventId);
      if (requestId !== latestRequestRef.current) return;
      setSummary(nextSummary);
      hasSummaryRef.current = true;
      setError(null);
    } catch (cause) {
      if (requestId !== latestRequestRef.current) return;
      if (!hasSummaryRef.current) setError(cause instanceof Error ? cause.message : "Récapitulatif de clôture indisponible.");
      throw cause;
    }
  }, [eventId]);
  useEffect(() => {
    hasSummaryRef.current = false;
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    void fetchClosureSummary(eventId).then((nextSummary) => {
      if (requestId !== latestRequestRef.current) return;
      setSummary(nextSummary);
      hasSummaryRef.current = true;
      setError(null);
    }).catch((cause: unknown) => {
      if (requestId !== latestRequestRef.current || hasSummaryRef.current) return;
      setError(cause instanceof Error ? cause.message : "Récapitulatif de clôture indisponible.");
    });
    return () => { latestRequestRef.current += 1; };
  }, [eventId]);
  if (error) return <p role="alert" className="text-sm text-red-800">{error}</p>;
  if (!summary) return <p className="cmm-text-small">Chargement du récapitulatif de clôture…</p>;
  const blockerLabels: Record<string, string> = {
    regulation_incomplete: "règlement incomplet",
    certification_remaining: "certification restante",
    contested_result: "résultat contesté",
    official_ranking_missing: "classement officiel manquant",
    ranking_not_published: "classement non publié",
  };
  const blockerText = (blocker: string) => {
    const separator = blocker.indexOf(":");
    if (separator < 0) return blocker;
    const division = summary.divisions.find((candidate) => candidate.id === blocker.slice(0, separator));
    const reason = blocker.slice(separator + 1);
    return `${division ? `Division ${division.type === "world_cup" ? "World Cup" : "Casual"}` : "Division"} : ${blockerLabels[reason] ?? reason}`;
  };
  return <CmmCard tone="slate" variant="glass" className="space-y-3 p-5" data-testid="spogomi-closure-summary">
    <div><h2 className="cmm-text-h3">Récapitulatif de clôture</h2><p className="cmm-text-small">Les décisions sportives, environnementales et de publication restent indépendantes.</p></div>
    <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(labels) as Array<keyof typeof labels>).map((key) => <div key={key} className="rounded-xl bg-white/75 p-3"><dt className="font-bold text-slate-700">{labels[key]}</dt><dd className="font-black text-slate-950">{summary[key]}</dd></div>)}</dl>
    <div className={summary.blockers.length ? "rounded-xl bg-amber-50 p-3 text-sm text-amber-950" : "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"}><p>{summary.blockers.length ? `Clôture bloquée : ${summary.blockers.length} point(s) à traiter.` : "Aucun blocage de clôture détecté."}</p>{summary.blockers.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{summary.blockers.map((blocker) => <li key={blocker}>{blockerText(blocker)}</li>)}</ul> : null}</div>
    {summary.certificationsRemaining > 0 ? <p className="text-sm text-slate-700">Certifications restantes : {summary.certificationsRemaining}</p> : null}
    <SpogomiClosureDecisionsPanel eventId={eventId} summary={summary} onSaved={loadSummary} />
  </CmmCard>;
}
