"use client";

import type { ReactNode } from"react";
import { cn } from"@/lib/utils";

export type PillTone ="slate" |"emerald" |"sky" |"amber" |"violet" |"muted";
export type PillSize ="sm" |"md";

export interface CmmPillProps {
 children: ReactNode;
 tone?: PillTone;
 size?: PillSize;
 className?: string;
 uppercase?: boolean;
}

const toneClasses: Record<PillTone, string> = {
 slate:"border-[color:var(--border-default)] bg-[color:var(--bg-muted)] cmm-text-secondary",
 emerald:"border-emerald-300/70 bg-emerald-500/10 text-emerald-800",
 sky:"border-cyan-300/70 bg-cyan-500/10 text-cyan-800",
 amber:"border-amber-300/70 bg-amber-500/10 text-amber-800",
 violet:"border-violet-300/70 bg-violet-500/10 text-violet-800",
 muted:"border-transparent bg-transparent cmm-text-muted",
};

const sizeClasses: Record<PillSize, string> = {
 sm:"px-2 py-0.5 cmm-text-caption",
 md:"px-2.5 py-1 cmm-text-caption",
};

const baseClasses =
"inline-flex items-center rounded-xl border font-semibold tracking-wide whitespace-nowrap";

export function CmmPill({
 children,
 tone ="slate",
 size ="sm",
 className,
 uppercase = true,
}: CmmPillProps) {
 return (
 <span
 className={cn(
 baseClasses,
 toneClasses[tone],
 sizeClasses[size],
 uppercase &&"uppercase",
 className
 )}
 >
 {children}
 </span>
 );
}

// Groupe de pills
export interface CmmPillGroupProps {
 children: ReactNode;
 className?: string;
}

export function CmmPillGroup({ children, className }: CmmPillGroupProps) {
 return (
 <div className={cn("flex flex-wrap items-center gap-2", className)}>
 {children}
 </div>
 );
}
