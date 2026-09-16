import { cn } from "@/lib/utils";
import type { CmmBadgeTone } from "./cmm-badge";

export interface CmmCountBadgeProps {
  count: number;
  max?: number;
  tone?: CmmBadgeTone;
  className?: string;
  accessibleLabel?: string;
}

/**
 * Compteur numérique compact. Il reste décoratif par défaut afin que les
 * changements de polling ne soient pas annoncés comme une live region.
 */
export function CmmCountBadge({
  count,
  max = 99,
  tone = "rose",
  className,
  accessibleLabel,
}: CmmCountBadgeProps) {
  const resolvedCount = Number.isFinite(count) ? count : 0;
  const resolvedMax = Number.isFinite(max) && max >= 0 ? Math.floor(max) : 99;
  const hasAccessibleLabel = accessibleLabel !== undefined;

  if (resolvedCount <= 0) {
    return null;
  }

  const displayCount = resolvedCount > resolvedMax ? `${resolvedMax}+` : resolvedCount;

  return (
    <span
      className={cn("cmm-badge cmm-count-badge", className)}
      data-badge-tone={tone}
      data-badge-size="sm"
      data-badge-shape="pill"
      {...(hasAccessibleLabel
        ? { "aria-label": accessibleLabel }
        : { "aria-hidden": true })}
    >
      {displayCount}
    </span>
  );
}
