"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Compass,
  Layers3,
  Map,
  Route,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LearnLinkCard, LearnLocale } from "@/lib/learning/learn-rubric-data";

type LearnComprendreVisualIntroProps = {
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

const MOTIF_ICONS: Record<LearnLinkCard["visual"]["motif"], LucideIcon> = {
  layers: Layers3,
  path: Compass,
  quiz: BarChart3,
  calendar: Map,
  guides: Route,
  resources: Sparkles,
};

function getLocaleText(locale: LearnLocale, text: { fr: string; en: string }) {
  return text[locale];
}

function StatBadge({
  locale,
  value,
  label,
  accent,
}: {
  locale: LearnLocale;
  value: string;
  label: { fr: string; en: string };
  accent: string;
}) {
  return (
    <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className={cn("text-2xl font-black tracking-tight", accent)}>{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {getLocaleText(locale, label)}
      </p>
    </div>
  );
}

function RightCard({
  title,
  subtitle,
  children,
  icon,
  accent,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  icon: LucideIcon;
  accent: string;
}) {
  const Icon = icon;

  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <p className="text-sm font-bold text-slate-800">{subtitle}</p>
        </div>
        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50", accent)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function renderArtwork(card: LearnLinkCard, locale: LearnLocale) {
  const tone = TONE_CLASSES[card.visual.tone];
  const Icon = MOTIF_ICONS[card.visual.motif];

  if (card.visual.motif === "layers") {
    return (
      <div className="space-y-3">
        <div className="rounded-[1.4rem] border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]", tone.badge)}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {card.visual.badge[locale]}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              01
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="relative overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white p-3">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-50 via-transparent to-transparent" />
              <div className="relative flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                  <Map className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <div className="h-2.5 w-24 rounded-full bg-slate-200" />
                  <div className="mt-2 h-2 w-32 rounded-full bg-slate-100" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <span className="h-12 rounded-2xl bg-yellow-50" />
                <span className="h-16 rounded-2xl bg-yellow-100" />
                <span className="h-10 rounded-2xl bg-yellow-50" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <RightCard
                title={card.visual.chips[0] ? getLocaleText(locale, card.visual.chips[0]) : (locale === "fr" ? "Repères" : "Cues")}
                subtitle={locale === "fr" ? "Lire les écarts et les seuils" : "Read gaps and thresholds"}
                icon={BarChart3}
                accent="text-yellow-700"
              >
                <div className="space-y-2">
                  <div className="h-2 w-full rounded-full bg-yellow-100" />
                  <div className="h-2 w-4/5 rounded-full bg-yellow-200" />
                  <div className="h-2 w-2/3 rounded-full bg-yellow-300" />
                </div>
              </RightCard>

              <RightCard
                title={card.visual.chips[1] ? getLocaleText(locale, card.visual.chips[1]) : (locale === "fr" ? "Méthode" : "Method")}
                subtitle={locale === "fr" ? "Suivre la logique avant l'action" : "Follow the logic before action"}
                icon={Route}
                accent="text-yellow-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-700">
                    <Compass className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="h-0.5 flex-1 rounded-full bg-yellow-200" />
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </RightCard>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {card.visual.stats?.map((stat) => (
            <StatBadge
              key={`${card.title}-${stat.value}-${stat.label.fr}`}
              locale={locale}
              value={stat.value}
              label={stat.label}
              accent={tone.accent}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl", tone.badge)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {card.title}
            </p>
            <p className="text-sm font-bold text-slate-800">{card.detail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LearnComprendreVisualIntro({
  locale,
  card,
  question,
  clue,
  action,
  className,
}: LearnComprendreVisualIntroProps) {
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
              {locale === "fr" ? "Aperçu visuel" : "Visual overview"}
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
              <StatBadge
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
              <span
                key={`${card.title}-${chip[locale]}`}
                className={cn(
                  "inline-flex min-h-8 items-center rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em]",
                  tone.chip,
                )}
              >
                {chip[locale]}
              </span>
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
                {locale === "fr" ? "Lecture en 3 couches" : "Three-layer reading"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {card.title}
              </h3>
            </div>
            <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl border", tone.badge)}>
              <Layers3 className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          {renderArtwork(card, locale)}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {locale === "fr" ? "Contexte" : "Context"}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {locale === "fr"
                  ? "Commencer par les repères avant le détail."
                  : "Start with cues before the detail."}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {locale === "fr" ? "Amplitude" : "Magnitude"}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {locale === "fr"
                  ? "Comparer les ordres de grandeur."
                  : "Compare orders of magnitude."}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {locale === "fr" ? "Méthode" : "Method"}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {locale === "fr"
                  ? "Relier les chiffres à la lecture terrain."
                  : "Link numbers back to field reading."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
