"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Compass,
  GraduationCap,
  School,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { QuizSchoolLevelLauncher } from "@/components/learn/quiz/quiz-school-level-launcher";
import {
  QUIZ_SCHOOL_TRACKS,
  getQuizSchoolTrackLabel,
} from "@/components/learn/quiz/quiz-school-modes";
import {
  QUIZ_SCHOOL_KIT_BANK,
  QUIZ_SCHOOL_KIT_STEPS,
  QUIZ_SCHOOL_STUDENT_SHEET,
  QUIZ_SCHOOL_TEACHER_GUIDE,
  groupQuizSchoolKitQuestionsByTrack,
} from "@/lib/learning/quiz/quiz-school-kit";

const bankByTrack = groupQuizSchoolKitQuestionsByTrack(QUIZ_SCHOOL_KIT_BANK);

const INTRO_CARDS = [
  {
    icon: School,
    title: { fr: "Public visé", en: "Target audience" },
    text: { fr: "Élèves de 6e, 5e, 4e et 3e.", en: "Students from grades 6 to 9." },
  },
  {
    icon: GraduationCap,
    title: { fr: "Durée conseillée", en: "Recommended duration" },
    text: { fr: "Quiz 30 min ou atelier 60 min.", en: "30-minute quiz or 60-minute workshop." },
  },
  {
    icon: Users,
    title: { fr: "Sans compte", en: "No account" },
    text: { fr: "Aucun compte, nom d’élève ou donnée personnelle.", en: "No account, student name or personal data." },
  },
  {
    icon: Compass,
    title: { fr: "Classe entière", en: "Whole class" },
    text: { fr: "Lecture au vidéoprojecteur et vote collectif.", en: "Projector reading and collective voting." },
  },
] as const;

const BANK_SUMMARY = [
  { value: "20", label: { fr: "questions test", en: "test questions" } },
  { value: "4", label: { fr: "sous-modes", en: "sub-modes" } },
  { value: "5", label: { fr: "questions par sous-mode", en: "questions per sub-mode" } },
  { value: "1", label: { fr: "atelier prêt à lancer", en: "ready-to-run workshop" } },
] as const;

function QuestionStatusBadge({
  kind,
  label,
  href,
  note,
}: {
  kind?: "source" | "needsReview";
  label?: string;
  href?: string;
  note?: string;
}) {
  if (!kind) return null;

  if (kind === "source" && label && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-800 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
      >
        {label}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </a>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">
      À vérifier
      {note ? <span className="ml-2 hidden font-medium normal-case tracking-normal text-amber-700 md:inline">{note}</span> : null}
    </span>
  );
}

export function QuizSchoolKitPage() {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";

  return (
    <LearnRubricShell
      title={{ fr: "Mode École", en: "School mode" }}
      subtitle={{
        fr: "Séance publique de la 6e à la 3e",
        en: "Public session for grades 6 to 9",
      }}
      description={{
        fr: "Une page pour préparer une séance collective, faire voter la classe et garder un cadre simple, lisible et sérieux.",
        en: "A page to prepare a collective session, get the class voting and keep the frame simple, readable and serious.",
      }}
      backHref="/learn/ressources"
      backLabel={{ fr: "Retour aux ressources", en: "Back to resources" }}
      accent="yellow"
      highlights={[
        { fr: "Vidéoprojecteur", en: "Projector" },
        { fr: "Débat", en: "Debate" },
        { fr: "Sans compte élève", en: "No student account" },
      ]}
      cta={{
        href: "#choisir-niveau",
        label: { fr: "Choisir le niveau", en: "Choose the grade" },
      }}
    >
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-amber-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                {isFrench ? "Lancement immédiat" : "Immediate launch"}
              </p>
              <h3 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                {isFrench ? "Choisir le niveau, puis le format" : "Choose the grade, then the format"}
              </h3>
              <p className="text-sm leading-relaxed text-slate-700 md:text-base">
                {isFrench
                  ? "Choisissez un quiz de 30 minutes ou un atelier de 60 minutes. La démo reste disponible pour tester le déroulé."
                  : "Choose a 30-minute quiz or a 60-minute workshop. The demo stays available for a quick rehearsal."}
              </p>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">
                {isFrench ? "Formats : quiz 30 min · atelier 60 min" : "Formats: 30-minute quiz · 60-minute workshop"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="#choisir-niveau"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
              >
                {isFrench ? "Choisir le niveau" : "Choose the grade"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/learn/sentrainer?mode=demo"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
              >
                {isFrench ? "Lancer la démo" : "Launch the demo"}
              </Link>
            </div>
          </div>
        </section>

        <QuizSchoolLevelLauncher locale={locale} />

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {isFrench ? "Repères de séance" : "Session cues"}
              </p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                {isFrench ? "Les aides à garder visibles" : "Keep the aids visible"}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
                {isFrench
                  ? "Les fiches restent juste après le lancement pour préparer la classe sans chercher longtemps."
                  : "The sheets sit just after the launch block so you can prepare the class without searching."}
              </p>
            </div>
            <BookOpen className="h-10 w-10 text-amber-600" aria-hidden="true" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <article
              id="fiche-enseignant"
              className="scroll-mt-24 rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm md:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {isFrench ? "Fiche enseignant" : "Teacher sheet"}
                  </p>
                  <h4 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl">
                    {isFrench ? "Les repères à garder sous la main" : "Keep these cues close at hand"}
                  </h4>
                </div>
                <ShieldAlert className="h-10 w-10 text-amber-600" aria-hidden="true" />
              </div>

              <ul className="mt-4 space-y-3">
                {QUIZ_SCHOOL_TEACHER_GUIDE.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-relaxed text-slate-700">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article
              id="fiche-eleve"
              className="scroll-mt-24 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {isFrench ? "Fiche élève" : "Student sheet"}
                  </p>
                  <h4 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl">
                    {isFrench ? "Une trace simple et utile" : "A simple and useful reflection sheet"}
                  </h4>
                </div>
                <BookOpen className="h-10 w-10 text-amber-600" aria-hidden="true" />
              </div>

              <div className="mt-4 grid gap-3">
                {QUIZ_SCHOOL_STUDENT_SHEET.map((item, index) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {index === 0
                          ? "Ce que j'ai compris et ce que je retiens."
                          : index === 1
                            ? "Une idée reçue à ne plus répéter."
                            : index === 2
                              ? "Un geste concret à changer dès maintenant."
                              : "Une question encore ouverte à garder pour la suite."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {INTRO_CARDS.map((card, index) => {
            const Icon = card.icon;

            return (
              <article key={card.title.fr} className="rounded-[1.8rem] border border-amber-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-black tracking-tight text-slate-900">{card.title[locale]}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.text[locale]}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-[2rem] border border-amber-200 bg-amber-50/70 p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                {isFrench ? "Déroulé de l'atelier" : "Workshop flow"}
              </p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                {isFrench ? "Deux formats, un lancement collectif" : "Two formats, one collective launch"}
              </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {isFrench
                  ? "Le quiz-30 reste direct ; l'atelier-60 ajoute une séquence pédagogique entre le pré-quiz et le post-quiz."
                  : "The quiz-30 stays direct; atelier-60 adds a teaching sequence between the pre-quiz and post-quiz."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-800">
              {BANK_SUMMARY.slice(0, 2).map((item) => (
                <span key={item.label.fr} className="rounded-full border border-amber-200 bg-white px-3 py-2 text-center shadow-sm">
                  {item.value} {item.label[locale]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {QUIZ_SCHOOL_KIT_STEPS.map((step, index) => (
              <article key={step.title} className="rounded-[1.6rem] border border-amber-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-sm font-black text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                    {index === 0
                      ? "Intro"
                      : index === 1
                        ? "Quiz"
                        : index === 2
                          ? "Discussion"
                          : "Conclusion"}
                  </span>
                </div>
                <h4 className="mt-4 text-lg font-black tracking-tight text-slate-900">{step.title}</h4>
                <p className="mt-2 text-sm font-bold text-slate-700">{step.lead}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                {isFrench ? "Passage au quiz" : "Move to the quiz"}
              </p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                {isFrench ? "Le kit reste lisible, le quiz reste simple" : "The kit stays readable, the quiz stays simple"}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                {isFrench
                  ? "Quand la classe est prête, on passe sur le mode École depuis le quiz et on garde ce document comme support d'animation."
                  : "When the class is ready, switch to school mode from the quiz and keep this document as the animation support."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#choisir-niveau"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 md:px-6 md:py-3.5 md:text-base"
              >
                {isFrench ? "Choisir le niveau" : "Choose the grade"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/learn/sentrainer?mode=demo"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 md:px-6 md:py-3.5 md:text-base"
              >
                {isFrench ? "Lancer la démo" : "Launch the demo"}
              </Link>
              <Link
                href="/learn/ressources"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 md:px-6 md:py-3.5 md:text-base"
              >
                {isFrench ? "Retour aux ressources" : "Back to resources"}
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {isFrench ? "Banque en réserve" : "Bank in reserve"}
              </p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                {isFrench ? "Sous-modes disponibles si besoin" : "Sub-modes available if needed"}
              </h3>
                <p className="mt-2 text-sm font-bold text-slate-800 md:text-base">
                {isFrench ? "20 questions, 5 par sous-mode" : "20 questions, 5 per sub-mode"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 md:text-base">
                {isFrench
                  ? "La banque reste derrière le déroulé principal. Elle sert à ajuster un sous-mode, prolonger le débat ou préparer une séance sans prendre la place du lancement."
                  : "The bank sits behind the main flow. It helps adjust a sub-mode, extend the debate or prepare a session without taking over the launch."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {BANK_SUMMARY.map((item) => (
                <div key={item.label.fr} className="rounded-[1.3rem] border border-amber-200 bg-amber-50 px-4 py-3 text-center shadow-sm">
                  <p className="text-2xl font-black tracking-tight text-amber-900">{item.value}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {item.label[locale]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {QUIZ_SCHOOL_TRACKS.map((track) => {
              const questions = bankByTrack[track.id];

              return (
                <article
                  key={track.id}
                  className="rounded-[1.6rem] border border-amber-100 bg-amber-50/60 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-inner", track.tone)}>
                      {track.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                        {getQuizSchoolTrackLabel(track.id, locale)}
                      </p>
                      <h4 className="mt-1 text-base font-black tracking-tight text-slate-900">
                        {getQuizSchoolTrackLabel(track.id, locale)}
                      </h4>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-base">
                        {track.description[locale]}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-3 py-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      {isFrench ? "Temps collectif" : "Collective step"}
                    </span>
                    <span className="text-sm font-black text-amber-900">{questions.length} questions</span>
                  </div>
                </article>
              );
            })}
          </div>

          <details className="group overflow-hidden rounded-[1.8rem] border border-amber-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition hover:bg-amber-50/60 focus-visible:bg-amber-50/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {isFrench ? "Détails de la banque" : "Bank details"}
                </p>
                <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  {isFrench ? "Ouvrir les 20 questions détaillées" : "Open the 20 detailed questions"}
                </h4>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">
                {isFrench ? "Support" : "Support"}
              </span>
            </summary>

            <div className="border-t border-amber-100 p-5 md:p-6">
              <div className="space-y-4">
                {QUIZ_SCHOOL_TRACKS.map((track) => {
                  const questions = bankByTrack[track.id];

                  return (
                    <details
                      key={track.id}
                      className="group overflow-hidden rounded-[2rem] border border-amber-200 bg-white shadow-sm"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition hover:bg-amber-50/60 focus-visible:bg-amber-50/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:px-6">
                        <div className="flex items-center gap-3">
                          <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner", track.tone)}>
                            {track.icon}
                          </span>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                              {getQuizSchoolTrackLabel(track.id, locale)}
                            </p>
                            <h5 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                              {getQuizSchoolTrackLabel(track.id, locale)}
                            </h5>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                              {track.description[locale]}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">
                          {questions.length} questions
                        </span>
                      </summary>

                      <div className="border-t border-amber-100 p-5 md:p-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                          {questions.map((question, index) => (
                            <article key={question.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                    {String(index + 1).padStart(2, "0")} · {question.typeLabel}
                                  </p>
                                  <h6 className="mt-1 text-base font-black leading-snug text-slate-900">
                                    {question.question}
                                  </h6>
                                </div>
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-black text-amber-900 shadow-sm">
                                  {index + 1}
                                </span>
                              </div>

                              <div className="mt-4 space-y-3">
                                <div className="rounded-2xl border border-white bg-white p-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                                    {isFrench ? "Réponse attendue" : "Expected answer"}
                                  </p>
                                  <p className="mt-1 text-sm font-bold text-slate-900 md:text-base">{question.answer}</p>
                                </div>
                                <div className="rounded-2xl border border-white bg-white p-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                    {isFrench ? "Explication courte" : "Short explanation"}
                                  </p>
                                  <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-base">{question.explanation}</p>
                                </div>
                                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                                    À retenir
                                  </p>
                                  <p className="mt-1 text-sm font-medium text-amber-950 md:text-base">{question.takeaway}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <QuestionStatusBadge
                                    kind={question.status?.kind}
                                    label={question.status?.kind === "source" ? question.status.label : undefined}
                                    href={question.status?.kind === "source" ? question.status.href : undefined}
                                    note={question.status?.kind === "needsReview" ? question.status.note : undefined}
                                  />
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          </details>
        </section>
      </div>
    </LearnRubricShell>
  );
}
