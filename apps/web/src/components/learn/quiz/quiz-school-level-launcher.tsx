import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { getQuizUiCopy } from "@/lib/learning/quiz/quiz-i18n";
import { QUIZ_SCHOOL_LEVEL_ORDER, type QuizSchoolLevel } from "@/lib/learning/quiz/quiz-school-types";

const LEVEL_TONES: Record<QuizSchoolLevel, string> = {
  "6e": "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
  "5e": "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100",
  "4e": "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
  "3e": "border-violet-200 bg-violet-50 text-violet-950 hover:bg-violet-100",
};

export function QuizSchoolLevelLauncher({ locale }: { locale: SupportedLocale }) {
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
          <Link
            key={level}
            href={`/learn/sentrainer?mode=ecole&level=${level}`}
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
          </Link>
        ))}
      </div>
    </section>
  );
}
