"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardTone =
  | "slate"
  | "emerald"
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "indigo"
  | "red"
  | "yellow"
  | "pink";

export interface CmmCardProps {
  children: ReactNode;
  as?: "div" | "article" | "section";
  tone?: CardTone;
  variant?: "default" | "elevated" | "muted" | "outlined" | "glass";
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
  /** Label accessible pour la card cliquable */
  ariaLabel?: string;
}

/**
 * Surface de carte canonique.
 *
 * Les couleurs, effets de surface, radius, états et motion sont définis par
 * les tokens/classes `.cmm-card` dans globals.css. Les consommateurs peuvent
 * encore apporter leur layout métier via className, mais ne doivent pas
 * redéfinir le shell visuel de la carte.
 */
export function CmmCard({
  children,
  as = "div",
  tone = "slate",
  variant = "default",
  size = "md",
  className,
  header,
  headerClassName,
  clickable,
  onClick,
  disabled,
  prose,
  lineClamp,
  ariaLabel,
}: CmmCardProps) {
  const CardElement = as;
  const proseClass = prose === true
    ? "cmm-prose"
    : prose === "narrow"
      ? "cmm-prose-narrow"
      : prose === "wide"
        ? "cmm-prose-wide"
        : "";

  const lineClampClass = lineClamp === 2
    ? "cmm-line-clamp-2"
    : lineClamp === 3
      ? "cmm-line-clamp-3"
      : "";

  return (
    <CardElement
      role={clickable ? "button" : undefined}
      tabIndex={clickable && !disabled ? 0 : undefined}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onClick={!disabled ? onClick : undefined}
      onKeyDown={(event) => {
        if (clickable && !disabled && onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      data-cmm-card-tone={tone}
      data-cmm-card-variant={variant}
      data-cmm-card-size={size}
      className={cn(
        "cmm-card",
        clickable && "cmm-card--interactive",
        disabled && "cmm-card--disabled",
        proseClass,
        lineClampClass,
        className,
      )}
    >
      {header ? (
        <>
          <div className={cn("cmm-card__header", headerClassName)}>
            {typeof header === "string" ? (
              <p className="cmm-text-caption font-semibold uppercase tracking-[0.18em]">
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
    </CardElement>
  );
}
