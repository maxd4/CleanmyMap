"use client";

import Link from"next/link";
import type { ReactElement, ReactNode } from"react";
import { isValidElement, cloneElement } from"react";
import { cn } from"@/lib/utils";

export type ButtonTone ="primary" |"secondary" |"tertiary";
export type ButtonSize ="sm" |"md" |"lg";
export type ButtonVariant ="default" |"pill" |"ghost";

export interface CmmButtonProps {
 children: ReactNode;
 href?: string;
 onClick?: () => void;
 tone?: ButtonTone | "muted";
 size?: ButtonSize;
 variant?: ButtonVariant;
 className?: string;
 disabled?: boolean;
 ariaLabel?: string;
 title?: string;
 type?:"button" |"submit" |"reset";
 asChild?: boolean;
}

const toneClasses: Record<ButtonTone, string> = {
 primary:
"border-[color:var(--cmm-button-primary-border)] bg-[linear-gradient(135deg,var(--cmm-button-primary-bg-start)_0%,var(--cmm-button-primary-bg-end)_100%)] text-[var(--cmm-button-primary-text)] shadow-[0_14px_28px_-18px_rgba(15,23,42,0.20)] hover:border-[color:var(--cmm-button-primary-border-hover)] hover:bg-[linear-gradient(135deg,var(--cmm-button-primary-bg-hover-start)_0%,var(--cmm-button-primary-bg-hover-end)_100%)] focus-visible:ring-[color:var(--cmm-button-primary-ring)]",
 secondary:
"border-[color:var(--cmm-button-secondary-border)] bg-[linear-gradient(135deg,var(--cmm-button-secondary-bg-start)_0%,var(--cmm-button-secondary-bg-end)_100%)] text-[var(--cmm-button-secondary-text)] shadow-[0_12px_24px_-20px_rgba(15,23,42,0.18)] hover:border-[color:var(--cmm-button-secondary-border-hover)] hover:bg-[linear-gradient(135deg,var(--cmm-button-secondary-bg-hover-start)_0%,var(--cmm-button-secondary-bg-hover-end)_100%)] focus-visible:ring-[color:var(--cmm-button-secondary-ring)]",
 tertiary:
"border-[color:var(--cmm-button-tertiary-border)] bg-[linear-gradient(135deg,var(--cmm-button-tertiary-bg-start)_0%,var(--cmm-button-tertiary-bg-end)_100%)] text-[var(--cmm-button-tertiary-text)] shadow-[0_10px_22px_-20px_rgba(15,23,42,0.14)] hover:border-[color:var(--cmm-button-tertiary-border-hover)] hover:bg-[linear-gradient(135deg,var(--cmm-button-tertiary-bg-hover-start)_0%,var(--cmm-button-tertiary-bg-hover-end)_100%)] focus-visible:ring-[color:var(--cmm-button-tertiary-ring)]",
};

const sizeClasses: Record<ButtonSize, string> = {
 sm:"px-2.5 py-1.5 text-xs",
 md:"px-3 py-2 text-sm",
 lg:"px-4 py-2.5 text-sm",
};

const variantClasses: Record<ButtonVariant, string> = {
 default:"rounded-lg",
 pill:"rounded-full",
 ghost:"rounded-lg shadow-none border-transparent",
};

const baseClasses =
"cmm-interactive inline-flex items-center justify-center gap-1.5 border font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white/80 dark:focus-visible:ring-offset-slate-900/80 disabled:opacity-50 disabled:cursor-not-allowed";

export function CmmButton({
 children,
 href,
 onClick,
 tone ="secondary",
 size ="md",
 variant ="default",
 className,
 disabled,
 ariaLabel,
 title,
 type ="button",
 asChild = false,
}: CmmButtonProps) {
 const normalizedTone = tone === "muted" ? "tertiary" : tone;
 const classes = cn(
  baseClasses,
  toneClasses[normalizedTone],
  sizeClasses[size],
  variantClasses[variant],
  className
 );

 if (href) {
 return (
 <Link href={href} className={classes} aria-label={ariaLabel} title={title}>
 {children}
 </Link>
 );
 }

 if (asChild && isValidElement(children)) {
   const child = children as ReactElement<{ className?: string; onClick?: () => void }>;
   return cloneElement(child, {
     className: cn(classes, child.props.className),
     onClick,
   });
 }

 return (
 <button
 type={type}
 onClick={onClick}
 disabled={disabled}
 className={classes}
 aria-label={ariaLabel}
 title={title}
 >
 {children}
 </button>
 );
}

// Groupe de boutons
export interface CmmButtonGroupProps {
 children: ReactNode;
 className?: string;
}

export function CmmButtonGroup({ children, className }: CmmButtonGroupProps) {
 return (
 <div className={cn("flex flex-wrap items-center gap-2", className)}>
 {children}
 </div>
 );
}
