"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  resolvePageFamily,
  type ResolvedPageFamily,
} from "@/lib/ui/page-families";

export type PageHeaderTone =
  | "emerald"
  | "sky"
  | "red"
  | "pink"
  | "indigo"
  | "yellow"
  | "slate"
  | "stone";

export type PageHeaderContrast = "default" | "inverse";

type PageHeaderTokens = {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeMuted: string;
};

const TONE_TOKENS: Record<PageHeaderTone, PageHeaderTokens> = {
  emerald: {
    eyebrow: "cmm-page-header-eyebrow text-emerald-900/85",
    title: "cmm-page-header-title text-stone-950",
    subtitle: "cmm-page-header-subtitle text-stone-800/90",
    badge: "cmm-page-header-badge border-emerald-200/35 bg-emerald-50/70 text-emerald-950",
    badgeMuted:
      "cmm-page-header-badge-muted border-emerald-200/25 bg-emerald-50/35 text-emerald-900/90",
  },
  sky: {
    eyebrow: "cmm-page-header-eyebrow text-sky-950/85",
    title: "cmm-page-header-title text-stone-950",
    subtitle: "cmm-page-header-subtitle text-stone-800/90",
    badge: "cmm-page-header-badge border-sky-200/35 bg-sky-50/70 text-sky-950",
    badgeMuted:
      "cmm-page-header-badge-muted border-sky-200/25 bg-sky-50/35 text-sky-900/90",
  },
  red: {
    eyebrow: "cmm-page-header-eyebrow text-rose-950/85",
    title: "cmm-page-header-title text-stone-950",
    subtitle: "cmm-page-header-subtitle text-stone-800/90",
    badge: "cmm-page-header-badge border-rose-200/35 bg-rose-50/70 text-rose-950",
    badgeMuted:
      "cmm-page-header-badge-muted border-rose-200/25 bg-rose-50/35 text-rose-900/90",
  },
  pink: {
    eyebrow: "cmm-page-header-eyebrow text-pink-950/85",
    title: "cmm-page-header-title text-stone-950",
    subtitle: "cmm-page-header-subtitle text-stone-800/90",
    badge: "cmm-page-header-badge border-pink-200/35 bg-pink-50/70 text-pink-950",
    badgeMuted:
      "cmm-page-header-badge-muted border-pink-200/25 bg-pink-50/35 text-pink-900/90",
  },
  indigo: {
    eyebrow: "cmm-page-header-eyebrow text-indigo-950/85",
    title: "cmm-page-header-title text-stone-950",
    subtitle: "cmm-page-header-subtitle text-stone-800/90",
    badge: "cmm-page-header-badge border-indigo-200/35 bg-indigo-50/70 text-indigo-950",
    badgeMuted:
      "cmm-page-header-badge-muted border-indigo-200/25 bg-indigo-50/35 text-indigo-900/90",
  },
  yellow: {
    eyebrow: "cmm-page-header-eyebrow text-amber-950/85",
    title: "cmm-page-header-title text-stone-950",
    subtitle: "cmm-page-header-subtitle text-stone-800/90",
    badge: "cmm-page-header-badge border-amber-200/35 bg-amber-50/70 text-amber-950",
    badgeMuted:
      "cmm-page-header-badge-muted border-amber-200/25 bg-amber-50/35 text-amber-900/90",
  },
  slate: {
    eyebrow: "cmm-page-header-eyebrow text-slate-700/85",
    title: "cmm-page-header-title text-slate-950",
    subtitle: "cmm-page-header-subtitle text-slate-700/90",
    badge: "cmm-page-header-badge border-slate-200/80 bg-slate-50/80 text-slate-800",
    badgeMuted:
      "cmm-page-header-badge-muted border-slate-200/70 bg-white/70 text-slate-700",
  },
  stone: {
    eyebrow: "cmm-page-header-eyebrow text-stone-700/85",
    title: "cmm-page-header-title text-stone-950",
    subtitle: "cmm-page-header-subtitle text-stone-700/90",
    badge: "cmm-page-header-badge border-stone-200/80 bg-stone-50/80 text-stone-800",
    badgeMuted:
      "cmm-page-header-badge-muted border-stone-200/70 bg-white/70 text-stone-700",
  },
};

const INVERSE_TONE_TOKENS: Record<PageHeaderTone, PageHeaderTokens> = {
  emerald: {
    eyebrow: "cmm-page-header-eyebrow text-emerald-100/85",
    title: "cmm-page-header-title text-white",
    subtitle: "cmm-page-header-subtitle text-white/78",
    badge: "cmm-page-header-badge border-emerald-300/[0.22] bg-white/[0.08] text-white",
    badgeMuted:
      "cmm-page-header-badge-muted border-white/[0.12] bg-white/[0.06] text-white/78",
  },
  sky: {
    eyebrow: "cmm-page-header-eyebrow text-sky-100/85",
    title: "cmm-page-header-title text-white",
    subtitle: "cmm-page-header-subtitle text-white/78",
    badge: "cmm-page-header-badge border-sky-300/[0.22] bg-white/[0.08] text-white",
    badgeMuted:
      "cmm-page-header-badge-muted border-white/[0.12] bg-white/[0.06] text-white/78",
  },
  red: {
    eyebrow: "cmm-page-header-eyebrow text-rose-100/85",
    title: "cmm-page-header-title text-white",
    subtitle: "cmm-page-header-subtitle text-white/78",
    badge: "cmm-page-header-badge border-rose-300/[0.22] bg-white/[0.08] text-white",
    badgeMuted:
      "cmm-page-header-badge-muted border-white/[0.12] bg-white/[0.06] text-white/78",
  },
  pink: {
    eyebrow: "cmm-page-header-eyebrow text-pink-100/85",
    title: "cmm-page-header-title text-white",
    subtitle: "cmm-page-header-subtitle text-white/78",
    badge: "cmm-page-header-badge border-pink-300/[0.22] bg-white/[0.08] text-white",
    badgeMuted:
      "cmm-page-header-badge-muted border-white/[0.12] bg-white/[0.06] text-white/78",
  },
  indigo: {
    eyebrow: "cmm-page-header-eyebrow text-indigo-100/85",
    title: "cmm-page-header-title text-white",
    subtitle: "cmm-page-header-subtitle text-white/78",
    badge: "cmm-page-header-badge border-indigo-300/[0.22] bg-white/[0.08] text-white",
    badgeMuted:
      "cmm-page-header-badge-muted border-white/[0.12] bg-white/[0.06] text-white/78",
  },
  yellow: {
    eyebrow: "cmm-page-header-eyebrow text-amber-100/85",
    title: "cmm-page-header-title text-white",
    subtitle: "cmm-page-header-subtitle text-white/78",
    badge: "cmm-page-header-badge border-amber-300/[0.22] bg-white/[0.08] text-white",
    badgeMuted:
      "cmm-page-header-badge-muted border-white/[0.12] bg-white/[0.06] text-white/78",
  },
  slate: {
    eyebrow: "cmm-page-header-eyebrow text-slate-100/85",
    title: "cmm-page-header-title text-white",
    subtitle: "cmm-page-header-subtitle text-white/78",
    badge: "cmm-page-header-badge border-slate-300/[0.22] bg-white/[0.08] text-white",
    badgeMuted:
      "cmm-page-header-badge-muted border-white/[0.12] bg-white/[0.06] text-white/78",
  },
  stone: {
    eyebrow: "cmm-page-header-eyebrow text-stone-100/85",
    title: "cmm-page-header-title text-white",
    subtitle: "cmm-page-header-subtitle text-white/78",
    badge: "cmm-page-header-badge border-stone-300/[0.22] bg-white/[0.08] text-white",
    badgeMuted:
      "cmm-page-header-badge-muted border-white/[0.12] bg-white/[0.06] text-white/78",
  },
};

function resolveTokens({
  family,
  tone,
  contrast = "default",
}: {
  family?: ResolvedPageFamily;
  tone?: PageHeaderTone;
  contrast?: PageHeaderContrast;
}): PageHeaderTokens {
  if (contrast === "inverse") {
    return tone ? INVERSE_TONE_TOKENS[tone] : INVERSE_TONE_TOKENS.stone;
  }

  if (family) {
    return {
      eyebrow: family.hero.eyebrow,
      title: family.hero.title,
      subtitle: family.hero.subtitle,
      badge: family.hero.badge,
      badgeMuted: family.hero.badgeMuted,
    };
  }

  return tone ? TONE_TOKENS[tone] : TONE_TOKENS.stone;
}

export type PageHeaderProps = {
  /** Si omis, résolu via le pathname courant. */
  family?: ResolvedPageFamily;
  /** Variante de couleur pour les headers non rattachés à une famille de page. */
  tone?: PageHeaderTone;
  /** Inverse le contraste pour les surfaces sombres. */
  contrast?: PageHeaderContrast;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
  badgesClassName?: string;
  actionClassName?: string;
};

export function PageHeader({
  family: familyProp,
  tone,
  eyebrow,
  badge,
  badges,
  title,
  subtitle,
  action,
  align = "left",
  contrast = "default",
  className,
  badgesClassName,
  actionClassName,
}: PageHeaderProps) {
  const pathname = usePathname();
  const family = familyProp ?? (tone ? undefined : resolvePageFamily(pathname));
  const tokens = resolveTokens({ family, tone, contrast });
  const isCenter = align === "center";

  return (
    <header
      className={cn(
        "cmm-page-header",
        isCenter ? "cmm-page-header--center" : "cmm-page-header--left",
        className,
      )}
    >
      {eyebrow || badge || badges ? (
        <div className={cn("cmm-page-header-badges", badgesClassName)}>
          {eyebrow ? <span className={tokens.eyebrow}>{eyebrow}</span> : null}
          {badge ? badge : null}
          {badges ? badges : null}
        </div>
      ) : null}

      <div
        className={cn(
          "flex w-full flex-col gap-4",
          isCenter ? "items-center" : "items-start",
          action ? "sm:flex-row sm:items-start sm:justify-between" : null,
        )}
      >
        <div
          className={cn(
            "min-w-0",
            action ? "flex-1" : "w-full",
            isCenter ? "text-center" : null,
          )}
        >
          <h1 className={tokens.title}>{title}</h1>

          {subtitle ? <p className={tokens.subtitle}>{subtitle}</p> : null}
        </div>

        {action ? (
          <div className={cn("cmm-page-header-action shrink-0", actionClassName)}>
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function PageHeaderBadge({
  children,
  muted = false,
  family,
  tone,
  contrast = "default",
}: {
  children: ReactNode;
  muted?: boolean;
  family?: ResolvedPageFamily;
  tone?: PageHeaderTone;
  contrast?: PageHeaderContrast;
}) {
  const pathname = usePathname();
  const resolvedFamily = family ?? (tone ? undefined : resolvePageFamily(pathname));
  const tokens = resolveTokens({ family: resolvedFamily, tone, contrast });
  return <span className={muted ? tokens.badgeMuted : tokens.badge}>{children}</span>;
}
