"use client";

import { useEffect, useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type {
  SpogomiRegistrationQuizDefinition,
  SpogomiRegistrationQuizEvaluation,
} from "@/lib/spogomi/registration-quiz";

type Props = {
  eventId: string;
  divisionId: string;
  divisionLabel: string;
  onPassed: (quizVersion: string) => void;
};

type QuizResponse = { quiz?: SpogomiRegistrationQuizDefinition; error?: string };
type EvaluationResponse = { evaluation?: SpogomiRegistrationQuizEvaluation; error?: string };

function errorMessage(body: QuizResponse | EvaluationResponse, fallback: string): string {
  return typeof body.error === "string" && body.error ? body.error : fallback;
}

export function SpogomiRegistrationQuiz({ eventId, divisionId, divisionLabel, onPassed }: Props) {
  const [quiz, setQuiz] = useState<SpogomiRegistrationQuizDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [experience, setExperience] = useState<"yes" | "no" | "prefer_not_to_say">("prefer_not_to_say");
  const [experienceDescription, setExperienceDescription] = useState("");
  const [evaluation, setEvaluation] = useState<SpogomiRegistrationQuizEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const resetTimer = window.setTimeout(() => {
      setLoading(true);
      setQuiz(null);
      setAnswers({});
      setEvaluation(null);
      setError(null);
    }, 0);
    void fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/registration-quiz?divisionId=${encodeURIComponent(divisionId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as QuizResponse;
        if (!response.ok || !body.quiz) throw new Error(errorMessage(body, "Le quiz n’a pas pu être chargé."));
        setQuiz(body.quiz);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Le quiz n’a pas pu être chargé.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      window.clearTimeout(resetTimer);
      controller.abort();
    };
  }, [divisionId, eventId]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  async function submit() {
    if (!quiz || answeredCount !== quiz.questions.length) {
      setError("Répondez à toutes les questions avant de vérifier le quiz.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/registration-quiz`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ divisionId, quizVersion: quiz.quizVersion, answers, experience, experienceDescription }),
      });
      const body = await response.json().catch(() => ({})) as EvaluationResponse;
      if (!response.ok || !body.evaluation) throw new Error(errorMessage(body, "Le quiz n’a pas pu être vérifié."));
      setEvaluation(body.evaluation);
      if (body.evaluation.passed) onPassed(body.evaluation.quizVersion);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le quiz n’a pas pu être vérifié.");
    } finally {
      setBusy(false);
    }
  }

  return <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5" aria-label={`Quiz SPOGOMI ${divisionLabel}`}>
    <div>
      <h3 className="font-black text-slate-900">Quiz obligatoire · {divisionLabel}</h3>
      <p className="mt-1 text-sm text-slate-700">Répondez correctement à toutes les questions critiques de sécurité et de règlement, puis obtenez au moins 80 % sur les autres. Vous pouvez recommencer autant de fois que nécessaire.</p>
      <p className="text-sm text-slate-700">La question facultative sur votre expérience de cleanwalk et son commentaire n’influencent pas la réussite.</p>
    </div>
    {loading ? <p role="status" className="text-sm text-slate-700">Chargement du quiz applicable…</p> : null}
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
    {!loading && quiz && !quiz.available ? <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><p className="font-bold">Le quiz ne peut pas encore être ouvert.</p><p>Les informations suivantes doivent d’abord être communiquées et vérifiées par l’organisation :</p><ul className="list-disc pl-5">{quiz.missing.map((item) => <li key={item.id}><a className="underline" href={item.href}>{item.label}</a>{item.detail ? ` — ${item.detail}` : ""}</li>)}</ul></div> : null}
    {!loading && quiz?.available ? <>
      <p className="text-xs text-slate-600">Règlement {quiz.regulationVersion}{quiz.sourceReference ? ` · Source : ${quiz.sourceReference}` : ""} · Progression {answeredCount}/{quiz.questions.length}</p>
      <div className="space-y-4">
        {quiz.questions.map((question, index) => <fieldset key={question.id} className="space-y-2 rounded-lg border border-black/10 bg-white/75 p-3">
          <legend className="px-1 text-sm font-bold text-slate-900">{index + 1}. {question.prompt}{question.critical ? " · critique" : ""}</legend>
          <div className="space-y-2">
            {question.options.map((option) => <label key={option.id} className="flex gap-2 text-sm text-slate-800"><input type="radio" name={`spogomi-quiz-${question.id}`} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} /> <span>{option.label}</span></label>)}
          </div>
          {evaluation?.errors.some((item) => item.questionId === question.id) ? <p className="rounded bg-rose-50 p-2 text-xs text-rose-800">{evaluation.errors.find((item) => item.questionId === question.id)?.explanation}</p> : null}
        </fieldset>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-800">Avez-vous déjà participé à une cleanwalk ?<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={experience} onChange={(event) => setExperience(event.target.value as typeof experience)}><option value="prefer_not_to_say">Je préfère ne pas répondre</option><option value="yes">Oui</option><option value="no">Non</option></select></label>
        <label className="text-sm font-bold text-slate-800">Décrivez cette expérience (facultatif)<textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" maxLength={2000} value={experienceDescription} onChange={(event) => setExperienceDescription(event.target.value)} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3"><CmmButton type="button" tone="primary" disabled={busy || answeredCount !== quiz.questions.length} loading={busy} onClick={() => { void submit(); }}>{evaluation?.passed ? "Quiz validé" : "Vérifier mes réponses"}</CmmButton>{evaluation && !evaluation.passed ? <span className="text-sm font-semibold text-rose-800">Score {evaluation.score} % · les erreurs sont expliquées ci-dessus.</span> : null}{evaluation?.passed ? <span role="status" className="text-sm font-semibold text-emerald-800">Quiz validé pour cette version du règlement.</span> : null}</div>
    </> : null}
  </CmmCard>;
}
