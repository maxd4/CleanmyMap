"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, Lightbulb, School } from "lucide-react";
// This interactive flow is exclusively the public school atelier format.
import { CmmCard } from "@/components/ui/cmm-card";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { getQuizUiCopy } from "@/lib/learning/quiz/quiz-i18n";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import {
  getQuizSchoolWorkshopAssessment,
  type ResolvedQuizSchoolWorkshopAssessmentItem,
} from "@/lib/learning/quiz/school/quiz-school-workshop-assessment";
import {
  composeQuizSchoolWorkshopActivities,
  QUIZ_SCHOOL_ACTIVITY_THEME_LABELS,
  QUIZ_SCHOOL_ACTIVITY_TYPE_LABELS,
} from "@/lib/learning/quiz/school/quiz-school-workshop-activities";
import { buildQuizSchoolWorkshopSummary } from "@/lib/learning/quiz/school/quiz-school-workshop-summary";
import type { QuizSchoolLevel } from "@/lib/learning/quiz/school/quiz-school-types";
import {
  createQuizSchoolWorkshopState,
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

function getChoices(question: ResolvedQuizSchoolWorkshopAssessmentItem, locale: SupportedLocale): Array<[string, string]> {
  return Object.entries(question.options).map(([id, text]) => [id, text[locale]]);
}

function isCorrect(question: ResolvedQuizSchoolWorkshopAssessmentItem, answer: string): boolean {
  return question.correctOptionId === answer;
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
  // `questions` stays in the public props for compatibility with the generic launcher;
  // atelier-60 deliberately uses its own validated concept pairs.
  void questions;
  const preAssessment = useMemo(() => getQuizSchoolWorkshopAssessment(level, "pre-quiz"), [level]);
  const postAssessment = useMemo(() => getQuizSchoolWorkshopAssessment(level, "post-quiz"), [level]);
  const activities = useMemo(() => composeQuizSchoolWorkshopActivities(level), [level]);
  const [state, setState] = useState(createQuizSchoolWorkshopState);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const assessment = state.phase === "pre-quiz" ? preAssessment : state.phase === "post-quiz" ? postAssessment : [];
  const question = state.phase === "pre-quiz" || state.phase === "post-quiz" ? assessment[state.questionIndex] : undefined;
  const selected = question ? selectedAnswers[`${state.phase}:${question.id}`] : undefined;
  const isRevealed = question ? revealed[`${state.phase}:${question.id}`] === true : false;
  const summary = useMemo(
    () => buildQuizSchoolWorkshopSummary({ level, preAssessment, postAssessment, preAnswers: state.preAnswers, postAnswers: state.postAnswers, activities }),
    [activities, level, postAssessment, preAssessment, state.postAnswers, state.preAnswers],
  );

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

  const moveNext = () => setState((current) => nextQuizSchoolWorkshopPhase(current, preAssessment.length, activities.length, postAssessment.length));
  const movePrevious = () => setState((current) => previousQuizSchoolWorkshopPhase(current, preAssessment.length, activities.length, postAssessment.length));
  const activity = state.phase === "atelier" ? activities[state.activityIndex] : undefined;
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
            <span>{phaseLabel(locale, state.phase)}</span><span>{state.questionIndex + 1} / {assessment.length}</span>
          </div>
          <h2 className="mt-6 text-2xl font-black leading-tight text-slate-950 md:text-4xl">{question.prompt[locale]}</h2>
          <p className="mt-4 text-sm font-medium text-slate-600">{getQuizUiCopy(locale, "session.school.workshop.vote")}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {getChoices(question, locale).map(([choiceId, choice]) => (
              <button key={choiceId} type="button" disabled={isRevealed} aria-pressed={selected === choiceId} onClick={() => answerQuestion(choiceId)} className={`${FOCUS_RING} min-h-14 rounded-2xl border px-5 py-4 text-left text-lg font-bold transition ${selected === choiceId ? "border-amber-600 bg-amber-100 text-amber-950" : "border-slate-200 bg-white text-slate-800 hover:border-amber-300"}`}>
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
          {isRevealed ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950"><CheckCircle className="mr-2 inline-block h-5 w-5 text-emerald-600" aria-hidden="true" />{question.explanation[locale]}</div> : null}
        </CmmCard>
      ) : null}

      {state.phase === "atelier" ? (
        <CmmCard tone="amber" variant="elevated" className="p-5 md:p-8" as="section">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">{getQuizUiCopy(locale, "session.school.workshop.activity")}</p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-3xl font-black text-slate-950">{activity?.title[locale] ?? (locale === "fr" ? "Séquence pédagogique" : "Teaching sequence")}</h2>
            <span className="text-sm font-black text-amber-800">{state.activityIndex + 1} / {activities.length} · {activity?.durationMinutes ?? 0} min</span>
          </div>
          {activity ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.12em] text-amber-800">
                <span className="rounded-full bg-amber-100 px-3 py-1">{QUIZ_SCHOOL_ACTIVITY_TYPE_LABELS[activity.type][locale]}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{QUIZ_SCHOOL_ACTIVITY_THEME_LABELS[activity.theme][locale]}</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1">{activity.difficulty}</span>
              </div>
              <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-base font-bold leading-relaxed text-slate-900">{activity.instruction[locale]}</p>
              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-700"><span className="font-black text-slate-950">{locale === "fr" ? "Adaptation" : "Adaptation"} :</span> {activity.adaptation[locale]}</p>
              {activity.dataPoints ? (
                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[18rem] text-left text-sm">
                    <caption className="sr-only">{locale === "fr" ? "Données d’exemple de l’activité" : "Example data for the activity"}</caption>
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-600"><tr><th scope="col" className="px-4 py-3">{locale === "fr" ? "Repère" : "Label"}</th><th scope="col" className="px-4 py-3">{locale === "fr" ? "Valeur" : "Value"}</th></tr></thead>
                    <tbody>{activity.dataPoints.map((point) => <tr key={point.label.en} className="border-t border-slate-100"><th scope="row" className="px-4 py-3 font-bold text-slate-800">{point.label[locale]}</th><td className="px-4 py-3 text-slate-700">{point.value}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : null}
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-950"><span className="font-black">{locale === "fr" ? "Réponse / explication" : "Answer / explanation"} :</span> {activity.responseExplanation[locale]}</div>
              <p className="mt-4 text-sm font-medium text-slate-600">{locale === "fr" ? "Compétences mobilisées" : "Skills used"} : {activity.competencies.join(" · ")}</p>
              <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <summary className={`${FOCUS_RING} cursor-pointer font-bold text-slate-900`}>{locale === "fr" ? "Source et validation" : "Source and validation"}</summary>
                <p className="mt-3">{activity.source.label[locale]} · <a className="font-bold text-amber-800 underline" href={activity.source.href}>{activity.source.href}</a></p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{activity.validationStatus}</p>
              </details>
            </>
          ) : null}
          <button type="button" onClick={moveNext} className={`${FOCUS_RING} mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-amber-700`}>
            {activity && state.activityIndex < activities.length - 1 ? (locale === "fr" ? "Activité suivante" : "Next activity") : getQuizUiCopy(locale, "session.school.workshop.startPost")}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </CmmCard>
      ) : null}

      {state.phase === "bilan" ? (
        <CmmCard tone="amber" variant="elevated" className="p-5 md:p-8" as="section">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">{getQuizUiCopy(locale, "session.school.workshop.summary")}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">{locale === "fr" ? "Ce que la classe a fait progresser" : "What the group improved"}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">{locale === "fr" ? "Ces résultats sont collectifs et restent dans ce navigateur : ils ne constituent ni un classement ni un profil d’élève." : "These results are collective and stay in this browser: they are neither a ranking nor a student profile."}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">{locale === "fr" ? "Taux avant — concepts" : "Before rate — concepts"}</p><p className="mt-2 text-3xl font-black text-slate-950">{summary.preConceptCorrect}/{summary.preConceptTotal} · {Math.round(summary.preConceptRate * 100)} %</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase text-emerald-700">{locale === "fr" ? "Taux après — mêmes concepts" : "After rate — same concepts"}</p><p className="mt-2 text-3xl font-black text-emerald-950">{summary.postConceptCorrect}/{summary.postConceptTotal} · {Math.round(summary.postConceptRate * 100)} %</p></div>
            <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-black uppercase text-amber-700">{locale === "fr" ? "Progression conceptuelle" : "Concept progress"}</p><p className="mt-2 text-3xl font-black text-amber-950">{summary.conceptProgress > 0 ? "+" : ""}{Math.round(summary.conceptProgress * 100)} points</p></div>
            <div className="rounded-2xl bg-sky-50 p-4"><p className="text-xs font-black uppercase text-sky-700">{locale === "fr" ? "Transfert — séparé" : "Transfer — separate"}</p><p className="mt-2 text-3xl font-black text-sky-950">{summary.transferCorrect}/{summary.transferTotal} · {Math.round(summary.transferRate * 100)} %</p></div>
          </div>
          <p className="mt-3 text-sm text-slate-600">{locale === "fr" ? "Les deux situations de transfert ne modifient pas la progression conceptuelle." : "The two transfer situations do not change concept progress."}</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="workshop-takeaways">
              <h3 id="workshop-takeaways" className="text-xl font-black text-slate-950">{locale === "fr" ? "Notions retenues — jusqu’à 3" : "Retained notions — up to 3"}</h3>
              {summary.retainedNotions.length > 0 ? <ul className="mt-3 space-y-2 text-sm font-medium text-slate-700">{summary.retainedNotions.map((notion) => <li key={notion.fr} className="flex gap-2"><CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /><span>{notion[locale]}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-700">{locale === "fr" ? "Aucune notion retenue n’est démontrée par les réponses collectives." : "No retained notion is demonstrated by the collective answers."}</p>}
            </section>
            <section aria-labelledby="workshop-fragile">
              <h3 id="workshop-fragile" className="text-xl font-black text-slate-950">{locale === "fr" ? "Notions encore fragiles" : "Ideas to revisit"}</h3>
              {summary.fragileNotions.length > 0 ? <ul className="mt-3 space-y-2 text-sm font-medium text-slate-700">{summary.fragileNotions.map((notion) => <li key={notion.fr} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">{notion[locale]}</li>)}</ul> : <p className="mt-3 text-sm text-slate-700">{locale === "fr" ? "Aucune notion signalée dans le post-quiz." : "No idea flagged in the post-quiz."}</p>}
            </section>
          </div>
          <section aria-labelledby="workshop-actions" className="mt-8">
            <h3 id="workshop-actions" className="text-xl font-black text-slate-950">{locale === "fr" ? "Trois actions possibles dans le collège" : "Three possible school actions"}</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm font-medium text-slate-700">{summary.collegeActions.map((action) => <li key={action.fr} className="pl-1">{action[locale]}</li>)}</ol>
          </section>
          <section aria-labelledby="workshop-territory" className="mt-8">
            <h3 id="workshop-territory" className="text-xl font-black text-slate-950">{locale === "fr" ? "Lieux franciliens pour poursuivre" : "Places in Île-de-France to continue"}</h3>
            {summary.territorialResources.length > 0 ? <ul className="mt-3 grid gap-3 md:grid-cols-3">{summary.territorialResources.map((resource) => <li key={resource.id} className="rounded-2xl border border-slate-200 bg-white p-4"><a className={`${FOCUS_RING} font-black text-amber-900 underline`} href={resource.officialUrl} target="_blank" rel="noreferrer">{resource.name[locale]}</a><p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{resource.territory[locale]}</p><p className="mt-2 text-sm text-slate-700">{resource.description[locale]}</p><p className="mt-2 text-xs text-slate-600">{resource.audience[locale]}</p></li>)}</ul> : <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{locale === "fr" ? "Aucune ressource locale validée n’est disponible pour le moment. Le professeur peut conserver les trois actions ci-dessus et rechercher une ressource officielle adaptée." : "No validated local resource is available at the moment. The teacher can keep the three actions above and look for a suitable official resource."}</p>}
          </section>
          <ul className="mt-6 space-y-3 text-sm font-medium text-slate-700">{activities.map((item) => <li key={item.id} className="flex gap-2"><CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /><span>{item.title[locale]} · {item.durationMinutes} min</span></li>)}</ul>
          <div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={restart} className={`${FOCUS_RING} inline-flex min-h-12 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-amber-700`}>{getQuizUiCopy(locale, "session.school.workshop.restart")}</button><button type="button" onClick={onChooseFormat} className={`${FOCUS_RING} inline-flex min-h-12 rounded-2xl border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 hover:bg-amber-50`}>{getQuizUiCopy(locale, "session.school.workshop.chooseFormat")}</button></div>
        </CmmCard>
      ) : null}

      {state.phase !== "pre-quiz" || state.questionIndex > 0 ? <button type="button" onClick={movePrevious} className={`${FOCUS_RING} inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700`}><ArrowLeft size={16} aria-hidden="true" />{getQuizUiCopy(locale, "session.school.workshop.back")}</button> : null}
    </div>
  );
}
