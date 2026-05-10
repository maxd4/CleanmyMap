"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export type RubriqueTheme = "fuchsia" | "amber" | "emerald" | "sky" | "rose" | "indigo" | "violet" | "purple" | "blue" | "slate";

export interface RubriqueCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  themeColor?: RubriqueTheme;
  watermarkIcon?: LucideIcon;
  children: ReactNode;
  className?: string;
  withHover?: boolean;
  withTopBar?: boolean;
  watermarkSize?: number;
}

const themeClasses: Record<RubriqueTheme, string> = {
  fuchsia: "bg-fuchsia-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  rose: "bg-rose-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  blue: "bg-blue-500",
  slate: "bg-slate-500",
};

const watermarkClasses: Record<RubriqueTheme, string> = {
  fuchsia: "text-fuchsia-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  sky: "text-sky-400",
  rose: "text-rose-400",
  indigo: "text-indigo-400",
  violet: "text-violet-400",
  purple: "text-purple-400",
  blue: "text-blue-400",
  slate: "text-slate-400",
};

const topBarClasses: Record<RubriqueTheme, string> = {
  fuchsia: "bg-fuchsia-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  rose: "bg-rose-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  blue: "bg-blue-500",
  slate: "bg-slate-500",
};

/**
 * Composant standard pour les grands blocs thématiques (Dashboard, Connect, etc.)
 * Assure une cohérence visuelle sur toute l'application.
 */
export function RubriqueCard({ 
  themeColor = "fuchsia", 
  watermarkIcon: WatermarkIcon, 
  children, 
  className,
  withHover = true,
  withTopBar = true,
  watermarkSize = 120,
  ...props
}: RubriqueCardProps) {
  return (
    <motion.div 
      layout
      className={cn(
        "rounded-[2.5rem] border border-white/10 bg-black/30 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden group",
        withHover && "transition-colors hover:bg-black/40",
        className
      )}
      {...props}
    >
      {/* Barre d'accentuation dynamique */}
      {withTopBar && (
        <div className={cn("absolute inset-x-0 top-0 h-[3px] z-10", themeClasses[themeColor])} />
      )}
      
      {/* Icône en filigrane */}
      {WatermarkIcon && (
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
          <WatermarkIcon size={watermarkSize} className={watermarkClasses[themeColor]} />
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
  const iconContainerClasses: Record<RubriqueTheme, string> = {
    fuchsia: "text-fuchsia-300 bg-fuchsia-400/20 border-fuchsia-400/30",
    amber: "text-amber-300 bg-amber-400/20 border-amber-400/30",
    emerald: "text-emerald-300 bg-emerald-400/20 border-emerald-400/30",
    sky: "text-sky-300 bg-sky-400/20 border-sky-400/30",
    rose: "text-rose-300 bg-rose-400/20 border-rose-400/30",
    indigo: "text-indigo-300 bg-indigo-400/20 border-indigo-400/30",
    violet: "text-violet-300 bg-violet-400/20 border-violet-400/30",
    purple: "text-purple-300 bg-purple-400/20 border-purple-400/30",
  };

  return (
    <div className={cn(
      "flex items-center justify-center rounded-xl border p-4 shadow-2xl group-hover:scale-110 transition-transform duration-500",
      iconContainerClasses[themeColor],
      className
    )}>
      <Icon size={size} />
    </div>
  );
}
