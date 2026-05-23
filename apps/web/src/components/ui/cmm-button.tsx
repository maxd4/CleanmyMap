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
 type?:"button" |"submit" |"reset";
 asChild?: boolean;
}

const toneClasses: Record<ButtonTone, string> = {
 primary:
"border-emerald-200/80 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-300 focus-visible:ring-emerald-500/40",
 secondary:
"border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50/80 hover:border-slate-300 focus-visible:ring-slate-500/30",
 tertiary:
"border-transparent bg-transparent text-slate-600 hover:bg-slate-50/60 hover:text-slate-800 focus-visible:ring-slate-500/20",
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
 <Link href={href} className={classes} aria-label={ariaLabel}>
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
