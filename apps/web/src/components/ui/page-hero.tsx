"use client";

import type { ReactNode } from "react";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import type { PageHeaderProps } from "@/components/ui/page-header";
import type { ResolvedPageFamily } from "@/lib/ui/page-families";

export type PageHeroTitleSize = "default" | "compact" | "display";

export type PageHeroProps = Omit<PageHeaderProps, "badge"> & {
  /** Compatibilité historique. Désormais sans effet sur la taille. */
  titleSize?: PageHeroTitleSize;
  badgesClassName?: string;
};

export function PageHero({
  titleSize: _titleSize = "default",
  badgesClassName,
  ...props
}: PageHeroProps) {
  return <PageHeader {...props} badgesClassName={badgesClassName} />;
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
  return (
    <PageHeaderBadge family={family} muted={muted}>
      {children}
    </PageHeaderBadge>
  );
}
