"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gavel, LockKeyhole } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { SpogomiEventDivisionType } from "@/lib/spogomi/navigation-intent";
import type { SpogomiRefereeApplication, SpogomiRefereeQuizDefinition, SpogomiRefereeQuizEvaluation } from "@/lib/spogomi/referee-qualification-service";

type Division = { id: string; type: SpogomiEventDivisionType };
type Props = { eventId: string; isAuthenticated: boolean; divisions: readonly Division[]; initialDivisionId?: string; signInHref: string };
type ApplicationResponse = { application?: SpogomiRefereeApplication | null; error?: string };
type QuizResponse = { quiz?: SpogomiRefereeQuizDefinition; error?: string };
type EvaluationResponse = { evaluation?: SpogomiRefereeQuizEvaluation; error?: string };

const statusLabel: Record<SpogomiRefereeApplication["status"], string> = {
  candidate: "Candidature reçue · quiz à passer",
  theory_qualified: "Qualification théorique réussie",
  practical_pending: "Validation pratique à confirmer",
  habilitated: "Arbitre habilité pour cette édition",
  refused: "Candidature refusée",
  revoked: "Habilitation révoquée",
};

function message(body: { error?: string }, fallback: string) { return typeof body.error === "string" && body.error ? body.error : fallback; }

export function SpogomiRefereeApplicationCard({ eventId, isAuthenticated, divisions, initialDivisionId, signInHref }: Props) {
  const [divisionId, setDivisionId] = useState(initialDivisionId ?? divisions[0]?.id ?? "");
  const [application, setApplication] = useState<SpogomiRefereeApplication | null>(null);
  const [quiz, setQuiz] = useState<SpogomiRefereeQuizDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluation, setEvaluation] = useState<SpogomiRefereeQuizEvaluation | null>(null);
  const [loading, setLoading] = useState(isAuthenticated);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApplication = useCallback(async (nextDivisionId = divisionId) => {
    if (!isAuthenticated || !nextDivisionId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/referee-application?divisionId=${encodeURIComponent(nextDivisionId)}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as ApplicationResponse;
      if (!response.ok) throw new Error(message(body, "La candidature arbitre n’a pas pu être chargée."));
      setApplication(body.application ?? null);
      setQuiz(null);
      setAnswers({});
      setEvaluation(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La candidature arbitre n’a pas pu être chargée.");
    } finally {
      setLoading(false);
    }
  }, [divisionId, eventId, isAuthenticated]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadApplication(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadApplication]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  async function apply() {
    if (!divisionId) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/referee-application`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ divisionId }) });
      const body = await response.json().catch(() => ({})) as ApplicationResponse;
      if (!response.ok || !body.application) throw new Error(message(body, "La candidature arbitre n’a pas pu être créée."));
      setApplication(body.application);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La candidature arbitre n’a pas pu être créée.");
    } finally { setBusy(false); }
  }

  async function openQuiz() {
    if (!application) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/referee-quiz?divisionId=${encodeURIComponent(divisionId)}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as QuizResponse;
      if (!response.ok || !body.quiz) throw new Error(message(body, "Le quiz arbitre n’a pas pu être chargé."));
      setQuiz(body.quiz); setAnswers({}); setEvaluation(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le quiz arbitre n’a pas pu être chargé.");
    } finally { setBusy(false); }
  }

  async function submitQuiz() {
    if (!quiz || answeredCount !== quiz.questions.length) { setError("Répondez à toutes les questions avant de vérifier la qualification."); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/referee-quiz`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ divisionId, quizVersion: quiz.quizVersion, answers }) });
      const body = await response.json().catch(() => ({})) as EvaluationResponse;
      if (!response.ok || !body.evaluation) throw new Error(message(body, "Le quiz arbitre n’a pas pu être vérifié."));
      setEvaluation(body.evaluation);
      if (body.evaluation.passed) { setQuiz(null); await loadApplication(); }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le quiz arbitre n’a pas pu être vérifié.");
    } finally { setBusy(false); }
  }

  return <CmmCard tone="emerald" variant="glass" className="space-y-4 border-2 border-emerald-200 p-5" aria-labelledby="spogomi-referee-application-title">
    <div className="flex items-start gap-3"><Gavel className="mt-1 shrink-0 text-emerald-700" aria-hidden="true" /><div><p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-emerald-700">Parcours indépendant</p><h2 id="spogomi-referee-application-title" className="text-xl font-black text-emerald-950">Devenir arbitre</h2><p className="cmm-text-body mt-1 text-slate-900">La candidature, le quiz et la validation pratique ne créent ni équipe, ni inscription sportive, ni habilitation automatique.</p></div></div>
    {divisions.length > 1 ? <label className="block text-sm font-bold text-slate-800">Division<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={divisionId} onChange={(event) => { setDivisionId(event.target.value); }}>{divisions.map((division) => <option key={division.id} value={division.id}>{division.type === "world_cup" ? "World Cup" : "Casual"}</option>)}</select></label> : null}
    {!isAuthenticated ? <CmmButton href={signInHref} tone="secondary" size="sm" variant="pill"><LockKeyhole size={15} aria-hidden="true" /> Se connecter pour candidater</CmmButton> : null}
    {isAuthenticated && loading ? <p role="status" className="text-sm text-slate-700">Chargement de votre candidature…</p> : null}
    {isAuthenticated && !loading && !application ? <><p className="text-sm text-slate-700">Commencez une candidature propre à cette édition. L’organisateur devra ensuite confirmer la pratique et décider explicitement de l’habilitation.</p><CmmButton type="button" tone="primary" size="sm" variant="pill" disabled={busy || !divisionId} loading={busy} onClick={() => { void apply(); }}>Candidater comme arbitre</CmmButton></> : null}
    {application ? <div className="space-y-3" aria-live="polite"><p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-black text-emerald-950">{statusLabel[application.status]}</p><p className="text-sm text-slate-700">La version théorique et le règlement sont liés à cette division. Une preuve obsolète ne permet pas une nouvelle habilitation.</p>{application.status === "candidate" ? <CmmButton type="button" tone="primary" size="sm" variant="pill" disabled={busy} loading={busy} onClick={() => { void openQuiz(); }}>Passer le quiz arbitre avancé</CmmButton> : null}{application.status === "theory_qualified" ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">Quiz validé. Une confirmation pratique et une décision explicite de l’organisateur sont encore nécessaires.</p> : null}{application.status === "practical_pending" ? <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm font-bold text-sky-950">Validation pratique reçue. L’habilitation reste soumise à la décision de l’organisateur.</p> : null}{application.status === "habilitated" ? <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-950">Habilitation événementielle active ; les capacités restent limitées aux droits attribués pour cette édition.</p> : null}</div> : null}
    {quiz?.available ? <div className="space-y-4 border-t border-emerald-200 pt-4"><div><h3 className="font-black text-slate-950">Quiz arbitre avancé</h3><p className="mt-1 text-sm text-slate-700">20 questions · 100 % des questions critiques et au moins 90 % des autres. Jusqu’à 10 tentatives par heure ; chaque erreur reçoit une correction pédagogique.</p></div><p className="text-xs text-slate-600">Règlement {quiz.regulationVersion}{quiz.sourceReference ? ` · Source : ${quiz.sourceReference}` : ""} · Progression {answeredCount}/{quiz.questions.length}</p>{quiz.questions.map((question, index) => <fieldset key={question.id} className="space-y-2 rounded-lg border border-black/10 bg-white/80 p-3"><legend className="px-1 text-sm font-bold text-slate-950">{index + 1}. {question.prompt}{question.critical ? " · critique" : ""}</legend>{question.options.map((option) => <label key={option.id} className="flex gap-2 text-sm text-slate-800"><input type="radio" name={`spogomi-referee-quiz-${question.id}`} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} /> <span>{option.label}</span></label>)}{evaluation?.errors.some((item) => item.questionId === question.id) ? <p className="rounded bg-rose-50 p-2 text-xs text-rose-800">{evaluation.errors.find((item) => item.questionId === question.id)?.explanation}</p> : null}</fieldset>)}<div className="flex flex-wrap items-center gap-3"><CmmButton type="button" tone="primary" disabled={busy || answeredCount !== quiz.questions.length} loading={busy} onClick={() => { void submitQuiz(); }}>Vérifier ma qualification</CmmButton>{evaluation && !evaluation.passed ? <span className="text-sm font-semibold text-rose-800">Score {evaluation.score} % · corrigez vos erreurs puis recommencez.</span> : null}</div></div> : null}
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
  </CmmCard>;
}
