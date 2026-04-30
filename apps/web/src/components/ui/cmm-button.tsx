"use client";

import Link from"next/link";
import type { ReactElement, ReactNode } from"react";
import { isValidElement, cloneElement } from"react";
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
 asChild?: boolean;
}

const toneClasses: Record<ButtonTone, string> = {
  primary:
 "border-emerald-300/45 bg-[color:var(--action-primary-bg)] text-[color:var(--action-primary-text)] hover:bg-[color:var(--action-primary-hover)] hover:border-cyan-300/60 focus-visible:ring-cyan-300/40",
  secondary:
 "border-[color:var(--border-default)] bg-[color:var(--action-secondary-bg)] cmm-text-primary hover:bg-[color:var(--action-secondary-hover)] hover:border-[color:var(--border-strong)] focus-visible:ring-cyan-300/30",
  muted:
 "border-transparent bg-transparent cmm-text-secondary hover:bg-cyan-300/12 hover:cmm-text-primary focus-visible:ring-cyan-300/22",
};

const sizeClasses: Record<ButtonSize, string> = {
 sm:"px-2.5 py-1.5 cmm-text-caption",
 md:"px-3 py-2 cmm-text-small",
 lg:"px-4 py-2.5 cmm-text-small",
};

const variantClasses: Record<ButtonVariant, string> = {
 default:"rounded-xl",
 pill:"rounded-2xl",
 ghost:"rounded-xl shadow-none border-transparent",
};

const baseClasses =
"cmm-interactive inline-flex min-h-11 items-center justify-center gap-1.5 border font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--bg-canvas)] disabled:opacity-50 disabled:cursor-not-allowed";

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
