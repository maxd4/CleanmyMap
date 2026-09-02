"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, Lightbulb, School } from "lucide-react";
// This interactive flow is exclusively the public school atelier format.
import { CmmCard } from "@/components/ui/cmm-card";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { getQuizLocalizedTextFallback, getQuizUiCopy } from "@/lib/learning/quiz/quiz-i18n";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import { getQuizSchoolTrackLabel, QUIZ_SCHOOL_TRACKS } from "./quiz-school-modes";
import type { QuizSchoolLevel } from "@/lib/learning/quiz/school/quiz-school-types";
import {
  createQuizSchoolWorkshopState,
  getQuizSchoolWorkshopProgress,
  nextQuizSchoolWorkshopPhase,
  previousQuizSchoolWorkshopPhase,
  recordQuizSchoolWorkshopAnswer,
  type QuizSchoolWorkshopPhase,
} from "@/lib/learning/quiz/school/quiz-school-workshop-state";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2";

type Props = {
  locale: SupportedLocale;
  level: QuizSchoolLevel;
  questions: readonly QuizQuestion[];
  onRestart: () => void;
  onChooseFormat: () => void;
};

const WORKSHOP_STEPS = [
  { fr: "Observer", en: "Observe", detail: { fr: "Afficher une situation et laisser la classe formuler ses premières idées.", en: "Show a situation and let the class form its first ideas." } },
  { fr: "Argumenter", en: "Argue", detail: { fr: "Faire voter, demander une justification et comparer les raisonnements.", en: "Vote, ask for a reason and compare the reasoning." } },
  { fr: "Relier", en: "Connect", detail: { fr: "Relier les réponses aux quatre tracks internes, puis faire émerger une règle utile.", en: "Connect answers to the four internal tracks, then surface a useful rule." } },
] as const;

function getChoices(question: QuizQuestion): string[] {
  if (question.options?.length) return question.options;
  if (question.type === "true-false") return ["Vrai", "Faux"];
  return [Array.isArray(question.answer) ? question.answer.join(", ") : question.answer];
}

function isCorrect(question: QuizQuestion, answer: string): boolean {
  return Array.isArray(question.answer)
    ? question.answer.length === 1 && question.answer[0] === answer
    : question.answer === answer;
}

function phaseLabel(locale: SupportedLocale, phase: QuizSchoolWorkshopPhase) {
  return phase === "pre-quiz"
    ? getQuizUiCopy(locale, "session.school.workshop.preQuiz")
    : phase === "atelier"
      ? getQuizUiCopy(locale, "session.school.workshop.activity")
      : phase === "post-quiz"
        ? getQuizUiCopy(locale, "session.school.workshop.postQuiz")
        : getQuizUiCopy(locale, "session.school.workshop.summary");
}

export function QuizSchoolWorkshopSession({ locale, level, questions, onRestart, onChooseFormat }: Props) {
  const deck = useMemo(() => questions.slice(0, 5), [questions]);
  const [state, setState] = useState(createQuizSchoolWorkshopState);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const question = state.phase === "pre-quiz" || state.phase === "post-quiz" ? deck[state.questionIndex] : undefined;
  const selected = question ? selectedAnswers[`${state.phase}:${question.id}`] : undefined;
  const isRevealed = question ? revealed[`${state.phase}:${question.id}`] === true : false;
  const progress = getQuizSchoolWorkshopProgress(state);

  const answerQuestion = (answer: string) => {
    if (!question || isRevealed) return;
    setSelectedAnswers((current) => ({ ...current, [`${state.phase}:${question.id}`]: answer }));
  };

  const reveal = () => {
    if (!question || !selected || isRevealed) return;
    const phase = state.phase === "pre-quiz" ? "pre-quiz" : "post-quiz";
    setState((current) => recordQuizSchoolWorkshopAnswer(current, phase, question.id, isCorrect(question, selected)));
    setRevealed((current) => ({ ...current, [`${state.phase}:${question.id}`]: true }));
  };

  const moveNext = () => setState((current) => nextQuizSchoolWorkshopPhase(current, deck.length));
  const movePrevious = () => setState((current) => previousQuizSchoolWorkshopPhase(current, deck.length));
  const restart = () => {
    setState(createQuizSchoolWorkshopState());
    setSelectedAnswers({});
    setRevealed({});
    onRestart();
  };

  return (
    <div className="space-y-6" data-testid="quiz-school-workshop-session">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-black text-amber-950"><School size={18} aria-hidden="true" />{getQuizUiCopy(locale, "school.format.atelier-60.label")} · {level}</div>
        <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">{phaseLabel(locale, state.phase)}</div>
      </div>

      {question ? (
        <CmmCard tone="amber" variant="elevated" className="p-5 md:p-8" as="section">
          <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <span>{phaseLabel(locale, state.phase)}</span><span>{state.questionIndex + 1} / {deck.length}</span>
          </div>
          <h2 className="mt-6 text-2xl font-black leading-tight text-slate-950 md:text-4xl">{getQuizLocalizedTextFallback(locale, question.localized?.question, question.question)}</h2>
          <p className="mt-4 text-sm font-medium text-slate-600">{getQuizUiCopy(locale, "session.school.workshop.vote")}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {getChoices(question).map((choice) => (
              <button key={choice} type="button" disabled={isRevealed} aria-pressed={selected === choice} onClick={() => answerQuestion(choice)} className={`${FOCUS_RING} min-h-14 rounded-2xl border px-5 py-4 text-left text-lg font-bold transition ${selected === choice ? "border-amber-600 bg-amber-100 text-amber-950" : "border-slate-200 bg-white text-slate-800 hover:border-amber-300"}`}>
                {choice}
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={!selected || isRevealed} onClick={reveal} className={`${FOCUS_RING} inline-flex min-h-12 items-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-amber-700`}>
              <Lightbulb size={17} aria-hidden="true" />{getQuizUiCopy(locale, "session.school.workshop.reveal")}
            </button>
            {isRevealed ? <button type="button" onClick={moveNext} className={`${FOCUS_RING} inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-emerald-700`}>{getQuizUiCopy(locale, "session.school.workshop.next")}<ArrowRight size={17} aria-hidden="true" /></button> : null}
          </div>
          {isRevealed ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950"><CheckCircle className="mr-2 inline-block h-5 w-5 text-emerald-600" aria-hidden="true" />{getQuizLocalizedTextFallback(locale, question.localized?.explanation, question.explanation)}</div> : null}
        </CmmCard>
      ) : null}

      {state.phase === "atelier" ? (
        <CmmCard tone="amber" variant="elevated" className="p-5 md:p-8" as="section">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">{getQuizUiCopy(locale, "session.school.workshop.activity")}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">{locale === "fr" ? "Une séquence pédagogique de 30 minutes" : "A 30-minute teaching sequence"}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">{WORKSHOP_STEPS.map((step, index) => <article key={step.en} className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><span className="text-xs font-black text-amber-700">0{index + 1}</span><h3 className="mt-2 text-lg font-black text-slate-950">{step[locale]}</h3><p className="mt-2 text-sm leading-relaxed text-slate-700">{step.detail[locale]}</p></article>)}</div>
          <p className="mt-6 text-sm leading-relaxed text-slate-700">{QUIZ_SCHOOL_TRACKS.map((track) => getQuizSchoolTrackLabel(track.id, locale)).join(" · ")}</p>
          <button type="button" onClick={moveNext} className={`${FOCUS_RING} mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-amber-700`}>{getQuizUiCopy(locale, "session.school.workshop.startPost")}<ArrowRight size={17} aria-hidden="true" /></button>
        </CmmCard>
      ) : null}

      {state.phase === "bilan" ? (
        <CmmCard tone="amber" variant="elevated" className="p-5 md:p-8" as="section">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">{getQuizUiCopy(locale, "session.school.workshop.summary")}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">{locale === "fr" ? "Ce que la classe a fait progresser" : "What the group improved"}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">{getQuizUiCopy(locale, "session.school.workshop.preQuiz")}</p><p className="mt-2 text-3xl font-black text-slate-950">{progress.preCorrect}/{progress.total}</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase text-emerald-700">{getQuizUiCopy(locale, "session.school.workshop.postQuiz")}</p><p className="mt-2 text-3xl font-black text-emerald-950">{progress.postCorrect}/{progress.total}</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-black uppercase text-amber-700">{locale === "fr" ? "Progression collective" : "Collective progress"}</p><p className="mt-2 text-3xl font-black text-amber-950">{progress.postCorrect - progress.preCorrect > 0 ? "+" : ""}{progress.postCorrect - progress.preCorrect}</p></div></div>
          <ul className="mt-6 space-y-3 text-sm font-medium text-slate-700">{WORKSHOP_STEPS.map((step) => <li key={step.en} className="flex gap-2"><CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /><span>{step.detail[locale]}</span></li>)}</ul>
          <div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={restart} className={`${FOCUS_RING} inline-flex min-h-12 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-amber-700`}>{getQuizUiCopy(locale, "session.school.workshop.restart")}</button><button type="button" onClick={onChooseFormat} className={`${FOCUS_RING} inline-flex min-h-12 rounded-2xl border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 hover:bg-amber-50`}>{getQuizUiCopy(locale, "session.school.workshop.chooseFormat")}</button></div>
        </CmmCard>
      ) : null}

      {state.phase !== "pre-quiz" || state.questionIndex > 0 ? <button type="button" onClick={movePrevious} className={`${FOCUS_RING} inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700`}><ArrowLeft size={16} aria-hidden="true" />{getQuizUiCopy(locale, "session.school.workshop.back")}</button> : null}
    </div>
  );
}
