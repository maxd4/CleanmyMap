import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CmmGridSpan = {
  mobile?: number;
  tablet?: number;
  desktop?: number;
};

export type CmmGridProps = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  overlay?: boolean;
  as?: ElementType;
};

export type CmmGridItemProps = {
  children?: ReactNode;
  className?: string;
  span?: CmmGridSpan;
  as?: ElementType;
};

function clampSpan(value: number | undefined, fallback: number, max: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), 1), max);
}

function buildSpanStyle(span: CmmGridSpan | undefined): CSSProperties {
  const mobile = clampSpan(span?.mobile, 4, 4);
  const tablet = clampSpan(span?.tablet, 6, 6);
  const desktop = clampSpan(span?.desktop, 12, 12);

  return {
    "--cmm-grid-span-mobile": mobile,
    "--cmm-grid-span-tablet": tablet,
    "--cmm-grid-span-desktop": desktop,
  } as CSSProperties;
}

export function CmmGrid({
  children,
  className,
  contentClassName,
  overlay = false,
  as: Component = "div",
}: CmmGridProps) {
  return (
    <Component className={cn("cmm-grid-shell", className)}>
      <div className={cn("cmm-grid-layout", contentClassName)}>{children}</div>

      {overlay ? <div aria-hidden="true" className="cmm-grid-overlay" /> : null}
    </Component>
  );
}

export function CmmGridItem({
  children,
  className,
  span,
  as: Component = "div",
}: CmmGridItemProps) {
  return (
    <Component className={cn("cmm-grid-span", className)} style={buildSpanStyle(span)}>
      {children}
    </Component>
  );
}

export function createGridSpan(span: CmmGridSpan = {}) {
  return buildSpanStyle(span);
}
