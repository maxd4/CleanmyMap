"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CmmIconSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface CmmIconProps {
  icon: LucideIcon;
  size?: CmmIconSize;
  className?: string;
  label?: string;
}

const sizeClasses: Record<CmmIconSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-7 w-7",
};

/** Icône Lucide standardisée, sans sémantique informative implicite. */
export function CmmIcon({
  icon: Icon,
  size = "md",
  className,
  label,
}: CmmIconProps) {
  const isDecorative = !label;

  return (
    <Icon
      className={cn("shrink-0", sizeClasses[size], className)}
      data-cmm-icon-size={size}
      aria-hidden={isDecorative ? true : undefined}
      role={isDecorative ? undefined : "img"}
      aria-label={label}
      focusable="false"
    />
  );
}
