"use client";

import { cn } from "@/lib/utils";
import {
  type BlockAccent,
  type BlockId,
  getAccentClasses,
  getBlockAccent,
  getBlockClasses,
} from "@/lib/ui/block-accents";

export type AccentElement = "dot" | "bar" | "ring" | "gradient" | "glow";

export interface CmmBlockAccentProps {
  /** Accent à utiliser (direct) */
  accent?: BlockAccent;
  /** Section pour dériver l'accent (alternative) */
  blockId?: BlockId;
  /** Type d'élément d'accent */
  element?: AccentElement;
  /** Position de la barre (si element='bar') */
  barPosition?: "left" | "right" | "top" | "bottom";
  /** Taille du dot (si element='dot') */
  dotSize?: "sm" | "md" | "lg";
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
 * Charte officielle:
 * - Accueil   : amber   (Orange)
 * - Agir      : emerald (Vert)
 * - Visualiser: sky     (Bleu ciel)
 * - Impact    : red     (Rouge)
 * - Réseau    : indigo  (Indigo/Violet)
 * - Discussion: pink    (Rose)
 * - Apprendre : yellow  (Jaune)
 * - Piloter   : amber   (Brun)
 *
 * Règles de la charte:
 * - Accent = 1 des 4 éléments max: dot, bar, ring, gradient, glow
 * - Interdit: glow permanent aggressif, blur sur texte
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
  element = "dot",
  barPosition = "left",
  dotSize = "md",
  hoverOnly = false,
  className,
  children,
}: CmmBlockAccentProps) {
  const accentKey: BlockAccent = accentProp ?? (blockId ? getBlockAccent(blockId) : "emerald");

  if (!accentProp && !blockId) {
    console.warn("CmmBlockAccent: either accent or blockId must be provided");
    return null;
  }

  const classes = getAccentClasses(accentKey);

  // Dot - petit cercle indicatif avec micro-glow
  if (element === "dot") {
    const sizeClasses = {
      sm: "h-1.5 w-1.5",
      md: "h-2 w-2",
      lg: "h-2.5 w-2.5",
    }[dotSize];

    return (
      <span
        className={cn(
          "relative inline-block rounded-full transition-all duration-300",
          sizeClasses,
          classes.dot,
          classes.glow,
          hoverOnly && "opacity-60",
          hoverOnly && "group-hover:opacity-100",
          className
        )}
      >
        <span className={cn("absolute inset-0 rounded-full animate-pulse opacity-40", classes.dot)} />
      </span>
    );
  }

  // Bar - barre latérale sur cards avec glow
  if (element === "bar") {
    const positionClasses = {
      left: "absolute left-0 top-0 bottom-0 w-1 rounded-r-sm",
      right: "absolute right-0 top-0 bottom-0 w-1 rounded-l-sm",
      top: "absolute top-0 left-0 right-0 h-1 rounded-b-sm",
      bottom: "absolute bottom-0 left-0 right-0 h-1 rounded-t-sm",
    }[barPosition];

    return (
      <span
        className={cn(
          positionClasses,
          classes.dot,
          classes.glow,
          hoverOnly && "opacity-0",
          hoverOnly && "group-hover:opacity-100",
          "transition-all duration-500",
          className
        )}
      />
    );
  }

  // Ring - anneau léger pour focus/hover
  if (element === "ring") {
    return (
      <span
        className={cn(
          "absolute inset-0 rounded-inherit ring-1",
          classes.ring,
          "ring-opacity-0",
          !hoverOnly && "focus-within:ring-opacity-100",
          "group-hover:ring-opacity-100",
          "transition-all duration-300",
          className
        )}
      />
    );
  }

  // Gradient - gradient multi-stop riche (10-15% opacité max pour profondeur)
  if (element === "gradient") {
    return (
      <span
        className={cn(
          "absolute inset-0 opacity-[0.12]",
          "bg-gradient-to-br",
          classes.gradient,
          hoverOnly && "opacity-0",
          hoverOnly && "group-hover:opacity-[0.15]",
          "transition-opacity duration-500",
          className
        )}
      />
    );
  }

  // Glow - Halo de lumière diffus
  if (element === "glow") {
    return (
      <span
        className={cn(
          "absolute inset-0 pointer-events-none opacity-40",
          classes.glow,
          hoverOnly && "opacity-0",
          hoverOnly && "group-hover:opacity-60",
          "transition-opacity duration-700",
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
  accentType?: "bar" | "ring" | "dot" | "gradient" | "glow" | "none";
  /** Position de la barre si accentType='bar' */
  barPosition?: "left" | "right" | "top" | "bottom";
}

export function CmmBlockCard({
  blockId,
  children,
  className,
  accentType = "bar",
  barPosition = "left",
}: CmmBlockCardProps) {
  const accent = getBlockClasses(blockId);
  // Source de vérité : getBlockAccent() lit BLOCK_ACCENT_MAP
  const accentKey = getBlockAccent(blockId);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[2rem] border p-6 transition-all duration-500",
        accent.surface,
        accent.border,
        "hover:border-white/20",
        accent.shadow,
        className
      )}
    >
      {/* Accent visuel selon le type */}
      {accentType === "bar" && (
        <CmmBlockAccent accent={accentKey} element="bar" barPosition={barPosition} />
      )}
      {accentType === "dot" && (
        <div className="absolute right-6 top-6">
          <CmmBlockAccent accent={accentKey} element="dot" />
        </div>
      )}
      {accentType === "ring" && (
        <CmmBlockAccent accent={accentKey} element="ring" />
      )}
      {accentType === "gradient" && (
        <CmmBlockAccent accent={accentKey} element="gradient" />
      )}
      {accentType === "glow" && (
        <CmmBlockAccent accent={accentKey} element="glow" hoverOnly />
      )}

      {/* Contenu avec léger z-index pour rester au-dessus des glows */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
