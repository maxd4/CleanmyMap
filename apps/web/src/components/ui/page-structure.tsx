"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { CmmButtonGroup } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";

type SectionTitleSize = "sm" | "md" | "lg";
type CardTone = "slate" | "emerald" | "sky" | "amber" | "violet" | "rose" | "indigo";

const sectionTitleClasses: Record<SectionTitleSize, string> = {
  sm: "text-lg font-black tracking-tight text-stone-950 sm:text-xl",
  md: "text-xl font-black tracking-tight text-stone-950 sm:text-2xl",
  lg: "text-2xl font-black tracking-tight text-stone-950 sm:text-3xl",
};

const statCardToneClasses: Record<CardTone, string> = {
  slate: "border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]",
  emerald: "border-emerald-300/30 bg-emerald-500/8 shadow-[0_18px_40px_-34px_rgba(16,185,129,0.18)]",
  sky: "border-sky-300/30 bg-sky-500/8 shadow-[0_18px_40px_-34px_rgba(14,165,233,0.18)]",
  amber: "border-amber-300/30 bg-amber-500/8 shadow-[0_18px_40px_-34px_rgba(245,158,11,0.16)]",
  violet: "border-violet-300/30 bg-violet-500/8 shadow-[0_18px_40px_-34px_rgba(139,92,246,0.18)]",
  rose: "border-rose-300/30 bg-rose-500/8 shadow-[0_18px_40px_-34px_rgba(244,63,94,0.18)]",
  indigo: "border-indigo-300/30 bg-indigo-500/8 shadow-[0_18px_40px_-34px_rgba(99,102,241,0.18)]",
};

const actionToneClasses: Record<CardTone, string> = {
  slate: "border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] shadow-[0_16px_36px_-30px_rgba(15,23,42,0.2)]",
  emerald: "border-emerald-300/30 bg-emerald-500/8 shadow-[0_16px_36px_-30px_rgba(16,185,129,0.18)]",
  sky: "border-sky-300/30 bg-sky-500/8 shadow-[0_16px_36px_-30px_rgba(14,165,233,0.18)]",
  amber: "border-amber-300/30 bg-amber-500/8 shadow-[0_16px_36px_-30px_rgba(245,158,11,0.16)]",
  violet: "border-violet-300/30 bg-violet-500/8 shadow-[0_16px_36px_-30px_rgba(139,92,246,0.18)]",
  rose: "border-rose-300/30 bg-rose-500/8 shadow-[0_16px_36px_-30px_rgba(244,63,94,0.18)]",
  indigo: "border-indigo-300/30 bg-indigo-500/8 shadow-[0_16px_36px_-30px_rgba(99,102,241,0.18)]",
};

export type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  titleSize?: SectionTitleSize;
  className?: string;
  eyebrowClassName?: string;
  subtitleClassName?: string;
  actionClassName?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  badges,
  action,
  align = "left",
  titleSize = "md",
  className,
  eyebrowClassName,
  subtitleClassName,
  actionClassName,
}: SectionHeaderProps) {
  const isCenter = align === "center";

  return (
    <header
      className={cn(
        "space-y-4",
        isCenter ? "text-center" : "text-left",
        className,
      )}
    >
      {eyebrow || badges ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            isCenter ? "justify-center" : "justify-start",
          )}
        >
          {eyebrow ? (
            <span
              className={cn(
                "text-[11px] font-black uppercase tracking-[0.24em] text-stone-500",
                eyebrowClassName,
              )}
            >
              {eyebrow}
            </span>
          ) : null}
          {badges ? badges : null}
        </div>
      ) : null}

      <div
        className={cn(
          "flex w-full flex-col gap-4",
          action ? "sm:flex-row sm:items-start sm:justify-between" : null,
        )}
      >
        <div className={cn("min-w-0", action ? "flex-1" : "w-full")}>
          {title ? <h2 className={sectionTitleClasses[titleSize]}>{title}</h2> : null}
          {subtitle ? (
            <p
              className={cn(
                "mt-2 max-w-3xl text-sm leading-relaxed text-stone-600 sm:text-base",
                isCenter ? "mx-auto" : null,
                subtitleClassName,
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {action ? (
          <div className={cn("shrink-0", actionClassName)}>{action}</div>
        ) : null}
      </div>
    </header>
  );
}

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  period?: ReactNode;
  source?: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  tone?: CardTone;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function StatCard({
  label,
  value,
  unit,
  period,
  source,
  badge,
  description,
  footer,
  tone = "slate",
  size = "md",
  className,
}: StatCardProps) {
  const valueSizeClasses = {
    sm: "text-3xl sm:text-4xl",
    md: "text-4xl sm:text-5xl",
    lg: "text-4xl sm:text-6xl",
  }[size];

  return (
    <article
      className={cn(
        "rounded-[1.75rem] border p-5",
        statCardToneClasses[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">
            {label}
          </p>
          {source ? (
            <div className="mt-2">
              {source}
            </div>
          ) : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-2">
        <span className={cn("font-black tracking-tight text-stone-950", valueSizeClasses)}>
          {value}
        </span>
        {unit ? (
          <span className="text-sm font-semibold tracking-wide text-stone-600">
            {unit}
          </span>
        ) : null}
      </div>

      {period ? (
        <p className="mt-3 text-sm font-medium text-stone-600">{period}</p>
      ) : null}

      {description ? (
        <p className="mt-4 text-sm leading-relaxed text-stone-600">{description}</p>
      ) : null}

      {footer ? <div className="mt-4">{footer}</div> : null}
    </article>
  );
}

export type CTAGroupProps = {
  children: ReactNode;
  className?: string;
};

export function CTAGroup({ children, className }: CTAGroupProps) {
  return <CmmButtonGroup className={cn("gap-3", className)}>{children}</CmmButtonGroup>;
}

export type SourceBadgeProps = {
  children: ReactNode;
  tone?: "slate" | "emerald" | "sky" | "amber" | "violet" | "muted" | "indigo" | "rose";
  className?: string;
};

const sourceBadgeToneClasses: Record<NonNullable<SourceBadgeProps["tone"]>, string> = {
  slate: "border-[color:var(--border-default)] bg-[color:var(--bg-muted)] text-stone-700",
  emerald: "border-emerald-300/70 bg-emerald-500/10 text-emerald-800",
  sky: "border-sky-300/70 bg-sky-500/10 text-sky-800",
  amber: "border-amber-300/70 bg-amber-500/10 text-amber-800",
  violet: "border-violet-300/70 bg-violet-500/10 text-violet-800",
  muted: "border-transparent bg-transparent text-stone-500",
  indigo: "border-indigo-300/70 bg-indigo-500/10 text-indigo-800",
  rose: "border-rose-300/70 bg-rose-500/10 text-rose-800",
};

export function SourceBadge({
  children,
  tone = "slate",
  className,
}: SourceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-semibold tracking-wide whitespace-normal",
        sourceBadgeToneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export type ActionCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  badge: string;
  href?: string;
  tone?: CardTone;
  footerLabel?: string;
  className?: string;
  iconClassName?: string;
  iconWrapClassName?: string;
  badgeClassName?: string;
};

export function ActionCard({
  icon: Icon,
  title,
  description,
  badge,
  href,
  tone = "amber",
  footerLabel,
  className,
  iconClassName,
  iconWrapClassName,
  badgeClassName,
}: ActionCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl border bg-white/72 shadow-inner",
            "h-12 w-12",
            iconWrapClassName,
          )}
        >
          <Icon className={cn("h-6 w-6", iconClassName)} />
        </div>

        <SourceBadge
          tone="amber"
          className={cn("shrink-0 border-amber-200 bg-white/72 text-amber-700", badgeClassName)}
        >
          {badge}
        </SourceBadge>
      </div>

      <div className="mt-5 space-y-2">
        <h3 className="text-lg font-black tracking-tight text-stone-950">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-stone-600">
          {description}
        </p>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-stone-950">
        {footerLabel ?? "Ouvrir"}
        <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </>
  );

  const classes = cn(
    "group flex h-full flex-col justify-between rounded-[1.75rem] border p-5 transition-all duration-300 hover:-translate-y-0.5",
    actionToneClasses[tone],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <article className={classes}>{content}</article>;
}
