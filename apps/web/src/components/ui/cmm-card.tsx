"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardTone = "slate" | "emerald" | "sky" | "amber" | "violet" | "rose";

export interface CmmCardProps {
  children: ReactNode;
  tone?: CardTone;
  variant?: "default" | "elevated" | "muted" | "outlined";
  size?: "sm" | "md" | "lg";
  className?: string;
  header?: ReactNode;
  headerClassName?: string;
  /** Rendre la card cliquable avec curseur pointer et effets hover */
  clickable?: boolean;
  /** Callback quand la card est cliquable */
  onClick?: () => void;
  /** Désactiver la card cliquable */
  disabled?: boolean;
  /** Largeur de contenu optimale (65ch par défaut) */
  prose?: boolean | "narrow" | "wide";
  /** Limiter la description à N lignes */
  lineClamp?: 2 | 3;
}

const toneClasses: Record<CardTone, string> = {
  slate: "border-slate-200/80 bg-white/90 shadow-slate-200/30",
  emerald: "border-emerald-200/80 bg-emerald-50/80 shadow-emerald-100/40",
  sky: "border-sky-200/80 bg-sky-50/80 shadow-sky-100/40",
  amber: "border-amber-200/80 bg-amber-50/80 shadow-amber-100/40",
  violet: "border-violet-200/80 bg-violet-50/80 shadow-violet-100/40",
  rose: "border-rose-200/80 bg-rose-50/80 shadow-rose-100/40",
};

const toneHeaderClasses: Record<CardTone, string> = {
  slate: "border-black/5 bg-white/60",
  emerald: "border-emerald-100/50 bg-emerald-50/60",
  sky: "border-sky-100/50 bg-sky-50/60",
  amber: "border-amber-100/50 bg-amber-50/60",
  violet: "border-violet-100/50 bg-violet-50/60",
  rose: "border-rose-100/50 bg-rose-50/60",
};

const variantClasses = {
  default: "shadow-sm",
  elevated: "shadow-md",
  muted: "shadow-none bg-opacity-60",
  outlined: "shadow-none bg-transparent",
};

const sizeClasses = {
  sm: "rounded-2xl p-4",
  md: "rounded-2xl p-5",
  lg: "rounded-2xl p-6",
};

export function CmmCard({
  children,
  tone = "slate",
  variant = "default",
  size = "md",
  className,
  header,
  headerClassName,
  clickable,
  onClick,
  disabled,
}: CmmCardProps) {
  const clickableClasses = clickable
    ? cn(
        "cmm-clickable cursor-pointer",
        disabled && "cursor-not-allowed opacity-60 pointer-events-none"
      )
    : "";

  const Component = clickable && onClick ? "button" : "section";

  return (
    <Component
      onClick={!disabled ? onClick : undefined}
      disabled={clickable ? disabled : undefined}
      className={cn(
        "overflow-hidden border ring-1 ring-black/5 backdrop-blur-sm text-left",
        toneClasses[tone],
        variantClasses[variant],
        sizeClasses[size],
        clickableClasses,
        className
      )}
    >
      {header ? (
        <>
          <div
            className={cn(
              "-mx-5 -mt-5 mb-4 border-b px-4 py-3",
              size === "sm" && "-mx-4 -mt-4 mb-3",
              size === "lg" && "-mx-6 -mt-6 mb-5 px-5 py-4",
              toneHeaderClasses[tone],
              headerClassName
            )}
          >
            {typeof header === "string" ? (
              <p className="cmm-text-caption font-semibold uppercase tracking-[0.18em] text-muted">
                {header}
              </p>
            ) : (
              header
            )}
          </div>
          {children}
        </>
      ) : (
        children
      )}
    </Component>
  );
}

// Shell de page canonique
export interface CmmPageShellProps {
  children: ReactNode;
  className?: string;
}

export function CmmPageShell({ children, className }: CmmPageShellProps) {
  return (
    <div
      className={cn(
        "space-y-4",
        className
      )}
    >
      {children}
    </div>
  );
}
