"use client";

import { useCallback, useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

type ReviewResult = {
  teamId: string;
  teamNumber: number;
  publicName: string;
  latestSubmission: { id: string; version: number; status: string; submittedAt: string | null } | null;
  score: { physicalTotals: { massGrams: number | null; countedObjects: number | null; countedButts: number | null; buttMassGrams: number | null; presentParticipants: number }; officialScore: number | null; scoreStatus: "official" | "preview" | "unavailable"; comparableForButtsPerParticipant: boolean; buttsPerParticipant: number | null } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === "string" ? value.error : fallback;
}

function isReviewResult(value: unknown): value is ReviewResult {
  if (!isRecord(value) || typeof value.teamId !== "string" || typeof value.teamNumber !== "number" || typeof value.publicName !== "string") return false;
  if (value.latestSubmission !== null) {
    if (!isRecord(value.latestSubmission) || typeof value.latestSubmission.id !== "string" || typeof value.latestSubmission.version !== "number" || typeof value.latestSubmission.status !== "string" || (value.latestSubmission.submittedAt !== null && typeof value.latestSubmission.submittedAt !== "string")) return false;
  }
  return value.latestSubmission === null || isRecord(value.latestSubmission);
}

function parseReviewResults(value: unknown): ReviewResult[] | null {
  if (!isRecord(value) || !Array.isArray(value.results) || !value.results.every(isReviewResult)) return null;
  return value.results;
}

function parseDivisions(value: unknown): Array<{ id: string; divisionType: string }> | null {
  if (!Array.isArray(value)) return null;
  const divisions = value.filter((division): division is { id: string; divisionType: string } => isRecord(division) && typeof division.id === "string" && typeof division.divisionType === "string");
  return divisions.length === value.length ? divisions : null;
}

export function SpogomiResultReviewPanel({ eventId, divisionId, allowMutations = true, allowDivisionSelection = false }: { eventId: string; divisionId?: string | null; allowMutations?: boolean; allowDivisionSelection?: boolean }) {
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [divisions, setDivisions] = useState<Array<{ id: string; divisionType: string }>>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const effectiveDivisionId = divisionId ?? selectedDivisionId;
  const fetchResults = useCallback(async (): Promise<ReviewResult[]> => { const query = effectiveDivisionId ? `?divisionId=${encodeURIComponent(effectiveDivisionId)}` : ""; const response = await fetch(`/api/spogomi/events/${eventId}/results${query}`, { cache: "no-store" }); const body: unknown = await response.json().catch(() => null); if (!response.ok) throw new Error(errorMessage(body, "Résultats indisponibles.")); const parsed = parseReviewResults(body); if (!parsed) throw new Error("La réponse des résultats est invalide."); return parsed; }, [effectiveDivisionId, eventId]);
  useEffect(() => { if (!allowDivisionSelection) return; let active = true; void fetch(`/api/spogomi/events/${eventId}/observer`, { cache: "no-store" }).then(async (response) => { const body: unknown = await response.json().catch(() => null); if (!response.ok) throw new Error(errorMessage(body, "Divisions indisponibles.")); const projection = isRecord(body) ? body.projection : null; const next = isRecord(projection) ? parseDivisions(projection.divisions) : null; if (!next) throw new Error("La réponse des divisions est invalide."); if (active) { setDivisions(next); if (next.length > 1) setSelectedDivisionId((current) => current ?? next[0]?.id ?? null); } }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Divisions indisponibles."); }); return () => { active = false; }; }, [allowDivisionSelection, eventId]);
  useEffect(() => { let active = true; void fetchResults().then((next) => { if (active) setResults(next); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Résultats indisponibles."); }); return () => { active = false; }; }, [fetchResults]);
  async function review(result: ReviewResult, decision: "certified" | "rejected") { setBusy(result.latestSubmission?.id ?? result.teamId); setError(null); try { const response = await fetch(`/api/spogomi/events/${eventId}/results`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId: result.teamId, submissionId: result.latestSubmission?.id, decision, reason: null, ...(effectiveDivisionId ? { divisionId: effectiveDivisionId } : {}) }) }); const body: unknown = await response.json().catch(() => null); if (!response.ok) throw new Error(errorMessage(body, "Décision refusée.")); setResults(await fetchResults()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Décision refusée."); } finally { setBusy(null); } }
  return <section className="space-y-3" aria-labelledby="spogomi-results-title"><div><h2 id="spogomi-results-title" className="cmm-text-h3">Résultats et certification</h2><p className="cmm-text-small">La soumission d’une équipe ne certifie jamais son résultat. Les totaux physiques restent séparés du score sportif.</p></div>{allowDivisionSelection && divisions.length > 1 ? <div className="flex flex-wrap gap-2" role="tablist" aria-label="Division arbitrée">{divisions.map((division) => <button key={division.id} type="button" role="tab" aria-selected={effectiveDivisionId === division.id} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-black ${effectiveDivisionId === division.id ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-slate-900"}`} onClick={() => setSelectedDivisionId(division.id)}>{division.divisionType === "world_cup" ? "World Cup" : "Casual"}</button>)}</div> : null}{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<div className="space-y-3">{results.map((result) => <div key={result.teamId} className="rounded-xl border border-black/10 bg-white/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-slate-900">Équipe {result.teamNumber} · {result.publicName}</p><p className="text-sm text-slate-600">{result.latestSubmission ? `Version ${result.latestSubmission.version} · ${result.latestSubmission.status}` : "Aucune saisie"}</p></div>{allowMutations && result.latestSubmission?.status === "submitted" ? <div className="flex gap-2"><CmmButton type="button" tone="primary" disabled={busy !== null} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ review(result, "certified").catch(() => undefined); }}>Certifier</CmmButton><CmmButton type="button" tone="critical" disabled={busy !== null} onClick={() => void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ review(result, "rejected").catch(() => undefined)}>Refuser</CmmButton></div> : null}</div>{result.score ? <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-5"><p>Masse : <strong>{result.score.physicalTotals.massGrams ?? "non mesurée"} g</strong></p><p>Mégots comptés : <strong>{result.score.physicalTotals.countedButts ?? "non comptés"}</strong></p><p>Présents : <strong>{result.score.physicalTotals.presentParticipants}</strong></p><p>{result.score.scoreStatus === "official" ? "Score officiel" : "Prévisualisation"} : <strong>{result.score.officialScore ?? "indisponible"}</strong></p><p>Ratio mégots/présent : <strong>{result.score.buttsPerParticipant ?? "non comparable"}</strong></p></div> : null}</div>)}</div></section>;
}
