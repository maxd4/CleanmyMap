"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export type RubriqueTheme = "fuchsia" | "amber" | "emerald" | "sky" | "rose" | "indigo" | "violet" | "purple" | "blue" | "slate";

export interface RubriqueCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  themeColor?: RubriqueTheme;
  surfaceKind?: "themed" | "neutral";
  watermarkIcon?: LucideIcon;
  topBarContent?: ReactNode;
  children: ReactNode;
  className?: string;
  withHover?: boolean;
  withTopBar?: boolean;
  watermarkSize?: number;
}

/**
 * Composant standard pour les grands blocs thématiques (Dashboard, Connect, etc.)
 * Assure une cohérence visuelle sur toute l'application.
 */
export function RubriqueCard({ 
  themeColor = "fuchsia",
  surfaceKind = "themed",
  watermarkIcon: WatermarkIcon, 
  topBarContent,
  children, 
  className,
  withHover = true,
  withTopBar = true,
  watermarkSize = 120,
  ...props
}: RubriqueCardProps) {
  return (
    <motion.div
      data-rubrique-theme={themeColor}
      data-cmm-surface-kind={surfaceKind}
      className={cn(
        "cmm-rubrique-card group",
        withHover && "cmm-rubrique-card--interactive",
        className,
      )}
      {...props}
    >
      {/* Barre d'accentuation dynamique */}
      {withTopBar && (
        <div className="absolute inset-x-0 top-0 z-10 px-8 pt-6">
          <div className="flex items-center gap-4">
            <div className="cmm-rubrique-card__topbar" />
            {topBarContent && (
              <div className="cmm-rubrique-card__topbar-badge">
                {topBarContent}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Icône en filigrane */}
      {WatermarkIcon && (
        <div className="cmm-rubrique-card__watermark">
          <WatermarkIcon size={watermarkSize} aria-hidden="true" />
        </div>
      )}
      
      {/* Contenu de la carte */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}

/**
 * Sous-composant optionnel pour une icône de mise en avant avec effet glassmorphism
 */
export function RubriqueCardIcon({ 
  icon: Icon, 
  themeColor = "fuchsia",
  className,
  size = 24
}: { 
  icon: LucideIcon, 
  themeColor?: RubriqueTheme,
  className?: string,
  size?: number
}) {
  return (
    <div
      data-rubrique-theme={themeColor}
      className={cn("cmm-rubrique-card-icon", className)}
    >
      <Icon size={size} />
    </div>
  );
}
