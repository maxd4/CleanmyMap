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
  titleColor: string;
  subtitleColor: string;
};

const TONE_TOKENS: Record<PageHeaderTone, PageHeaderTokens> = {
  emerald: {
    titleColor: "text-stone-950",
    subtitleColor: "text-stone-800",
  },
  sky: {
    titleColor: "text-stone-950",
    subtitleColor: "text-stone-800",
  },
  red: {
    titleColor: "text-stone-950",
    subtitleColor: "text-stone-800",
  },
  pink: {
    titleColor: "text-stone-950",
    subtitleColor: "text-stone-800",
  },
  indigo: {
    titleColor: "text-stone-950",
    subtitleColor: "text-stone-800",
  },
  yellow: {
    titleColor: "text-stone-950",
    subtitleColor: "text-stone-800",
  },
  slate: {
    titleColor: "text-slate-950",
    subtitleColor: "text-slate-700",
  },
  stone: {
    titleColor: "text-stone-950",
    subtitleColor: "text-stone-700",
  },
};

const INVERSE_TONE_TOKENS: Record<PageHeaderTone, PageHeaderTokens> = {
  emerald: {
    titleColor: "text-white",
    subtitleColor: "text-white",
  },
  sky: {
    titleColor: "text-white",
    subtitleColor: "text-white",
  },
  red: {
    titleColor: "text-white",
    subtitleColor: "text-white",
  },
  pink: {
    titleColor: "text-white",
    subtitleColor: "text-white",
  },
  indigo: {
    titleColor: "text-white",
    subtitleColor: "text-white",
  },
  yellow: {
    titleColor: "text-white",
    subtitleColor: "text-white",
  },
  slate: {
    titleColor: "text-white",
    subtitleColor: "text-white",
  },
  stone: {
    titleColor: "text-white",
    subtitleColor: "text-white",
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
      titleColor: family.hero.titleColor,
      subtitleColor: family.hero.subtitleColor,
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
  title?: ReactNode;
  subtitle?: ReactNode;
  headingLevel?: "h1" | "h2";
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
  actionClassName?: string;
};

export function PageHeader({
  family: familyProp,
  tone,
  title,
  subtitle,
  headingLevel = "h1",
  action,
  align = "center",
  contrast = "default",
  className,
  actionClassName,
}: PageHeaderProps) {
  const pathname = usePathname();
  const resolvedFamily = resolvePageFamily(pathname);
  const family = familyProp ?? (tone ? undefined : resolvedFamily);
  const tokens = resolveTokens({ family, tone, contrast });
  const isCenter = align === "center";
  const Heading = headingLevel;
  const matchesRouteFamily =
    Boolean(family) &&
    contrast === "default" &&
    family?.backdropToneKey === resolvedFamily.backdropToneKey;

  return (
    <header
      data-cmm-family-header={matchesRouteFamily ? family?.backdropToneKey : undefined}
      className={cn(
        "cmm-page-header",
        isCenter ? "cmm-page-header--center" : "cmm-page-header--left",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full flex-col",
          isCenter ? "items-center text-center" : "items-start text-left",
        )}
      >
        <div className="w-full min-w-0">
          {title !== undefined && title !== null ? (
            <Heading className={cn("cmm-page-header-title", tokens.titleColor)}>{title}</Heading>
          ) : null}

          {subtitle ? (
            <p className={cn("cmm-page-header-subtitle", tokens.subtitleColor)}>
              {subtitle}
            </p>
          ) : null}
        </div>

        {action ? (
          <div className={cn("cmm-page-header-action", actionClassName)}>
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}
