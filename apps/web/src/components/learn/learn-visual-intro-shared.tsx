import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LearnLinkCard, LearnLocale } from "@/lib/learning/learn-rubric-data";

export type LearnVisualIntroAction = {
  href: string;
  label: string;
};

export const LEARN_VISUAL_INTRO_TONES: Record<
  LearnLinkCard["visual"]["tone"],
  { shell: string; badge: string; accent: string; border: string; glow: string; chip: string }
> = {
  amber: {
    shell: "bg-[linear-gradient(180deg,rgba(255,248,231,0.98),rgba(255,255,255,0.96))]",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "text-amber-700",
    border: "border-amber-200",
    glow: "from-amber-300/18 via-orange-200/12 to-transparent",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
  },
  cyan: {
    shell: "bg-[linear-gradient(180deg,rgba(255,250,238,0.98),rgba(255,255,255,0.96))]",
    badge: "border-orange-200 bg-orange-50 text-orange-900",
    accent: "text-orange-700",
    border: "border-orange-200",
    glow: "from-orange-300/18 via-amber-200/12 to-transparent",
    chip: "border-orange-200 bg-orange-50 text-orange-800",
  },
  emerald: {
    shell: "bg-[linear-gradient(180deg,rgba(255,248,232,0.98),rgba(255,255,255,0.96))]",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "text-amber-700",
    border: "border-amber-200",
    glow: "from-amber-300/18 via-orange-200/12 to-transparent",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
  },
  violet: {
    shell: "bg-[linear-gradient(180deg,rgba(255,248,232,0.98),rgba(255,255,255,0.96))]",
    badge: "border-orange-200 bg-amber-100 text-orange-900",
    accent: "text-orange-700",
    border: "border-orange-200",
    glow: "from-orange-300/18 via-amber-200/12 to-transparent",
    chip: "border-orange-200 bg-amber-50 text-orange-800",
  },
};

export function LearnVisualIntroFrame({
  card,
  className,
  children,
}: {
  card: LearnLinkCard;
  className?: string;
  children: ReactNode;
}) {
  const tone = LEARN_VISUAL_INTRO_TONES[card.visual.tone];

  return (
    <section className={cn("relative overflow-hidden rounded-[2rem] border bg-white p-5 shadow-sm md:p-6", tone.border, className)}>
      <div className={cn("absolute inset-0 -z-10 bg-gradient-to-br", tone.glow)} aria-hidden="true" />
      <div className={cn("grid gap-6 lg:grid-cols-[1.05fr_0.95fr]", tone.shell)}>{children}</div>
    </section>
  );
}

export function LearnVisualIntroLead({
  locale,
  card,
  question,
  clue,
  eyebrow,
  action,
  chips,
  actionClassName,
}: {
  locale: LearnLocale;
  card: LearnLinkCard;
  question: string;
  clue: string;
  eyebrow: string;
  action: LearnVisualIntroAction;
  chips: ReactNode;
  actionClassName: string;
}) {
  const tone = LEARN_VISUAL_INTRO_TONES[card.visual.tone];

  return (
    <div className="space-y-5 rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.18em]", tone.badge)}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {eyebrow}
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">
          {card.visual.badge[locale]}
        </span>
      </div>

      <div className="space-y-3">
        <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{question}</h2>
        <p className="cmm-text-body max-w-2xl">{clue}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(card.visual.stats ?? []).slice(0, 3).map((stat) => (
          <div key={`${card.title}-${stat.value}-${stat.label[locale]}`} className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className={cn("text-2xl font-black tracking-tight", tone.accent)}>{stat.value}</p>
            <p className="mt-1 cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">{stat.label[locale]}</p>
          </div>
        ))}
      </div>

      {chips}

      <Link href={action.href} className={actionClassName}>
        {action.label}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
