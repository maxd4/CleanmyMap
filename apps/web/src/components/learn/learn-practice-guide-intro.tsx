"use client";

import Link from "next/link";
import {
  ArrowRight,
  Compass,
  ListChecks,
  MapPinned,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

type LearnPracticeGuideIntroProps = {
  locale: LearnLocale;
  title: { fr: string; en: string };
  question: { fr: string; en: string };
  clue: { fr: string; en: string };
  cta: {
    href: string;
    label: { fr: string; en: string };
  };
  className?: string;
};

type StepTone = "emerald" | "cyan" | "violet";

const STEP_TONES: Record<
  StepTone,
  { shell: string; badge: string; accent: string }
> = {
  emerald: {
    shell: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-900",
    accent: "text-emerald-700",
  },
  cyan: {
    shell: "border-cyan-200 bg-cyan-50",
    badge: "bg-cyan-100 text-cyan-900",
    accent: "text-cyan-700",
  },
  violet: {
    shell: "border-violet-200 bg-violet-50",
    badge: "bg-violet-100 text-violet-900",
    accent: "text-violet-700",
  },
};

type StepCard = {
  id: "before" | "during" | "after";
  icon: LucideIcon;
  tone: StepTone;
  label: { fr: string; en: string };
  detail: { fr: string; en: string };
};

const STEP_CARDS: StepCard[] = [
  {
    id: "before",
    icon: MapPinned,
    tone: "violet",
    label: { fr: "Avant", en: "Before" },
    detail: {
      fr: "Préparer le kit, la zone et le rôle de chacun.",
      en: "Prepare the kit, the area, and each person's role.",
    },
  },
  {
    id: "during",
    icon: ShieldCheck,
    tone: "cyan",
    label: { fr: "Pendant", en: "During" },
    detail: {
      fr: "Garder le tri simple, le rythme clair et le terrain lisible.",
      en: "Keep sorting simple, the pace clear, and the field readable.",
    },
  },
  {
    id: "after",
    icon: PackageCheck,
    tone: "emerald",
    label: { fr: "Après", en: "After" },
    detail: {
      fr: "Vérifier, ranger et transmettre le bon récapitulatif.",
      en: "Check, store, and hand off the right summary.",
    },
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
  const tone = STEP_TONES[step.tone];

  return (
    <article className={cn("rounded-[1.35rem] border p-4 shadow-sm", tone.shell)}>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]", tone.badge)}>
          <Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {step.label[locale]}
        </span>
        <span className={cn("text-[10px] font-black uppercase tracking-[0.18em]", tone.accent)}>
          0{step.id === "before" ? 1 : step.id === "during" ? 2 : 3}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-700">
        {step.detail[locale]}
      </p>
    </article>
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

export function LearnPracticeGuideIntro({
  locale,
  title,
  question,
  clue,
  cta,
  className,
}: LearnPracticeGuideIntroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-emerald-200 bg-white p-5 shadow-sm md:p-6",
        className,
      )}
    >
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(236,253,245,0.82),rgba(255,255,255,0.96))]"
        aria-hidden="true"
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5 rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-900">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {locale === "fr" ? "Guide visuel" : "Visual guide"}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              {title[locale]}
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              {question[locale]}
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
              {clue[locale]}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <QuickCue
              icon={Compass}
              label={locale === "fr" ? "Avant / pendant / après" : "Before / during / after"}
            />
            <QuickCue
              icon={ListChecks}
              label={locale === "fr" ? "Checklist courte" : "Short checklist"}
            />
            <QuickCue
              icon={ShieldCheck}
              label={locale === "fr" ? "Réflexe utile" : "Useful reflex"}
            />
          </div>

          <Link
            href={cta.href}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
          >
            {cta.label[locale]}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="space-y-3 rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {locale === "fr" ? "Séquence utile" : "Useful sequence"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {locale === "fr" ? "La logique avant l'action" : "Logic before action"}
              </h3>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-900">
              <Target className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="grid gap-3">
            {STEP_CARDS.map((step) => (
              <StepTile key={step.id} locale={locale} step={step} />
            ))}
          </div>

          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {locale === "fr" ? "Repère terrain" : "Field cue"}
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {locale === "fr"
                    ? "Une règle claire vaut mieux qu'un long discours."
                    : "A clear rule beats a long speech."}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <span className="h-2 rounded-full bg-violet-200" />
              <span className="h-2 rounded-full bg-cyan-200" />
              <span className="h-2 rounded-full bg-emerald-200" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
