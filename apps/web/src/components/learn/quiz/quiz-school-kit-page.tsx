"use client";

import Link from "next/link";
import { ArrowRight, Compass, GraduationCap, School, Users } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { QuizSchoolBankSection } from "@/components/learn/quiz/school/quiz-school-bank-section";
import { QuizSchoolLevelLauncher } from "@/components/learn/quiz/school/quiz-school-level-launcher";
import { QuizSchoolSessionGuide } from "@/components/learn/quiz/school/quiz-school-session-guide";

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

export function QuizSchoolKitPage() {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";

  return (
    <LearnRubricShell
      title={{ fr: "Mode École", en: "School mode" }}
      subtitle={{ fr: "Séance publique de la 6e à la 3e", en: "Public session for grades 6 to 9" }}
      description={{ fr: "Une page pour préparer une séance collective, faire voter la classe et garder un cadre simple, lisible et sérieux.", en: "A page to prepare a collective session, get the class voting and keep the frame simple, readable and serious." }}
      backHref="/learn/ressources"
      backLabel={{ fr: "Retour aux ressources", en: "Back to resources" }}
      accent="yellow"
      highlights={[{ fr: "Vidéoprojecteur", en: "Projector" }, { fr: "Débat", en: "Debate" }, { fr: "Sans compte élève", en: "No student account" }]}
      cta={{ href: "#choisir-niveau", label: { fr: "Choisir le niveau", en: "Choose the grade" } }}
    >
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-amber-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{isFrench ? "Lancement immédiat" : "Immediate launch"}</p>
              <h3 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{isFrench ? "Choisir le niveau, puis le format" : "Choose the grade, then the format"}</h3>
              <p className="text-sm leading-relaxed text-slate-700 md:text-base">{isFrench ? "Choisissez un quiz de 30 minutes ou un atelier de 60 minutes. La démo reste disponible pour tester le déroulé." : "Choose a 30-minute quiz or a 60-minute workshop. The demo stays available for a quick rehearsal."}</p>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">{isFrench ? "Formats : quiz 30 min · atelier 60 min" : "Formats: 30-minute quiz · 60-minute workshop"}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="#choisir-niveau" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70">{isFrench ? "Choisir le niveau" : "Choose the grade"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link href="/learn/sentrainer?mode=demo" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70">{isFrench ? "Lancer la démo" : "Launch the demo"}</Link>
            </div>
          </div>
        </section>

        <QuizSchoolLevelLauncher locale={locale} />
        <QuizSchoolSessionGuide locale={locale} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {INTRO_CARDS.map((card, index) => {
            const Icon = card.icon;
            return (
              <article key={card.title.fr} className="rounded-[1.8rem] border border-amber-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3"><div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"><Icon className="h-5 w-5" aria-hidden="true" /></div><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{String(index + 1).padStart(2, "0")}</span></div>
                <h3 className="mt-4 text-lg font-black tracking-tight text-slate-900">{card.title[locale]}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.text[locale]}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{isFrench ? "Passage au quiz" : "Move to the quiz"}</p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{isFrench ? "Le kit reste lisible, le quiz reste simple" : "The kit stays readable, the quiz stays simple"}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{isFrench ? "Quand la classe est prête, on passe sur le mode École depuis le quiz et on garde ce document comme support d’animation." : "When the class is ready, switch to school mode from the quiz and keep this document as the animation support."}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="#choisir-niveau" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 md:px-6 md:py-3.5 md:text-base">{isFrench ? "Choisir le niveau" : "Choose the grade"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link href="/learn/sentrainer?mode=demo" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 md:px-6 md:py-3.5 md:text-base">{isFrench ? "Lancer la démo" : "Launch the demo"}</Link>
              <Link href="/learn/ressources" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 md:px-6 md:py-3.5 md:text-base">{isFrench ? "Retour aux ressources" : "Back to resources"}</Link>
            </div>
          </div>
        </section>

        <QuizSchoolBankSection locale={locale} />
      </div>
    </LearnRubricShell>
  );
}
