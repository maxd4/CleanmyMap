"use client";

import type { ComponentProps } from "react";
import { RubriqueCard } from "@/components/ui/rubrique-card";
import { cn } from "@/lib/utils";
import { usePageFamily } from "@/lib/ui/page-families/use-page-family";
import type { ResolvedPageFamily } from "@/lib/ui/page-families/types";

type FamilyRubriqueCardProps = Omit<ComponentProps<typeof RubriqueCard>, "themeColor"> & {
  /** Si omis, résolu via le pathname courant. */
  family?: ResolvedPageFamily;
  /** true = n'applique pas le shell famille (escape hatch). */
  disableFamilyShell?: boolean;
};

/**
 * RubriqueCard branchée sur le registre page-families (cartes par bloc).
 * Préférer ce composant aux `!bg-[linear-gradient…]` inline sur les routes migrées.
 */
export function FamilyRubriqueCard({
  family: familyProp,
  disableFamilyShell = false,
  className,
  withHover = true,
  ...props
}: FamilyRubriqueCardProps) {
  const family = familyProp ?? usePageFamily();
  const card = family.card;

  return (
    <RubriqueCard
      themeColor={card.rubriqueTheme}
      className={cn(
        !disableFamilyShell && [
          card.shell,
          withHover && card.shellHover,
          "p-8",
        ],
        disableFamilyShell &&
          "rounded-[2.5rem] border border-white/10 bg-black/30 backdrop-blur-3xl p-8 shadow-2xl",
        className,
      )}
      withHover={withHover && !disableFamilyShell}
      {...props}
    />
  );
}
