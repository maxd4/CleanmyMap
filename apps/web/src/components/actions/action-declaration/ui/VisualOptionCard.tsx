"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface VisualOptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  description?: string;
  color?: "emerald" | "blue" | "violet" | "amber";
}

export function VisualOptionCard({
  selected,
  onClick,
  icon: Icon,
  label,
  description,
  color = "emerald"
}: VisualOptionCardProps) {
  const colorStyles = {
    emerald: selected ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 hover:border-emerald-200 text-slate-400",
    blue: selected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 hover:border-blue-200 text-slate-400",
    violet: selected ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-100 hover:border-violet-200 text-slate-400",
    amber: selected ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-100 hover:border-amber-200 text-slate-400",
  };

  const iconStyles = {
    emerald: selected ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-50 text-slate-400",
    blue: selected ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-slate-50 text-slate-400",
    violet: selected ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20" : "bg-slate-50 text-slate-400",
    amber: selected ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-slate-50 text-slate-400",
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-4 p-6 rounded-[2rem] border-2 transition-all duration-300 text-center w-full",
        colorStyles[color]
      )}
    >
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500",
        iconStyles[color]
      )}>
        <Icon size={32} />
      </div>
      <div>
        <h4 className={cn(
          "text-sm font-black uppercase tracking-widest",
          selected ? "text-slate-900" : "text-slate-500"
        )}>
          {label}
        </h4>
        {description && (
          <p className="mt-1 text-xs font-medium text-slate-400 leading-tight">
            {description}
          </p>
        )}
      </div>

      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-md"
        >
          <div className="w-2 h-2 bg-white rounded-full" />
        </motion.div>
      )}
    </motion.button>
  );
}
