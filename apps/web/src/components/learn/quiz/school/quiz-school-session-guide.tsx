import { BookOpen, CheckCircle, ShieldAlert } from "lucide-react";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import {
  QUIZ_SCHOOL_KIT_STEPS,
  QUIZ_SCHOOL_STUDENT_SHEET,
  QUIZ_SCHOOL_TEACHER_GUIDE,
} from "@/lib/learning/quiz/school/quiz-school-kit";

const WORKSHOP_SUMMARY = [
  { value: "30 min", label: { fr: "quiz collectif", en: "collective quiz" } },
  { value: "60 min", label: { fr: "atelier complet", en: "full workshop" } },
] as const;

export function QuizSchoolSessionGuide({ locale }: { locale: SupportedLocale }) {
  const isFrench = locale === "fr";

  return (
    <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
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

      <div className="grid gap-4 lg:grid-cols-2">
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
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-relaxed text-slate-700"
              >
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

      <div className="rounded-[2rem] border border-amber-200 bg-amber-50/70 p-5 shadow-sm md:p-6">
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
            {WORKSHOP_SUMMARY.map((item) => (
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
                  {index === 0 ? "Intro" : index === 1 ? "Quiz" : index === 2 ? "Discussion" : "Conclusion"}
                </span>
              </div>
              <h4 className="mt-4 text-lg font-black tracking-tight text-slate-900">{step.title}</h4>
              <p className="mt-2 text-sm font-bold text-slate-700">{step.lead}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
