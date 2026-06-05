"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";

export type PilotageClusterMetric = {
  id: string;
  label: string;
  value: string;
  previousValue?: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  note?: string;
};

export type PilotageClusterInsight = {
  eyebrow: string;
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
};

export type PilotageClusterLink = {
  id: string;
  href: string;
  label: string;
  description: string;
};

type PilotageMetricGridProps = {
  metrics: PilotageClusterMetric[];
  className?: string;
  cardClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  variant?: "pilotage" | "sponsor" | "governance";
};

type PilotageInsightCardProps = {
  insight: PilotageClusterInsight;
  className?: string;
  variant?: "pilotage" | "sponsor" | "governance";
};

type PilotageClusterLinksProps = {
  links: PilotageClusterLink[];
  className?: string;
  activeLinkId?: string;
};

const VARIANT_CARD_STYLES: Record<
  NonNullable<PilotageMetricGridProps["variant"]>,
  {
    card: string;
    label: string;
    value: string;
    accent: string;
    chip: string;
    secondary: string;
  }
> = {
  pilotage: {
    card: "border-white/12 bg-white/8",
    label: "text-orange-100/70",
    value: "text-white",
    accent: "bg-amber-300",
    chip: "bg-white/10 text-amber-100",
    secondary: "text-white/72",
  },
  sponsor: {
    card: "border-white/5 bg-white/5",
    label: "text-white/40",
    value: "text-white",
    accent: "bg-amber-300",
    chip: "border-white/10 bg-white/10 text-white/90",
    secondary: "text-white/72",
  },
  governance: {
    card: "border-white/12 bg-slate-950/35",
    label: "text-slate-400",
    value: "text-white",
    accent: "bg-sky-400",
    chip: "bg-white/10 text-sky-100",
    secondary: "text-slate-300",
  },
};

const VARIANT_INSIGHT_STYLES: Record<
  NonNullable<PilotageInsightCardProps["variant"]>,
  {
    card: string;
    eyebrow: string;
    title: string;
    detail: string;
    primary: string;
    secondary?: string;
  }
> = {
  pilotage: {
    card: "border-white/12 bg-[rgba(69,45,28,0.84)]",
    eyebrow: "text-orange-100/70",
    title: "text-white",
    detail: "text-white/82",
    primary:
      "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-[0_8px_24px_-8px_rgba(234,88,12,0.45)]",
    secondary: "border-white/12 bg-[rgba(44,28,15,0.60)] text-white hover:border-orange-300/50",
  },
  sponsor: {
    card: "border-white/5 bg-white/5",
    eyebrow: "text-amber-100/70",
    title: "text-white",
    detail: "text-white/78",
    primary:
      "bg-gradient-to-r from-amber-500 to-orange-400 text-black shadow-[0_10px_28px_-10px_rgba(249,115,22,0.35)]",
    secondary: "border-white/10 bg-white/5 text-white hover:bg-white/10",
  },
  governance: {
    card: "border-white/10 bg-slate-950/35",
    eyebrow: "text-slate-400",
    title: "text-white",
    detail: "text-slate-300",
    primary:
      "bg-gradient-to-r from-sky-500 to-indigo-400 text-white shadow-[0_8px_24px_-8px_rgba(14,165,233,0.35)]",
    secondary: "border-white/10 bg-white/5 text-white hover:bg-white/10",
  },
};

export function PilotageMetricGrid({
  metrics,
  className,
  cardClassName,
  labelClassName,
  valueClassName,
  variant = "pilotage",
}: PilotageMetricGridProps) {
  const theme = VARIANT_CARD_STYLES[variant];

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const interpretationClass =
          metric.interpretation === "positive"
            ? "bg-emerald-500/10 text-emerald-300"
            : metric.interpretation === "negative"
              ? "bg-rose-500/10 text-rose-300"
              : "bg-white/10 text-white/80";

        return (
          <article
            key={metric.id}
            className={cn(
              "group relative overflow-hidden rounded-[2.25rem] border p-6 backdrop-blur-3xl transition-all duration-500",
              theme.card,
              cardClassName,
            )}
          >
            <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-[0.04] transition-opacity group-hover:opacity-[0.08]">
              <svg viewBox="0 0 100 100" className="h-[100px] w-[100px] fill-white">
                <circle cx="50" cy="50" r="44" />
              </svg>
            </div>

            <div className="flex items-start justify-between gap-3">
              <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", theme.label, labelClassName)}>
                {metric.label}
              </p>
              {Icon ? (
                <span className={cn("rounded-2xl border border-white/10 p-3 text-white/80", theme.chip)}>
                  <Icon size={16} aria-hidden="true" />
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              <span className={cn("block text-4xl font-black tracking-tighter", theme.value, valueClassName)}>
                {metric.value}
              </span>

              {metric.previousValue ? (
                <p className={cn("text-sm font-semibold", theme.secondary)}>
                  N-1: {metric.previousValue}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                {metric.deltaAbsolute ? (
                  <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]", interpretationClass)}>
                    {metric.interpretation === "positive" ? (
                      <TrendingUp size={12} aria-hidden="true" />
                    ) : metric.interpretation === "negative" ? (
                      <TrendingDown size={12} aria-hidden="true" />
                    ) : null}
                    {metric.deltaAbsolute}
                  </span>
                ) : null}
                {metric.deltaPercent ? (
                  <span className={cn("inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]", interpretationClass)}>
                    {metric.deltaPercent}
                  </span>
                ) : null}
              </div>

              {metric.note ? (
                <p className={cn("text-xs leading-relaxed", theme.secondary)}>{metric.note}</p>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function PilotageInsightCard({
  insight,
  className,
  variant = "pilotage",
}: PilotageInsightCardProps) {
  const theme = VARIANT_INSIGHT_STYLES[variant];

  return (
    <aside
      className={cn(
        "rounded-[2.5rem] border p-6 shadow-[0_18px_40px_-28px_rgba(69,45,28,0.26)] backdrop-blur-sm",
        theme.card,
        className,
      )}
    >
      <p className={cn("text-[11px] font-black uppercase tracking-[0.22em]", theme.eyebrow)}>
        {insight.eyebrow}
      </p>
      <h3 className={cn("mt-2 text-xl font-black tracking-tight", theme.title)}>
        {insight.title}
      </h3>
      <p className={cn("mt-4 text-sm leading-relaxed", theme.detail)}>
        {insight.detail}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <CmmButton
          href={insight.actionHref}
          tone="primary"
          variant="pill"
          className={cn("gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em]", theme.primary)}
        >
          {insight.actionLabel}
          <ArrowRight size={14} aria-hidden="true" />
        </CmmButton>
        {insight.secondaryActionHref && insight.secondaryActionLabel ? (
          <CmmButton
            href={insight.secondaryActionHref}
            tone="secondary"
            variant="pill"
            className={cn("px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em]", theme.secondary)}
          >
            {insight.secondaryActionLabel}
          </CmmButton>
        ) : null}
      </div>
    </aside>
  );
}

export function PilotageClusterLinks({
  links,
  className,
  activeLinkId,
}: PilotageClusterLinksProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>
      {links.map((link, index) => (
        <Link
          key={link.id}
          href={link.href}
          aria-current={activeLinkId === link.id ? "page" : undefined}
          className={cn(
            "group rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.09]",
            activeLinkId === link.id &&
              "border-white/25 bg-white/[0.12] shadow-[0_18px_40px_-28px_rgba(255,255,255,0.18)]",
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h4 className="mt-2 text-lg font-black tracking-tight text-white">
            {link.label}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-white/72">
            {link.description}
          </p>
        </Link>
      ))}
    </div>
  );
}
