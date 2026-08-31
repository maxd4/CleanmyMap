import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CmmBadgeTone =
  | "slate"
  | "emerald"
  | "sky"
  | "amber"
  | "violet"
  | "indigo"
  | "rose"
  | "muted";

export type CmmBadgeSize = "sm" | "md";
export type CmmBadgeShape = "rounded" | "pill";

export interface CmmBadgeProps {
  children: ReactNode;
  tone?: CmmBadgeTone;
  size?: CmmBadgeSize;
  shape?: CmmBadgeShape;
  className?: string;
}

/**
 * Primitive statique pour les labels compacts.
 *
 * Le badge ne porte aucune sémantique interactive ou ARIA implicite : le
 * consommateur conserve la responsabilité du contexte et de son contenu.
 */
export function CmmBadge({
  children,
  tone = "slate",
  size = "sm",
  shape = "rounded",
  className,
}: CmmBadgeProps) {
  return (
    <span
      className={cn("cmm-badge", className)}
      data-badge-tone={tone}
      data-badge-size={size}
      data-badge-shape={shape}
    >
      {children}
    </span>
  );
}
