"use client";

import { useCallback, useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

type ReviewResult = {
  teamId: string;
  teamNumber: number;
  publicName: string;
  latestSubmission: { id: string; version: number; status: string; submittedAt: string | null } | null;
  score: { physicalTotals: { massGrams: number | null; countedObjects: number | null; presentParticipants: number }; officialScore: number | null; scoreStatus: string; comparableForButtsPerParticipant: boolean; buttsPerParticipant: number | null } | null;
};

export function SpogomiResultReviewPanel({ eventId }: { eventId: string }) {
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fetchResults = useCallback(async (): Promise<ReviewResult[]> => { const response = await fetch(`/api/spogomi/events/${eventId}/results`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Résultats indisponibles."); return body.results ?? []; }, [eventId]);
  useEffect(() => { let active = true; void fetchResults().then((next) => { if (active) setResults(next); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Résultats indisponibles."); }); return () => { active = false; }; }, [fetchResults]);
  async function review(result: ReviewResult, decision: "certified" | "rejected") { setBusy(result.latestSubmission?.id ?? result.teamId); setError(null); try { const response = await fetch(`/api/spogomi/events/${eventId}/results`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId: result.teamId, submissionId: result.latestSubmission?.id, decision, reason: null }) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? "Décision refusée."); setResults(await fetchResults()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Décision refusée."); } finally { setBusy(null); } }
  return <section className="space-y-3" aria-labelledby="spogomi-results-title"><div><h2 id="spogomi-results-title" className="cmm-text-h3">Résultats et certification</h2><p className="cmm-text-small">La soumission d’une équipe ne certifie jamais son résultat. Les totaux physiques restent séparés du score sportif.</p></div>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<div className="space-y-3">{results.map((result) => <div key={result.teamId} className="rounded-xl border border-black/10 bg-white/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-slate-900">Équipe {result.teamNumber} · {result.publicName}</p><p className="text-sm text-slate-600">{result.latestSubmission ? `Version ${result.latestSubmission.version} · ${result.latestSubmission.status}` : "Aucune saisie"}</p></div>{result.latestSubmission?.status === "submitted" ? <div className="flex gap-2"><CmmButton type="button" tone="primary" disabled={busy !== null} onClick={() => void review(result, "certified")}>Certifier</CmmButton><CmmButton type="button" tone="critical" disabled={busy !== null} onClick={() => void review(result, "rejected")}>Refuser</CmmButton></div> : null}</div>{result.score ? <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-4"><p>Masse : <strong>{result.score.physicalTotals.massGrams ?? "non mesurée"} g</strong></p><p>Objets comptés : <strong>{result.score.physicalTotals.countedObjects ?? "non comptés"}</strong></p><p>Présents : <strong>{result.score.physicalTotals.presentParticipants}</strong></p><p>Score : <strong>{result.score.officialScore ?? "non officiel"}</strong></p></div> : null}</div>)}</div></section>;
}
