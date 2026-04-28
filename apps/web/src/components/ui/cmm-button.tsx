"use client";

import Link from"next/link";
import type { ReactNode } from"react";
import { cn } from"@/lib/utils";

export type ButtonTone ="primary" |"secondary" |"muted";
export type ButtonSize ="sm" |"md" |"lg";
export type ButtonVariant ="default" |"pill" |"ghost";

export interface CmmButtonProps {
 children: ReactNode;
 href?: string;
 onClick?: () => void;
 tone?: ButtonTone;
 size?: ButtonSize;
 variant?: ButtonVariant;
 className?: string;
 disabled?: boolean;
 ariaLabel?: string;
 type?:"button" |"submit" |"reset";
}

const toneClasses: Record<ButtonTone, string> = {
 primary:
 "border-emerald-500/40 bg-emerald-600 text-white hover:bg-emerald-500 hover:border-emerald-400 focus-visible:ring-emerald-500/40",
 secondary:
 "border-slate-800 bg-slate-900 cmm-text-primary hover:bg-slate-800 hover:border-slate-700 focus-visible:ring-slate-500/30",
 muted:
 "border-transparent bg-transparent cmm-text-secondary hover:bg-white/5 hover:cmm-text-primary focus-visible:ring-slate-500/20",
};

const sizeClasses: Record<ButtonSize, string> = {
 sm:"px-2.5 py-1.5 cmm-text-caption",
 md:"px-3 py-2 cmm-text-small",
 lg:"px-4 py-2.5 cmm-text-small",
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
}: CmmButtonProps) {
 const classes = cn(
 baseClasses,
 toneClasses[tone],
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
