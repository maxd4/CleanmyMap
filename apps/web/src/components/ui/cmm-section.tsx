"use client";

import type { ReactNode } from"react";
import { cn } from"@/lib/utils";
import { CmmBlockCard, type AccentElement } from"./cmm-block-accent";
import type { BlockId } from"@/lib/ui/block-accents";

export interface CmmSectionProps {
 /** ID du bloc pour déterminer l'accent automatiquement */
 blockId: BlockId;
 /** Titre de la section */
 title: string;
 /** Contenu de la section */
 children: ReactNode;
 /** Type d'accent visuel */
 accentType?: AccentElement |"none";
 /** Position de la barre si accentType='bar' */
 barPosition?:"left" |"right" |"top" |"bottom";
 /** Classes additionnelles */
 className?: string;
 /** Taille du titre */
 titleSize?:"h1" |"h2" |"h3" |"h4";
 /** Description optionnelle sous le titre */
 description?: string;
}

/**
 * CmmSection - Section de page avec accent automatique par bloc
 *
 * Charte officielle:
 * - home=amber, act=emerald, visualize=sky
 * - impact=red, network=indigo, connect=discussion/pink
 * - learn=yellow, pilot=amber (shade foncé)
 *
 * Usage:
 * <CmmSection blockId="impact" title="Impact environnemental">
 * <p>Contenu de la section...</p>
 * </CmmSection>
 */
export function CmmSection({
 blockId,
 title,
 children,
 accentType ="bar",
 barPosition ="left",
 className,
 titleSize ="h2",
 description,
}: CmmSectionProps) {
 const titleClasses = {
 h1:"cmm-text-h1",
 h2:"cmm-text-h2", 
 h3:"cmm-text-h3",
 h4:"cmm-text-h4",
 }[titleSize];

 const TitleTag = titleSize;

 if (accentType ==="none") {
 return (
 <section className={cn("rounded-2xl border p-5 shadow-sm", className)}>
 <TitleTag className={cn(titleClasses,"mb-4")}>
 {title}
 </TitleTag>
 {description && (
 <p className="cmm-text-secondary mb-4 cmm-text-small">
 {description}
 </p>
 )}
 {children}
 </section>
 );
 }

 return (
 <CmmBlockCard
 blockId={blockId}
 accentType={accentType}
 barPosition={barPosition}
 className={className}
 >
 <TitleTag className={cn(titleClasses,"mb-4")}>
 {title}
 </TitleTag>
 {description && (
 <p className="cmm-text-secondary mb-4 cmm-text-small">
 {description}
 </p>
 )}
 {children}
 </CmmBlockCard>
 );
}

/**
 * CmmSectionGroup - Groupe de sections avec espacement cohérent
 */
export interface CmmSectionGroupProps {
 children: ReactNode;
 className?: string;
}

export function CmmSectionGroup({
 children,
 className,
}: CmmSectionGroupProps) {
 return (
 <div className={cn("cmm-section-group", className)}>
 {children}
 </div>
 );
}

/**
 * CmmPageLayout - Shell canonique du contenu de page.
 *
 * La largeur, les gutters, le padding vertical et le rythme principal sont
 * définis dans globals.css. Les pages ne choisissent pas de variante locale.
 */
export interface CmmPageLayoutProps {
 children: ReactNode;
 className?: string;
}

export function CmmPageLayout({
 children,
 className,
}: CmmPageLayoutProps) {
 return (
 <div className={cn("cmm-page-layout", className)}>
 {children}
 </div>
 );
}
