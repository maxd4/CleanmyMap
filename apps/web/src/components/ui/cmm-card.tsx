"use client";

import type { ReactNode } from"react";
import { cn } from"@/lib/utils";
import { motion } from "framer-motion";

export type CardTone ="slate" |"emerald" |"sky" |"amber" |"violet" |"rose" |"indigo";

export interface CmmCardProps {
 children: ReactNode;
 tone?: CardTone;
 variant?:"default" |"elevated" |"muted" |"outlined" |"glass";
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
 slate: "border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] shadow-[0_14px_32px_-24px_rgba(47,128,195,0.24)]",
 emerald: "border-emerald-300/35 bg-emerald-500/10 shadow-[0_14px_32px_-24px_rgba(24,182,143,0.22)]",
 sky: "border-cyan-300/35 bg-cyan-500/10 shadow-[0_14px_32px_-24px_rgba(39,195,217,0.22)]",
 amber: "border-amber-300/35 bg-amber-500/10 shadow-[0_14px_32px_-24px_rgba(39,195,217,0.18)]",
 violet: "border-violet-300/35 bg-violet-500/10 shadow-[0_14px_32px_-24px_rgba(91,95,207,0.22)]",
 rose: "border-rose-300/35 bg-rose-500/10 shadow-[0_14px_32px_-24px_rgba(91,95,207,0.18)]",
 indigo: "border-indigo-300/35 bg-indigo-500/10 shadow-[0_14px_32px_-24px_rgba(47,128,195,0.20)]",
};

const toneHeaderClasses: Record<CardTone, string> = {
 slate: "border-[color:var(--border-default)] bg-[color:var(--bg-muted)]",
 emerald: "border-emerald-300/22 bg-emerald-500/8",
 sky: "border-cyan-300/22 bg-cyan-500/8",
 amber: "border-amber-300/22 bg-amber-500/8",
 violet: "border-violet-300/22 bg-violet-500/8",
 rose: "border-rose-300/22 bg-rose-500/8",
 indigo: "border-indigo-300/22 bg-indigo-500/8",
};

const variantClasses = {
 default:"shadow-none",
 elevated:"shadow-[0_18px_44px_-30px_rgba(47,128,195,0.28),0_10px_24px_-20px_rgba(24,182,143,0.16)]",
 muted:"shadow-none bg-opacity-70",
 outlined:"shadow-none bg-transparent",
 glass:"shadow-[0_18px_44px_-30px_rgba(39,195,217,0.22),0_8px_18px_-16px_rgba(91,95,207,0.14)] bg-[color:var(--bg-elevated)]/92 backdrop-blur-sm border-[color:var(--border-strong)]",
};

const sizeClasses = {
 sm:"rounded-xl p-4",
 md:"rounded-xl p-5",
 lg:"rounded-xl p-6",
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
"overflow-hidden border ring-1 ring-cyan-500/8 backdrop-blur-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
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
