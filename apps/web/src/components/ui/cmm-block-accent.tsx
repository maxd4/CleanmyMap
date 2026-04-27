"use client";

import { cn } from"@/lib/utils";
import {
 type BlockAccent,
 type BlockId,
 getAccentClasses,
 getBlockAccent,
 getBlockClasses,
} from"@/lib/ui/block-accents";

export type AccentElement ="dot" |"bar" |"ring" |"gradient";

export interface CmmBlockAccentProps {
 /** Accent à utiliser (direct) */
 accent?: BlockAccent;
 /** Bloc pour dériver l'accent (alternative) */
 blockId?: BlockId;
 /** Type d'élément d'accent */
 element?: AccentElement;
 /** Position de la barre (si element='bar') */
 barPosition?:"left" |"right" |"top" |"bottom";
 /** Taille du dot (si element='dot') */
 dotSize?:"sm" |"md" |"lg";
 /** Appliquer l'accent au survol uniquement */
 hoverOnly?: boolean;
 /** Classes additionnelles */
 className?: string;
 /** Contenu enfant (optionnel) */
 children?: React.ReactNode;
}

/**
 * CmmBlockAccent - Élément d'accent par bloc
 *
 * Règles de la charte:
 * - Accent = 1 des 4 éléments max: dot, bar, ring, gradient
 * - Interdit: glow permanent, blur sur texte, gradients saturés
 * - Gradient subtil: 5-10% max
 *
 * Usage:
 * <CmmBlockAccent accent="emerald" element="dot" />
 * <CmmBlockAccent blockId="impact" element="bar" barPosition="left" />
 * <CmmCard accent="sky">...</CmmCard>
 */
export function CmmBlockAccent({
 accent: accentProp,
 blockId,
 element ="dot",
 barPosition ="left",
 dotSize ="md",
 hoverOnly = false,
 className,
 children,
}: CmmBlockAccentProps) {
 const accentKey: BlockAccent = accentProp ?? (blockId ? getBlockAccent(blockId) :"emerald");

 if (!accentProp && !blockId) {
 console.warn("CmmBlockAccent: either accent or blockId must be provided");
 return null;
 }

 const classes = getAccentClasses(accentKey);

 // Dot - petit cercle indicatif
 if (element ==="dot") {
 const sizeClasses = {
 sm:"h-1.5 w-1.5",
 md:"h-2 w-2",
 lg:"h-2.5 w-2.5",
 }[dotSize];

 return (
 <span
 className={cn(
"inline-block rounded-full",
 sizeClasses,
 classes.dot,
 hoverOnly &&"opacity-60",
 hoverOnly &&"group-hover:opacity-100",
 className
 )}
 />
 );
 }

 // Bar - barre latérale sur cards
 if (element ==="bar") {
 const positionClasses = {
 left:"absolute left-0 top-0 bottom-0 w-1 rounded-l",
 right:"absolute right-0 top-0 bottom-0 w-1 rounded-r",
 top:"absolute top-0 left-0 right-0 h-1 rounded-t",
 bottom:"absolute bottom-0 left-0 right-0 h-1 rounded-b",
 }[barPosition];

 return (
 <span
 className={cn(
 positionClasses,
 classes.dot, // utilise la couleur du dot pour la barre
 hoverOnly &&"opacity-0",
 hoverOnly &&"group-hover:opacity-100",
"transition-opacity",
 className
 )}
 />
 );
 }

 // Ring - anneau léger pour focus/hover
 if (element ==="ring") {
 return (
 <span
 className={cn(
"absolute inset-0 rounded-inherit ring-2",
 classes.ring,
"ring-opacity-0",
 !hoverOnly &&"focus-within:ring-opacity-100",
"group-hover:ring-opacity-50",
"transition-all",
 className
 )}
 />
 );
 }

 // Gradient - gradient subtil (5-10% max)
 if (element ==="gradient") {
 return (
 <span
 className={cn(
"absolute inset-0 opacity-[0.05]",
"bg-gradient-to-br",
 accentKey ==="slate" &&"from-slate-400 to-transparent",
 accentKey ==="amber" &&"from-amber-400 to-transparent",
 accentKey ==="sky" &&"from-sky-400 to-transparent",
 accentKey ==="emerald" &&"from-emerald-400 to-transparent",
 accentKey ==="violet" &&"from-violet-400 to-transparent",
 accentKey ==="rose" &&"from-rose-400 to-transparent",
 accentKey ==="indigo" &&"from-indigo-400 to-transparent",
 hoverOnly &&"opacity-0",
 hoverOnly &&"group-hover:opacity-[0.05]",
"transition-opacity",
 className
 )}
 />
 );
 }

 return children ?? null;
}

/**
 * Hook pour récupérer l'accent du bloc courant
 * Usage dans les composants de page/rubrique
 */
export function useBlockAccent(blockId: BlockId) {
 return {
 accent: getBlockClasses(blockId),
 accentKey: blockId,
 classes: getBlockClasses(blockId),
 };
}

/**
 * Wrapper de card avec accent de bloc
 */
export interface CmmBlockCardProps {
 blockId: BlockId;
 children: React.ReactNode;
 className?: string;
 /** Type d'accent visuel */
 accentType?:"bar" |"ring" |"dot" |"gradient" |"none";
 /** Position de la barre si accentType='bar' */
 barPosition?:"left" |"right" |"top" |"bottom";
}

export function CmmBlockCard({
 blockId,
 children,
 className,
 accentType ="bar",
 barPosition ="left",
}: CmmBlockCardProps) {
 const accent = getBlockClasses(blockId);

 return (
 <div
 className={cn(
"relative overflow-hidden rounded-2xl border p-5",
 accent.surface,
 accent.border,
"shadow-sm",
 className
 )}
 >
 {/* Accent visuel selon le type */}
 {accentType ==="bar" && (
 <CmmBlockAccent
 accent={blockId ==="home" ?"slate" :
 blockId ==="act" ?"amber" :
 blockId ==="visualize" ?"sky" :
 blockId ==="impact" ?"emerald" :
 blockId ==="network" ?"violet" :
 blockId ==="learn" ?"rose" :"indigo"}
 element="bar"
 barPosition={barPosition}
 />
 )}
 {accentType ==="dot" && (
 <div className="absolute right-5 top-5">
 <CmmBlockAccent
 accent={blockId ==="home" ?"slate" :
 blockId ==="act" ?"amber" :
 blockId ==="visualize" ?"sky" :
 blockId ==="impact" ?"emerald" :
 blockId ==="network" ?"violet" :
 blockId ==="learn" ?"rose" :"indigo"}
 element="dot"
 />
 </div>
 )}
 {accentType ==="ring" && (
 <CmmBlockAccent
 accent={blockId ==="home" ?"slate" :
 blockId ==="act" ?"amber" :
 blockId ==="visualize" ?"sky" :
 blockId ==="impact" ?"emerald" :
 blockId ==="network" ?"violet" :
 blockId ==="learn" ?"rose" :"indigo"}
 element="ring"
 />
 )}
 {accentType ==="gradient" && (
 <CmmBlockAccent
 accent={blockId ==="home" ?"slate" :
 blockId ==="act" ?"amber" :
 blockId ==="visualize" ?"sky" :
 blockId ==="impact" ?"emerald" :
 blockId ==="network" ?"violet" :
 blockId ==="learn" ?"rose" :"indigo"}
 element="gradient"
 />
 )}

 {children}
 </div>
 );
}
