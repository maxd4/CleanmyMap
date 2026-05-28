"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export type RubriqueTheme = "fuchsia" | "amber" | "emerald" | "sky" | "rose" | "indigo" | "violet" | "purple" | "blue" | "slate";

export interface RubriqueCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  themeColor?: RubriqueTheme;
  watermarkIcon?: LucideIcon;
  topBarContent?: ReactNode;
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

const shellClasses: Record<RubriqueTheme, string> = {
  fuchsia:
    "border-fuchsia-200/18 bg-[linear-gradient(145deg,rgba(34,0,22,0.94)_0%,rgba(78,12,48,0.92)_58%,rgba(236,72,153,0.14)_100%)] shadow-[0_26px_80px_-38px_rgba(236,72,153,0.30)]",
  amber:
    "border-amber-200/18 bg-[linear-gradient(145deg,rgba(35,23,0,0.94)_0%,rgba(92,58,8,0.92)_58%,rgba(249,115,22,0.16)_100%)] shadow-[0_26px_80px_-38px_rgba(249,115,22,0.30)]",
  emerald:
    "border-emerald-200/18 bg-[linear-gradient(145deg,rgba(6,38,28,0.94)_0%,rgba(12,58,42,0.92)_58%,rgba(34,197,94,0.14)_100%)] shadow-[0_26px_80px_-38px_rgba(34,197,94,0.28)]",
  sky:
    "border-sky-200/18 bg-[linear-gradient(145deg,rgba(7,24,38,0.94)_0%,rgba(12,40,62,0.92)_58%,rgba(14,165,233,0.14)_100%)] shadow-[0_26px_80px_-38px_rgba(14,165,233,0.28)]",
  rose:
    "border-rose-200/18 bg-[linear-gradient(145deg,rgba(42,0,14,0.94)_0%,rgba(82,10,28,0.92)_58%,rgba(244,63,94,0.14)_100%)] shadow-[0_26px_80px_-38px_rgba(244,63,94,0.28)]",
  indigo:
    "border-indigo-200/18 bg-[linear-gradient(145deg,rgba(15,8,40,0.94)_0%,rgba(30,20,70,0.92)_58%,rgba(99,102,241,0.14)_100%)] shadow-[0_26px_80px_-38px_rgba(99,102,241,0.28)]",
  violet:
    "border-violet-200/18 bg-[linear-gradient(145deg,rgba(29,10,55,0.94)_0%,rgba(63,27,119,0.92)_58%,rgba(139,92,246,0.14)_100%)] shadow-[0_26px_80px_-38px_rgba(139,92,246,0.28)]",
  purple:
    "border-purple-200/18 bg-[linear-gradient(145deg,rgba(31,15,63,0.94)_0%,rgba(74,29,150,0.92)_58%,rgba(168,85,247,0.14)_100%)] shadow-[0_26px_80px_-38px_rgba(168,85,247,0.28)]",
  blue:
    "border-blue-200/18 bg-[linear-gradient(145deg,rgba(11,25,51,0.94)_0%,rgba(23,55,115,0.92)_58%,rgba(59,130,246,0.14)_100%)] shadow-[0_26px_80px_-38px_rgba(59,130,246,0.28)]",
  slate:
    "border-slate-200/18 bg-[linear-gradient(145deg,rgba(15,23,42,0.94)_0%,rgba(30,41,59,0.92)_58%,rgba(100,116,139,0.14)_100%)] shadow-[0_26px_80px_-38px_rgba(71,85,105,0.28)]",
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
      layout
      className={cn(
        "relative overflow-hidden rounded-[2.5rem] border backdrop-blur-3xl p-8 text-white shadow-2xl group",
        shellClasses[themeColor],
        withHover && "transition-all duration-300 hover:-translate-y-0.5 hover:border-white/22",
        className
      )}
      {...props}
    >
      {/* Barre d'accentuation dynamique */}
      {withTopBar && (
        <div className="absolute inset-x-0 top-0 z-10 px-8 pt-6">
          <div className="flex items-center gap-4">
            <div className={cn("h-[3px] flex-1 rounded-full", themeClasses[themeColor])} />
            {topBarContent && (
              <div className="rounded-full border border-white/12 bg-white/8 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/80 backdrop-blur-xl">
                {topBarContent}
              </div>
            )}
          </div>
        </div>
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
    fuchsia: "text-fuchsia-200 bg-fuchsia-500/18 border-fuchsia-300/30",
    amber: "text-amber-200 bg-amber-500/18 border-amber-300/30",
    emerald: "text-emerald-200 bg-emerald-500/18 border-emerald-300/30",
    sky: "text-sky-200 bg-sky-500/18 border-sky-300/30",
    rose: "text-rose-200 bg-rose-500/18 border-rose-300/30",
    indigo: "text-indigo-200 bg-indigo-500/18 border-indigo-300/30",
    violet: "text-violet-200 bg-violet-500/18 border-violet-300/30",
    purple: "text-purple-200 bg-purple-500/18 border-purple-300/30",
    blue: "text-blue-200 bg-blue-500/18 border-blue-300/30",
    slate: "text-slate-200 bg-slate-500/18 border-slate-300/30",
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
