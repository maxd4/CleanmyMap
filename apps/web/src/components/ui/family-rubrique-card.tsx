"use client";

import type { ComponentProps } from "react";
import { RubriqueCard } from "@/components/ui/rubrique-card";
import { usePageFamily } from "@/lib/ui/page-families/use-page-family";
import type { ResolvedPageFamily } from "@/lib/ui/page-families/types";

type FamilyRubriqueCardProps = Omit<ComponentProps<typeof RubriqueCard>, "themeColor" | "surfaceKind"> & {
  /** Si omis, résolu via le pathname courant. */
  family?: ResolvedPageFamily;
};

/**
 * RubriqueCard branchée sur le registre page-families (cartes par bloc).
 * Préférer ce composant aux `!bg-[linear-gradient…]` inline sur les routes migrées.
 */
export function FamilyRubriqueCard({
  family: familyProp,
  className,
  ...props
}: FamilyRubriqueCardProps) {
  const resolvedFamily = usePageFamily();
  const family = familyProp ?? resolvedFamily;
  const card = family.card;

  return (
    <RubriqueCard
      themeColor={card.rubriqueTheme}
      surfaceKind={card.surfaceKind}
      className={className}
      {...props}
    />
  );
}
