"use client";

import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Clock3,
  Repeat2,
  Shuffle,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearnLinkCard, LearnLocale } from "@/lib/learning/learn-rubric-data";
import { CognitiveSignalChip } from "@/components/learn/cognitive-signal-chip";

type LearnPracticeVisualIntroProps = {
  locale: LearnLocale;
  card: LearnLinkCard;
  question: string;
  clue: string;
  action: {
    href: string;
    label: string;
  };
  className?: string;
};

const TONE_CLASSES: Record<
  LearnLinkCard["visual"]["tone"],
  { shell: string; badge: string; accent: string; border: string; glow: string; chip: string }
> = {
  amber: {
    shell: "bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.96))]",
    badge: "border-amber-200 bg-amber-100 text-amber-900",
    accent: "text-amber-700",
    border: "border-amber-200",
    glow: "from-amber-300/18 via-orange-200/12 to-transparent",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
  },
  cyan: {
    shell: "bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.96))]",
    badge: "border-yellow-200 bg-yellow-100 text-yellow-900",
    accent: "text-yellow-700",
    border: "border-yellow-200",
    glow: "from-yellow-300/18 via-amber-200/12 to-transparent",
    chip: "border-yellow-200 bg-yellow-50 text-yellow-800",
  },
  emerald: {
    shell: "bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.96))]",
    badge: "border-yellow-200 bg-yellow-100 text-yellow-900",
    accent: "text-yellow-700",
    border: "border-yellow-200",
    glow: "from-yellow-300/18 via-amber-200/12 to-transparent",
    chip: "border-yellow-200 bg-yellow-50 text-yellow-800",
  },
  violet: {
    shell: "bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.96))]",
    badge: "border-yellow-200 bg-yellow-100 text-yellow-900",
    accent: "text-yellow-700",
    border: "border-yellow-200",
    glow: "from-yellow-300/18 via-amber-200/12 to-transparent",
    chip: "border-yellow-200 bg-yellow-50 text-yellow-800",
  },
};

type StepCard = {
  icon: LucideIcon;
  title: { fr: string; en: string };
  detail: { fr: string; en: string };
  tone: "violet" | "cyan" | "emerald";
};

const STEP_CARDS: StepCard[] = [
  {
    icon: Brain,
    title: { fr: "Réactiver", en: "Reactivate" },
    detail: { fr: "Commencer par des rappels courts et simples.", en: "Start with short, simple recall." },
    tone: "violet",
  },
  {
    icon: Shuffle,
    title: { fr: "Mélanger", en: "Mix" },
    detail: {
      fr: "Garder les thèmes variés pour éviter l'apprentissage en ligne droite.",
      en: "Keep themes mixed to avoid linear learning.",
    },
    tone: "cyan",
  },
  {
    icon: Repeat2,
    title: { fr: "Revenir", en: "Return" },
    detail: {
      fr: "Revoir au bon moment pour ancrer la réponse.",
      en: "Come back at the right time to anchor the answer.",
    },
    tone: "emerald",
  },
];

function StepTile({
  locale,
  step,
}: {
  locale: LearnLocale;
  step: StepCard;
}) {
  const Icon = step.icon;
  const tone = TONE_CLASSES[step.tone];

  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl", tone.badge)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          {step.title[locale]}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-700">
        {step.detail[locale]}
      </p>
    </div>
  );
}

function VisualStat({
  locale,
  label,
  value,
  accent,
}: {
  locale: LearnLocale;
  label: { fr: string; en: string };
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className={cn("text-2xl font-black tracking-tight", accent)}>{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label[locale]}
      </p>
    </div>
  );
}

function QuickCue({
  icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  const Icon = icon;

  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm">
      <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
      {label}
    </div>
  );
}

export function LearnPracticeVisualIntro({
  locale,
  card,
  question,
  clue,
  action,
  className,
}: LearnPracticeVisualIntroProps) {
  const tone = TONE_CLASSES[card.visual.tone];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border bg-white p-5 shadow-sm md:p-6",
        tone.border,
        className,
      )}
    >
      <div className={cn("absolute inset-0 -z-10 bg-gradient-to-br", tone.glow)} aria-hidden="true" />
      <div className={cn("grid gap-6 lg:grid-cols-[1.05fr_0.95fr]", tone.shell)}>
        <div className="space-y-5 rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]", tone.badge)}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {locale === "fr" ? "Parcours adaptatif" : "Adaptive path"}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              {card.visual.badge[locale]}
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              {question}
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
              {clue}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(card.visual.stats ?? []).slice(0, 3).map((stat) => (
              <VisualStat
                key={`${card.title}-${stat.value}-${stat.label[locale]}`}
                locale={locale}
                value={stat.value}
                label={stat.label}
                accent={tone.accent}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {card.visual.chips.map((chip) => (
              <CognitiveSignalChip
                key={`${card.title}-${chip[locale]}`}
                label={chip[locale]}
                tone="default"
                title={chip[locale]}
              />
            ))}
          </div>

          <Link
            href={action.href}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
          >
            {action.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="space-y-3 rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {locale === "fr" ? "Ce qu'on fait ici" : "What happens here"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {locale === "fr" ? "Une boucle courte et lisible" : "A short, readable loop"}
              </h3>
            </div>
            <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl border", tone.badge)}>
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <QuickCue
              icon={Clock3}
              label={locale === "fr" ? "Sessions courtes" : "Short sessions"}
            />
            <QuickCue
              icon={Shuffle}
              label={locale === "fr" ? "Questions mélangées" : "Mixed questions"}
            />
            <QuickCue
              icon={Target}
              label={locale === "fr" ? "Retour immédiat" : "Immediate feedback"}
            />
          </div>

          <div className="grid gap-3">
            {STEP_CARDS.map((step) => (
              <StepTile key={step.title.fr} locale={locale} step={step} />
            ))}
          </div>

          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {locale === "fr" ? "Rythme" : "Rhythm"}
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {locale === "fr"
                    ? "Réactiver, vérifier, avancer."
                    : "Reactivate, check, move on."}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                <Repeat2 className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <span className="h-2 rounded-full bg-yellow-200" />
              <span className="h-2 rounded-full bg-yellow-300" />
              <span className="h-2 rounded-full bg-yellow-100" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
