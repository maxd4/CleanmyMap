import { ArrowRight, ClipboardCheck, FlaskConical, Scale } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import type { LearnLinkCard, LearnLocale } from "@/lib/learning/learn-rubric-data";

type LearnComprendreVisualIntroProps = {
  locale: LearnLocale;
  card: LearnLinkCard;
  question: string;
  clue: string;
  action: { href: string; label: string };
  className?: string;
};

const STEPS = [
  { icon: ClipboardCheck, label: { fr: "Contexte", en: "Context" }, title: { fr: "Observer ou déclarer", en: "Observe or report" }, example: { fr: "Masse pesée, mégots comptés, durée déclarée.", en: "Weighed mass, counted butts, reported duration." } },
  { icon: Scale, label: { fr: "Ordres de grandeur", en: "Orders of magnitude" }, title: { fr: "Calculer", en: "Calculate" }, example: { fr: "Convertir les unités et expliciter les hypothèses.", en: "Convert units and state the assumptions." } },
  { icon: FlaskConical, label: { fr: "Méthode", en: "Method" }, title: { fr: "Interpréter", en: "Interpret" }, example: { fr: "Distinguer mesure, estimation, proxy et valeur inconnue.", en: "Distinguish measurements, estimates, proxies and unknown values." } },
] as const;

export function LearnComprendreVisualIntro({ locale, card, question, clue, action, className }: LearnComprendreVisualIntroProps) {
  return (
    <CmmCard tone="family" as="section" className={className}>
      <div className="space-y-2">
        <p className="cmm-text-caption font-bold uppercase tracking-wide text-amber-800">{locale === "fr" ? "Aperçu visuel" : "Visual overview"} · {card.title}</p>
        <h2 className="text-2xl font-bold tracking-tight cmm-text-primary">{question}</h2>
        <p className="cmm-text-body">{clue}</p>
      </div>
      <ol className="mt-5 grid gap-3 md:grid-cols-3" aria-label={locale === "fr" ? "De la donnée à l'interprétation" : "From data to interpretation"}>
        {STEPS.map(({ icon: Icon, label, title, example }, index) => (
          <li key={label.fr} className="flex flex-col gap-3 rounded-xl bg-white p-4 text-slate-900 dark:bg-slate-900 dark:text-white">
            <div className="flex items-center justify-between gap-2">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-900"><Icon className="h-6 w-6" aria-hidden="true" /></span>
              <span className="text-sm font-bold text-amber-800 dark:text-amber-300">0{index + 1}</span>
            </div>
            <div><p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{label[locale]}</p><h3 className="mt-1 text-lg font-bold">{title[locale]}</h3></div>
            <p className="text-sm leading-relaxed">{example[locale]}</p>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="cmm-text-body font-semibold">{locale === "fr" ? "Une estimation ne devient jamais une observation." : "An estimate never becomes an observation."}</p>
        <CmmButton href={action.href} tone="secondary" size="sm">{action.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></CmmButton>
      </div>
    </CmmCard>
  );
}
