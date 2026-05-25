"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  resolvePageFamily,
  type ResolvedPageFamily,
} from "@/lib/ui/page-families";

export type PageHeroTitleSize = "default" | "compact" | "display";

export type PageHeroProps = {
  /** Si omis, résolu via le pathname courant. */
  family?: ResolvedPageFamily;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  titleSize?: PageHeroTitleSize;
  className?: string;
  badgesClassName?: string;
};

export function PageHero({
  family: familyProp,
  eyebrow,
  title,
  subtitle,
  badges,
  titleSize = "default",
  className,
  badgesClassName,
}: PageHeroProps) {
  const pathname = usePathname();
  const family = familyProp ?? resolvePageFamily(pathname);
  const hero = family.hero;

  const titleClass =
    titleSize === "display"
      ? hero.title
      : titleSize === "compact"
        ? hero.titleCompact
        : hero.title;

  return (
    <header className={cn("space-y-4", className)}>
      {badges ? (
        <div className={cn("flex flex-wrap items-center gap-2", badgesClassName)}>
          {badges}
        </div>
      ) : null}
      {eyebrow ? <p className={hero.eyebrow}>{eyebrow}</p> : null}
      <h1 className={titleClass}>{title}</h1>
      {subtitle ? <p className={hero.subtitle}>{subtitle}</p> : null}
    </header>
  );
}

export function PageHeroBadge({
  children,
  muted = false,
  family,
}: {
  children: ReactNode;
  muted?: boolean;
  family?: ResolvedPageFamily;
}) {
  const pathname = usePathname();
  const hero = (family ?? resolvePageFamily(pathname)).hero;
  return <span className={muted ? hero.badgeMuted : hero.badge}>{children}</span>;
}
