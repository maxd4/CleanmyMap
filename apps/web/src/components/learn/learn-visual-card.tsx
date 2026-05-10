"use client";

import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  Compass,
  Layers3,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LearnCardVisual,
  LearnLinkCard,
  LearnLocale,
} from "@/lib/learning/learn-rubric-data";

type LearnVisualCardProps = {
  locale: LearnLocale;
  card: LearnLinkCard;
  index?: number;
  compact?: boolean;
  className?: string;
};

const TONE_CLASSES: Record<
  LearnCardVisual["tone"],
  { shell: string; badge: string; glow: string; border: string; accent: string; fill: string }
> = {
  amber: {
    shell: "bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.94))]",
    badge: "border-yellow-200 bg-yellow-100 text-yellow-900",
    glow: "from-yellow-300/24 via-amber-200/14 to-transparent",
    border: "hover:border-yellow-300",
    accent: "text-yellow-700",
    fill: "bg-yellow-700",
  },
  cyan: {
    shell: "bg-[linear-gradient(180deg,rgba(236,254,255,0.98),rgba(255,255,255,0.94))]",
    badge: "border-cyan-200 bg-cyan-100 text-cyan-900",
    glow: "from-cyan-400/22 via-sky-300/16 to-transparent",
    border: "hover:border-cyan-300",
    accent: "text-cyan-700",
    fill: "bg-cyan-700",
  },
  emerald: {
    shell: "bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(255,255,255,0.94))]",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-900",
    glow: "from-emerald-400/24 via-lime-300/16 to-transparent",
    border: "hover:border-emerald-300",
    accent: "text-emerald-700",
    fill: "bg-emerald-700",
  },
  violet: {
    shell: "bg-[linear-gradient(180deg,rgba(245,243,255,0.98),rgba(255,255,255,0.94))]",
    badge: "border-violet-200 bg-violet-100 text-violet-900",
    glow: "from-violet-400/24 via-fuchsia-300/16 to-transparent",
    border: "hover:border-violet-300",
    accent: "text-violet-700",
    fill: "bg-violet-700",
  },
};

const MOTIF_ICONS: Record<LearnCardVisual["motif"], typeof Layers3> = {
  layers: Layers3,
  path: Compass,
  quiz: Brain,
  calendar: CalendarDays,
  guides: CheckCircle2,
  resources: BookOpen,
};

function getLocaleText(locale: LearnLocale, text: { fr: string; en: string }) {
  return text[locale];
}

function renderMotif(motif: LearnCardVisual["motif"], tone: LearnCardVisual["tone"]) {
  const Icon = MOTIF_ICONS[motif];
  const iconTone = TONE_CLASSES[tone].accent;
  const iconFill = TONE_CLASSES[tone].fill;

  if (motif === "path") {
    return (
      <div className="relative flex h-full items-center justify-center">
        <div className="absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-slate-900/10" />
        <div className={cn("absolute left-6 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full", iconFill)} />
        <div className={cn("absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full", iconFill)} />
        <div className={cn("absolute right-6 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full", iconFill)} />
        <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
          <Icon size={14} className={cn("mr-1 inline-block align-text-bottom", iconTone)} />
          route
        </div>
      </div>
    );
  }

  if (motif === "quiz") {
    return (
      <div className="relative flex h-full items-end justify-center gap-3">
        <div className="absolute inset-x-6 top-6 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              quiz
            </span>
            <Icon size={14} className={iconTone} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((dot) => (
              <span
                key={dot}
                className={cn(
                  "h-2.5 rounded-full",
                  dot <= 2 ? "bg-cyan-300" : dot === 3 ? "bg-yellow-300" : "bg-emerald-300",
                )}
              />
            ))}
          </div>
        </div>
        <span className="h-12 w-12 rounded-2xl border border-cyan-200 bg-cyan-100/90 shadow-sm" />
        <span className="h-20 w-12 rounded-2xl border border-violet-200 bg-violet-100/90 shadow-sm" />
        <span className="h-16 w-12 rounded-2xl border border-emerald-200 bg-emerald-100/90 shadow-sm" />
      </div>
    );
  }

  if (motif === "calendar") {
    return (
      <div className="grid h-full grid-cols-3 gap-2">
        {[...Array(9)].map((_, index) => (
          <span
            key={index}
            className={cn(
              "rounded-xl border shadow-sm",
              index === 1 || index === 4 || index === 7
                ? "border-yellow-200 bg-yellow-100"
                : index === 2 || index === 6
                  ? "border-cyan-200 bg-cyan-100"
                  : "border-slate-200 bg-white",
            )}
          />
        ))}
      </div>
    );
  }

  if (motif === "guides") {
    return (
      <div className="flex h-full items-end justify-center gap-2">
        <span className="h-12 w-16 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        <span className="h-18 w-16 rounded-2xl border border-emerald-200 bg-emerald-100/95 shadow-sm" />
        <span className="h-14 w-16 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
    );
  }

  if (motif === "resources") {
    return (
      <div className="relative flex h-full items-center justify-center">
        <div className="grid h-24 w-24 place-items-center rounded-3xl border border-yellow-200 bg-white shadow-sm">
          <Icon size={24} className={iconTone} />
        </div>
        <div className="absolute bottom-2 right-2 rounded-2xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
          kit
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-end justify-center gap-2">
      <span className="h-16 w-12 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <span className="h-24 w-12 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <span className="h-20 w-12 rounded-2xl border border-slate-200 bg-white shadow-sm" />
    </div>
  );
}

export function LearnVisualCard({
  locale,
  card,
  index,
  compact = false,
  className,
}: LearnVisualCardProps) {
  const tone = TONE_CLASSES[card.visual.tone];

  return (
    <Link
      href={card.href}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-150 ease-out hover:-translate-y-1 hover:shadow-lg",
        tone.border,
        className,
      )}
    >
      <div className={cn("relative overflow-hidden p-4 sm:p-5", tone.shell)}>
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-b",
            tone.glow,
          )}
          aria-hidden="true"
        />

        <div className="relative flex items-start justify-between gap-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]",
              tone.badge,
            )}
          >
            {getLocaleText(locale, card.visual.badge)}
          </span>
          <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            {index ? `0${index}` : "01"}
          </span>
        </div>

        <div className={cn("relative mt-4 grid gap-4", compact ? "sm:grid-cols-[1fr_0.9fr]" : "sm:grid-cols-[1.05fr_0.95fr]")}>
          <div className={cn("rounded-[1.4rem] border border-slate-200 bg-white/85 p-3 shadow-sm", compact ? "h-24" : "h-32")}>
            {renderMotif(card.visual.motif, card.visual.tone)}
          </div>

          <div className="space-y-3">
            {card.visual.stats?.length ? (
              <div className="grid grid-cols-2 gap-2">
                {card.visual.stats.map((stat) => (
                  <div
                    key={`${card.href}-${stat.value}-${stat.label[locale]}`}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                  >
                    <p className={cn("text-base font-black tracking-tight", tone.accent)}>
                      {stat.value}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {getLocaleText(locale, stat.label)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {card.visual.chips.slice(0, compact ? 1 : 2).map((chip) => (
                <span
                  key={`${card.href}-${chip[locale]}`}
                  className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm"
                >
                  {getLocaleText(locale, chip)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-lg font-black tracking-tight cmm-text-primary">
            {card.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed cmm-text-secondary">
            {card.detail}
          </p>
        </div>

        <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
          {locale === "fr" ? "Ouvrir la page" : "Open page"}
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
