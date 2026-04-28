"use client";

import type { ReactNode } from"react";
import { cn } from"@/lib/utils";
import { motion } from "framer-motion";

export type CardTone ="slate" |"emerald" |"sky" |"amber" |"violet" |"rose" |"indigo";

export interface CmmCardProps {
 children: ReactNode;
 tone?: CardTone;
 variant?:"default" |"elevated" |"muted" |"outlined";
 size?:"sm" |"md" |"lg";
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
 prose?: boolean |"narrow" |"wide";
 /** Limiter la description à N lignes */
 lineClamp?: 2 | 3;
 /** Animation d'entrée personnalisée */
 animateEntrance?: boolean;
 /** Label accessible pour la card cliquable */
 ariaLabel?: string;
}

const toneClasses: Record<CardTone, string> = {
 slate: "border-slate-800/60 bg-slate-900/80 dark:bg-slate-900/90 dark:border-slate-800/80 shadow-slate-950/30",
 emerald: "border-emerald-800/60 bg-emerald-950/40 dark:bg-emerald-950/60 dark:border-emerald-800/80 shadow-emerald-950/40",
 sky: "border-sky-800/60 bg-sky-950/40 dark:bg-sky-950/60 dark:border-sky-800/80 shadow-sky-950/40",
 amber: "border-amber-800/60 bg-amber-950/40 dark:bg-amber-950/60 dark:border-amber-800/80 shadow-amber-950/40",
 violet: "border-violet-800/60 bg-violet-950/40 dark:bg-violet-950/60 dark:border-violet-800/80 shadow-violet-950/40",
 rose: "border-rose-800/60 bg-rose-950/40 dark:bg-rose-950/60 dark:border-rose-800/80 shadow-rose-950/40",
 indigo: "border-indigo-800/60 bg-indigo-950/40 dark:bg-indigo-950/60 dark:border-indigo-800/80 shadow-indigo-950/40",
};

const toneHeaderClasses: Record<CardTone, string> = {
 slate: "border-white/5 bg-slate-800/40 dark:bg-slate-800/60 dark:border-slate-700/50",
 emerald: "border-emerald-800/30 bg-emerald-900/20 dark:bg-emerald-900/40 dark:border-emerald-700/50",
 sky: "border-sky-800/30 bg-sky-900/20 dark:bg-sky-900/40 dark:border-sky-700/50",
 amber: "border-amber-800/30 bg-amber-900/20 dark:bg-amber-900/40 dark:border-amber-700/50",
 violet: "border-violet-800/30 bg-violet-900/20 dark:bg-violet-900/40 dark:border-violet-700/50",
 rose: "border-rose-800/30 bg-rose-900/20 dark:bg-rose-900/40 dark:border-rose-700/50",
 indigo: "border-indigo-800/30 bg-indigo-900/20 dark:bg-indigo-900/40 dark:border-indigo-700/50",
};

const variantClasses = {
 default:"shadow-sm",
 elevated:"shadow-md",
 muted:"shadow-none bg-opacity-60",
 outlined:"shadow-none bg-transparent",
};

const sizeClasses = {
 sm:"rounded-2xl p-4",
 md:"rounded-2xl p-5",
 lg:"rounded-2xl p-6",
};

export function CmmCard({
 children,
 tone ="slate",
 variant ="default",
 size ="md",
 className,
 header,
 headerClassName,
 clickable,
 onClick,
 disabled,
 prose,
 lineClamp,
 animateEntrance = false,
 ariaLabel,
}: CmmCardProps) {
 const clickableClasses = clickable
 ? cn(
"cmm-clickable cursor-pointer",
 disabled &&"cursor-not-allowed opacity-60 pointer-events-none"
 )
 :"";

 const proseClass = prose === true
 ?"cmm-prose"
 : prose ==="narrow"
 ?"cmm-prose-narrow"
 : prose ==="wide"
 ?"cmm-prose-wide"
 :"";

 const lineClampClass = lineClamp === 2
 ?"cmm-line-clamp-2"
 : lineClamp === 3
 ?"cmm-line-clamp-3"
 :"";

 return (
 <motion.div
  role={clickable ? "button" : undefined}
  tabIndex={clickable && !disabled ? 0 : undefined}
  aria-label={ariaLabel}
  aria-disabled={disabled}
  onClick={!disabled ? onClick : undefined}
  onKeyDown={(e) => {
    if (clickable && !disabled && onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  }}
  whileHover={clickable && !disabled ? { scale: 1.01, y: -2, transition: { duration: 0.2 } } : {}}
  whileTap={clickable && !disabled ? { scale: 0.99 } : {}}
  initial={animateEntrance ? { opacity: 0, y: 10 } : false}
  animate={animateEntrance ? { opacity: 1, y: 0 } : false}
  className={cn(
"overflow-hidden border ring-1 ring-black/5 backdrop-blur-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
 toneClasses[tone],
 variantClasses[variant],
 sizeClasses[size],
 clickableClasses,
 proseClass,
 lineClampClass,
 className
  )}
 >
 {header ? (
 <>
 <div
 className={cn(
"-mx-5 -mt-5 mb-4 border-b px-4 py-3",
 size ==="sm" &&"-mx-4 -mt-4 mb-3",
 size ==="lg" &&"-mx-6 -mt-6 mb-5 px-5 py-4",
 toneHeaderClasses[tone],
 headerClassName
 )}
 >
 {typeof header ==="string" ? (
 <p className="cmm-text-caption cmm-text-muted font-semibold uppercase tracking-[0.18em]">
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
 </motion.div>
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
