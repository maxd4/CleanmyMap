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
 slate:"border-slate-200/80 bg-slate-50/80 cmm-text-secondary",
 emerald:"border-emerald-200/80 bg-emerald-50/80 text-emerald-800",
 sky:"border-sky-200/80 bg-sky-50/80 text-sky-800",
 amber:"border-amber-200/80 bg-amber-50/80 text-amber-800",
 violet:"border-violet-200/80 bg-violet-50/80 text-violet-800",
 muted:"border-transparent bg-transparent cmm-text-muted",
};

const sizeClasses: Record<PillSize, string> = {
 sm:"px-2 py-0.5 cmm-text-caption",
 md:"px-2.5 py-1 cmm-text-caption",
};

const baseClasses =
"inline-flex items-center rounded-full border font-semibold tracking-wide whitespace-nowrap";

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
