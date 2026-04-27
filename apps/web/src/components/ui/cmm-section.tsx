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
 * Simplifie la création de sections cohérentes avec l'accent approprié
 * selon le bloc (home=slate, act=amber, visualize=sky, etc.)
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
 /** Espacement entre les sections */
 spacing?:"sm" |"md" |"lg";
}

export function CmmSectionGroup({
 children,
 className,
 spacing ="md",
}: CmmSectionGroupProps) {
 const spacingClasses = {
 sm:"space-y-4",
 md:"space-y-6",
 lg:"space-y-8",
 }[spacing];

 return (
 <div className={cn(spacingClasses, className)}>
 {children}
 </div>
 );
}

/**
 * CmmPageLayout - Layout de page avec sections
 */
export interface CmmPageLayoutProps {
 children: ReactNode;
 className?: string;
 /** Largeur maximale */
 maxWidth?:"sm" |"md" |"lg" |"xl" |"2xl" |"full";
 /** Padding */
 padding?:"sm" |"md" |"lg";
}

export function CmmPageLayout({
 children,
 className,
 maxWidth ="2xl",
 padding ="md",
}: CmmPageLayoutProps) {
 const maxWidthClasses = {
 sm:"max-w-sm",
 md:"max-w-md",
 lg:"max-w-lg",
 xl:"max-w-xl",
"2xl":"max-w-2xl",
 full:"max-w-full",
 }[maxWidth];

 const paddingClasses = {
 sm:"p-4",
 md:"p-6",
 lg:"p-8",
 }[padding];

 return (
 <div className={cn("mx-auto", maxWidthClasses, paddingClasses, className)}>
 {children}
 </div>
 );
}