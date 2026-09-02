import Link from "next/link";
import { useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { getQuizUiCopy } from "@/lib/learning/quiz/quiz-i18n";
import {
  QUIZ_SCHOOL_FORMAT_ORDER,
  QUIZ_SCHOOL_LEVEL_ORDER,
  type QuizSchoolFormat,
  type QuizSchoolLevel,
} from "@/lib/learning/quiz/school/quiz-school-types";

const LEVEL_TONES: Record<QuizSchoolLevel, string> = {
  "6e": "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
  "5e": "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100",
  "4e": "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
  "3e": "border-violet-200 bg-violet-50 text-violet-950 hover:bg-violet-100",
};

export function getQuizSchoolLaunchHref(level: QuizSchoolLevel, format: QuizSchoolFormat): string {
  return `/learn/sentrainer?mode=ecole&level=${level}&format=${format}`;
}

export function getQuizSchoolLaunchFormatFacts(format: QuizSchoolFormat, locale: SupportedLocale) {
  const facts = {
    "quiz-30": {
      duration: { fr: "Séance de 30 min", en: "30-minute session" },
      materials: {
        fr: "Matériel minimal : vidéoprojecteur, tableau et vote à main levée.",
        en: "Minimal equipment: projector, board and a show-of-hands vote.",
      },
      flow: {
        fr: "Fonctionnement : question → vote collectif → révélation → explication courte → question suivante.",
        en: "Flow: question → collective vote → reveal → short explanation → next question.",
      },
    },
    "atelier-60": {
      duration: { fr: "Séance de 60 min", en: "60-minute session" },
      materials: {
        fr: "Matériel minimal : vidéoprojecteur, tableau et quelques feuilles de vote.",
        en: "Minimal equipment: projector, board and a few voting sheets.",
      },
      flow: {
        fr: "Fonctionnement : pré-quiz 15 min → atelier 30 min → post-quiz 15 min.",
        en: "Flow: 15-minute pre-quiz → 30-minute workshop → 15-minute post-quiz.",
      },
    },
  } as const;

  return {
    duration: facts[format].duration[locale],
    materials: facts[format].materials[locale],
    flow: facts[format].flow[locale],
  };
}

export function QuizSchoolLevelLauncher({ locale }: { locale: SupportedLocale }) {
  const [selectedLevel, setSelectedLevel] = useState<QuizSchoolLevel | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<QuizSchoolFormat>("quiz-30");
  return (
    <section id="choisir-niveau" className="scroll-mt-24 rounded-[2rem] border border-amber-200 bg-amber-50/70 p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <GraduationCap className="mt-0.5 h-7 w-7 shrink-0 text-amber-700" aria-hidden="true" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {getQuizUiCopy(locale, "school.levelPrompt")}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {getQuizUiCopy(locale, "school.title")}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {getQuizUiCopy(locale, "school.levelNote")}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUIZ_SCHOOL_LEVEL_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setSelectedLevel(level)}
            aria-pressed={selectedLevel === level}
            className={`group rounded-2xl border p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 ${LEVEL_TONES[level]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-black">{getQuizUiCopy(locale, `school.level.${level}.label`)}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <p className="mt-2 text-sm leading-relaxed opacity-80">
              {getQuizUiCopy(locale, `school.level.${level}.description`)}
            </p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
              {getQuizUiCopy(locale, "school.questionsLabel")} · {getQuizUiCopy(locale, "school.durationLabel")}
            </p>
          </button>
        ))}
      </div>

      {selectedLevel ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-xl font-black text-slate-950">{getQuizUiCopy(locale, "school.formatPrompt")} · {selectedLevel}</h4>
            <button type="button" onClick={() => setSelectedLevel(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">{getQuizUiCopy(locale, "school.format.back")}</button>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4" aria-live="polite">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{getQuizUiCopy(locale, "school.sessionCuesLabel")}</p>
            <p className="mt-1 text-lg font-black text-slate-950">{getQuizSchoolLaunchFormatFacts(selectedFormat, locale).duration}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{getQuizSchoolLaunchFormatFacts(selectedFormat, locale).materials}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{getQuizSchoolLaunchFormatFacts(selectedFormat, locale).flow}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {QUIZ_SCHOOL_FORMAT_ORDER.map((format) => (
              <button key={format} type="button" aria-pressed={selectedFormat === format} onClick={() => setSelectedFormat(format)} className={`rounded-2xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${selectedFormat === format ? "border-amber-600 bg-amber-50" : "border-slate-200 bg-white"}`}>
                <span className="text-base font-black text-slate-950">{getQuizUiCopy(locale, `school.format.${format}.label`)}</span>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{getQuizUiCopy(locale, `school.format.${format}.description`)}</p>
              </button>
            ))}
          </div>
          <Link href={getQuizSchoolLaunchHref(selectedLevel, selectedFormat)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
            {getQuizUiCopy(locale, "school.format.cta")}<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
