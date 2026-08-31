"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DisclosureTone =
  | "slate"
  | "emerald"
  | "sky"
  | "amber"
  | "rose"
  | "indigo";

export type DisclosureSize = "sm" | "md" | "lg";

export interface CmmDisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  tone?: DisclosureTone;
  size?: DisclosureSize;
  id?: string;
  className?: string;
}

/**
 * Primitive native de divulgation.
 *
 * La sémantique d'ouverture reste celle de `<details>/<summary>` : `open`
 * peut être contrôlé par le consommateur, tandis que `defaultOpen` ne sert
 * qu'à définir l'état initial. Le CSS porte toute la surface visuelle.
 */
export function CmmDisclosure({
  summary,
  children,
  defaultOpen = false,
  open,
  onToggle,
  tone = "slate",
  size = "md",
  id,
  className,
}: CmmDisclosureProps) {
  return (
    <details
      id={id}
      open={open ?? defaultOpen}
      onToggle={(event) => onToggle?.(event.currentTarget.open)}
      data-disclosure-tone={tone}
      data-disclosure-size={size}
      className={cn("cmm-disclosure", className)}
    >
      <summary className="cmm-disclosure__summary">
        <div className="cmm-disclosure__summary-content">{summary}</div>
        <ChevronDown
          aria-hidden="true"
          className="cmm-disclosure__icon"
          focusable="false"
        />
      </summary>
      <div className="cmm-disclosure__content">{children}</div>
    </details>
  );
}
